import { pacienteDesdeFila, historialDesdeFila, consultaDesdeFila } from "./mapper.js";

export class PostgresAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async crearPaciente(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const resultado = await cliente.query(
        `INSERT INTO public.paciente
          (nombres, apellidos, fecha_nacimiento, sexo, telefono, correo, direccion)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          datos.nombres,
          datos.apellidos,
          datos.fechaNacimiento,
          datos.sexo ?? null,
          datos.telefono ?? null,
          datos.correo ?? null,
          datos.direccion ?? null,
        ]
      );

      const paciente = resultado.rows[0];

      await cliente.query(
        "INSERT INTO public.historial_clinico (id_paciente) VALUES ($1)",
        [paciente.id_paciente]
      );

      await cliente.query("COMMIT");
      return pacienteDesdeFila(paciente);
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }
  }

  async obtenerPaciente(id) {
    const resultado = await this.pool.query(
      "SELECT * FROM public.paciente WHERE id_paciente = $1",
      [id]
    );

    return pacienteDesdeFila(resultado.rows[0]);
  }

  async obtenerHistorial(pacienteId) {
    const resultado = await this.pool.query(
      `SELECT *
       FROM public.historial_clinico
       WHERE id_paciente = $1`,
      [pacienteId]
    );

    if (resultado.rows.length === 0) {
      return null;
    }

    const paciente = await this.obtenerPaciente(pacienteId);

    const consultas = await this.pool.query(
      `SELECT *
       FROM public.consulta
       WHERE id_paciente = $1
       ORDER BY fecha DESC, id_consulta DESC`,
      [pacienteId]
    );

    return {
      paciente,
      historial: historialDesdeFila(resultado.rows[0]),
      consultas: consultas.rows.map(consultaDesdeFila),
    };
  }

  async archivarHistorial(pacienteId, motivo) {
    const cliente = await this.pool.connect();
    let historialArchivado;

    try {
      await cliente.query("BEGIN");

      const resultado = await cliente.query(
        `UPDATE public.historial_clinico
         SET estado = 'archivado',
             fecha_archivo = NOW(),
             motivo_archivo_tipo = $2,
             motivo_archivo_detalle = $3
         WHERE id_paciente = $1
           AND estado = 'activo'
         RETURNING *`,
        [pacienteId, motivo.tipo, motivo.detalle]
      );

      if (resultado.rows.length === 0) {
        const error = new Error("Historial no encontrado o ya archivado");
        error.codigo = "HISTORIAL_NO_DISPONIBLE";
        throw error;
      }

      historialArchivado = resultado.rows[0];
      await cliente.query("COMMIT");
    } catch (error) {
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // Se conserva el error original.
      }
      throw error;
    } finally {
      cliente.release();
    }

    return {
      paciente: await this.obtenerPaciente(pacienteId),
      historial: historialDesdeFila(historialArchivado),
      consultas: [],
    };
  }

  async registrarAtencionCompleta(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const historial = await cliente.query(
        `SELECT estado FROM public.historial_clinico
         WHERE id_paciente = $1 FOR UPDATE`,
        [datos.pacienteId]
      );

      if (historial.rows[0]?.estado !== "activo") {
        const error = new Error("El paciente no tiene historial activo");
        error.codigo = "HISTORIAL_NO_ACTIVO";
        throw error;
      }

      const consultaResultado = await cliente.query(
        `INSERT INTO public.consulta
          (id_paciente, id_usuario, id_cita, id_poliza, motivo, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          datos.pacienteId,
          datos.usuarioId,
          datos.citaId ?? null,
          datos.detallesInstitucion?.polizaId ?? null,
          datos.motivo ?? null,
          datos.observaciones ?? null,
        ]
      );

      const consulta = consultaDesdeFila(consultaResultado.rows[0]);
      const diagnosticos = [];

      for (const diagnostico of datos.diagnosticos ?? []) {
        const resultado = await cliente.query(
          `INSERT INTO public.diagnostico
            (id_consulta, descripcion, observaciones)
           VALUES ($1, $2, $3) RETURNING *`,
          [consulta.id, diagnostico.descripcion, diagnostico.observaciones ?? null]
        );

        const fila = resultado.rows[0];
        const tratamientos = [];

        for (const tratamiento of diagnostico.tratamientos ?? []) {
          const guardado = await cliente.query(
            `INSERT INTO public.tratamiento
              (id_diagnostico, descripcion, fecha_inicio, fecha_fin, observaciones)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
              fila.id_diagnostico,
              tratamiento.descripcion,
              tratamiento.fechaInicio ?? null,
              tratamiento.fechaFin ?? null,
              tratamiento.observaciones ?? null,
            ]
          );

          tratamientos.push({
            id: String(guardado.rows[0].id_tratamiento),
            descripcion: guardado.rows[0].descripcion,
          });
        }

        diagnosticos.push({
          id: String(fila.id_diagnostico),
          descripcion: fila.descripcion,
          tratamientos,
        });
      }

      let receta = null;

      if (datos.receta) {
        if (!Array.isArray(datos.receta.medicamentos) ||
            datos.receta.medicamentos.length === 0) {
          throw new Error("La receta necesita medicamentos");
        }

        const resultado = await cliente.query(
          `INSERT INTO public.receta (id_consulta, indicaciones_generales)
           VALUES ($1, $2) RETURNING *`,
          [consulta.id, datos.receta.indicacionesGenerales ?? null]
        );

        const fila = resultado.rows[0];
        const medicamentos = [];

        for (const medicamento of datos.receta.medicamentos) {
          const detalle = await cliente.query(
            `INSERT INTO public.detalle_receta
              (id_receta, id_medicamento, dosis, frecuencia,
               duracion, cantidad, indicaciones)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
              fila.id_receta,
              medicamento.medicamentoId,
              medicamento.dosis,
              medicamento.frecuencia,
              medicamento.duracion ?? null,
              medicamento.cantidad ?? null,
              medicamento.indicaciones ?? null,
            ]
          );

          medicamentos.push({
            id: String(detalle.rows[0].id_detalle_receta),
            medicamentoId: String(detalle.rows[0].id_medicamento),
          });
        }

        receta = {
          id: String(fila.id_receta),
          medicamentos,
        };
      }

      await cliente.query("COMMIT");

      return { consulta, diagnosticos, receta };
    } catch (error) {
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // Conservar el error original.
      }
      throw error;
    } finally {
      cliente.release();
    }
  }

  async crearReceta(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const consulta = await cliente.query(
        `SELECT c.id_consulta
         FROM public.consulta c
         JOIN public.historial_clinico h ON h.id_paciente = c.id_paciente
         WHERE c.id_consulta = $1
           AND c.estado = 'borrador'
           AND h.estado = 'activo'
         FOR UPDATE OF c, h`,
        [datos.consultaId]
      );

      if (consulta.rows.length === 0) {
        const error = new Error("Consulta no disponible para receta");
        error.codigo = "CONSULTA_NO_DISPONIBLE";
        throw error;
      }

      if (!Array.isArray(datos.medicamentos) || datos.medicamentos.length === 0) {
        throw new Error("La receta necesita al menos un medicamento");
      }

      const resultado = await cliente.query(
        `INSERT INTO public.receta (id_consulta, indicaciones_generales)
         VALUES ($1, $2) RETURNING *`,
        [datos.consultaId, datos.indicacionesGenerales ?? null]
      );

      const receta = resultado.rows[0];
      const detalles = [];

      for (const medicamento of datos.medicamentos) {
        const detalle = await cliente.query(
          `INSERT INTO public.detalle_receta
            (id_receta, id_medicamento, dosis, frecuencia,
             duracion, cantidad, indicaciones)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            receta.id_receta,
            medicamento.medicamentoId,
            medicamento.dosis,
            medicamento.frecuencia,
            medicamento.duracion ?? null,
            medicamento.cantidad ?? null,
            medicamento.indicaciones ?? null,
          ]
        );

        const fila = detalle.rows[0];
        detalles.push({
          id: String(fila.id_detalle_receta),
          medicamentoId: String(fila.id_medicamento),
          dosis: fila.dosis,
          frecuencia: fila.frecuencia,
          duracion: fila.duracion,
          cantidad: fila.cantidad,
          indicaciones: fila.indicaciones,
        });
      }

      await cliente.query("COMMIT");

      return {
        id: String(receta.id_receta),
        consultaId: String(receta.id_consulta),
        fecha: receta.fecha instanceof Date
          ? receta.fecha.toISOString()
          : receta.fecha,
        indicacionesGenerales: receta.indicaciones_generales,
        medicamentos: detalles,
      };
    } catch (error) {
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // Conservar el error original.
      }
      throw error;
    } finally {
      cliente.release();
    }
  }

  async crearTratamiento(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const diagnostico = await cliente.query(
        `SELECT d.id_diagnostico
         FROM public.diagnostico d
         JOIN public.consulta c ON c.id_consulta = d.id_consulta
         JOIN public.historial_clinico h ON h.id_paciente = c.id_paciente
         WHERE d.id_diagnostico = $1
           AND c.estado = 'borrador'
           AND h.estado = 'activo'
         FOR UPDATE OF d, c, h`,
        [datos.diagnosticoId]
      );

      if (diagnostico.rows.length === 0) {
        const error = new Error("Diagnostico no disponible para tratamiento");
        error.codigo = "DIAGNOSTICO_NO_DISPONIBLE";
        throw error;
      }

      const resultado = await cliente.query(
        `INSERT INTO public.tratamiento
          (id_diagnostico, descripcion, fecha_inicio, fecha_fin, observaciones)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          datos.diagnosticoId,
          datos.descripcion,
          datos.fechaInicio ?? null,
          datos.fechaFin ?? null,
          datos.observaciones ?? null,
        ]
      );

      await cliente.query("COMMIT");

      const fila = resultado.rows[0];
      return {
        id: String(fila.id_tratamiento),
        diagnosticoId: String(fila.id_diagnostico),
        descripcion: fila.descripcion,
        fechaInicio: fila.fecha_inicio,
        fechaFin: fila.fecha_fin,
        estado: fila.estado,
        observaciones: fila.observaciones,
      };
    } catch (error) {
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // Conservar el error original.
      }
      throw error;
    } finally {
      cliente.release();
    }
  }

  async crearDiagnostico(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const consulta = await cliente.query(
        `SELECT c.id_consulta
         FROM public.consulta c
         JOIN public.historial_clinico h
           ON h.id_paciente = c.id_paciente
         WHERE c.id_consulta = $1
           AND h.estado = 'activo'
           AND c.estado = 'borrador'
         FOR UPDATE OF c, h`,
        [datos.consultaId]
      );

      if (consulta.rows.length === 0) {
        const error = new Error("Consulta no disponible para diagnostico");
        error.codigo = "CONSULTA_NO_DISPONIBLE";
        throw error;
      }

      const resultado = await cliente.query(
        `INSERT INTO public.diagnostico
          (id_consulta, descripcion, observaciones)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [
          datos.consultaId,
          datos.descripcion,
          datos.observaciones ?? null,
        ]
      );

      await cliente.query("COMMIT");

      const fila = resultado.rows[0];
      return {
        id: String(fila.id_diagnostico),
        consultaId: String(fila.id_consulta),
        descripcion: fila.descripcion,
        observaciones: fila.observaciones,
      };
    } catch (error) {
      try {
        await cliente.query("ROLLBACK");
      } catch {
        // Conservar el error original.
      }
      throw error;
    } finally {
      cliente.release();
    }
  }

  async crearConsulta(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const historial = await cliente.query(
        `SELECT estado
         FROM public.historial_clinico
         WHERE id_paciente = $1
         FOR UPDATE`,
        [datos.pacienteId]
      );

      if (historial.rows[0]?.estado !== "activo") {
        const error = new Error("El paciente no tiene un historial activo");
        error.codigo = "HISTORIAL_NO_ACTIVO";
        throw error;
      }

      const resultado = await cliente.query(
        `INSERT INTO public.consulta
          (id_paciente, id_usuario, id_cita, id_poliza, motivo, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          datos.pacienteId,
          datos.usuarioId,
          datos.citaId ?? null,
          datos.detallesInstitucion?.polizaId ?? null,
          datos.motivo ?? null,
          datos.observaciones ?? null,
        ]
      );

      await cliente.query("COMMIT");
      return consultaDesdeFila(resultado.rows[0]);
    } catch (error) {
      await cliente.query("ROLLBACK");
      throw error;
    } finally {
      cliente.release();
    }
  }

  async listarPacientes(filtro = {}) {
    const texto = filtro.texto?.trim() ?? "";
    const pagina = Math.max(1, Number(filtro.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(filtro.limite) || 10));
    const offset = (pagina - 1) * limite;

    const condicion = `
      WHERE ($1 = ''
        OR nombres ILIKE '%' || $1 || '%'
        OR apellidos ILIKE '%' || $1 || '%')
    `;

    const totalResultado = await this.pool.query(
      `SELECT COUNT(*)::integer AS total FROM public.paciente ${condicion}`,
      [texto]
    );

    const resultado = await this.pool.query(
      `SELECT * FROM public.paciente ${condicion}
       ORDER BY apellidos, nombres, id_paciente
       LIMIT $2 OFFSET $3`,
      [texto, limite, offset]
    );

    return {
      items: resultado.rows.map(pacienteDesdeFila),
      total: totalResultado.rows[0].total,
    };
  }
}
