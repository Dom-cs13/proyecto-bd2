import { pacienteDesdeFila, historialDesdeFila, consultaDesdeFila } from "./mapper.js";

import { diagnosticoDesdeFila, tratamientoDesdeFila, recetaDesdeFila, medicamentoDesdeFila, servicioDesdeFila } from './mapper.js';
import { MotorNoDisponible } from '../../../domain/errores.js';
import { Conflicto, NoEncontrado } from '../../../domain/errores.js';
import { identificadorDental, profesionalDesdeFila, citaDesdeFila, responsableDesdeFila, alergiaDesdeFila } from './mapper.js';

export class PostgresAdapter {
  constructor(pool) {
    const ejecutar = async (operacion) => {
      try { return await operacion(); } catch (error) {
        if (/^(08|53|57)/.test(error.code ?? '') ||
            ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', 'EAI_AGAIN',
              'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
              'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(error.code) ||
            /connection.*(timeout|terminated)|timeout.*connect/i.test(error.message ?? '')) {
          throw new MotorNoDisponible('odontologia');
        }
        throw error;
      }
    };
    this.pool = {
      query: (...args) => ejecutar(() => pool.query(...args)),
      connect: async () => {
        let cliente;
        try { cliente = await pool.connect(); }
        catch { throw new MotorNoDisponible('odontologia'); }
        return { query: (...args) => ejecutar(() => cliente.query(...args)), release: () => cliente.release() };
      },
    };
  }

  async transaccionDental(operacion) {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await operacion(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      try { await cliente.query('ROLLBACK'); } catch { /* Conservar error original. */ }
      throw error;
    } finally { cliente.release(); }
  }

  async bloquearPaciente(cliente, id) {
    // RLS oculta filas archivadas a SELECT FOR UPDATE por su política de UPDATE.
    // La lectura previa distingue inexistencia de archivo; el bloqueo vuelve a comprobar.
    const previo = await cliente.query('SELECT estado FROM public.historial_clinico WHERE id_paciente=$1', [id]);
    if (!previo.rows.length) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
    if (previo.rows[0].estado !== 'activo') throw new Conflicto('PACIENTE_ARCHIVADO');
    const { rows } = await cliente.query('SELECT estado FROM public.historial_clinico WHERE id_paciente=$1 FOR UPDATE', [id]);
    if (!rows.length || rows[0].estado !== 'activo') throw new Conflicto('PACIENTE_ARCHIVADO');
  }

  async obtenerEquipo() {
    const { rows } = await this.pool.query(`SELECT u.id_usuario, u.nombres, u.apellidos FROM public.usuario u
      JOIN public.rol r USING(id_rol) WHERE u.estado=true AND lower(r.nombre)='odontologo' ORDER BY u.nombres`);
    return { items: rows.map(profesionalDesdeFila) };
  }

  actualizarContacto(id, datos) {
    return this.transaccionDental(async (c) => {
      await this.bloquearPaciente(c, id);
      const { rows } = await c.query(`UPDATE public.paciente SET telefono=COALESCE($2,telefono),
        correo=COALESCE($3,correo),direccion=COALESCE($4,direccion) WHERE id_paciente=$1 RETURNING *`,
      [id, datos.telefono ?? null, datos.correo ?? null, datos.direccion ?? null]);
      return pacienteDesdeFila(rows[0]);
    });
  }

  async obtenerAgenda(fecha, usuarioId) {
    const { rows } = await this.pool.query(`SELECT c.*, p.nombres, p.apellidos FROM public.cita c
      JOIN public.paciente p USING(id_paciente) WHERE c.fecha=$1 AND ($2::integer IS NULL OR c.id_usuario=$2)
      ORDER BY c.hora, c.id_cita LIMIT 500`, [fecha, usuarioId ?? null]);
    return { items: rows.map(citaDesdeFila) };
  }

  crearCita(datos) {
    return this.transaccionDental(async (c) => {
      await this.bloquearPaciente(c, datos.pacienteId);
      const equipo = await c.query(`SELECT u.id_usuario FROM public.usuario u JOIN public.rol r USING(id_rol)
        WHERE u.id_usuario=$1 AND u.estado=true AND lower(r.nombre)='odontologo'`, [datos.usuarioId]);
      if (!equipo.rows.length) throw new NoEncontrado('ODONTOLOGO_NO_ENCONTRADO');
      const { rows } = await c.query(`INSERT INTO public.cita(id_paciente,id_usuario,fecha,hora,motivo)
        VALUES($1,$2,$3,$4,$5) RETURNING id_cita`, [datos.pacienteId, datos.usuarioId, datos.fecha, datos.hora, datos.motivo]);
      return identificadorDental(rows[0].id_cita);
    });
  }

  cambiarCita(id, datos) {
    return this.transaccionDental(async (c) => {
      const previa = await c.query('SELECT id_paciente FROM public.cita WHERE id_cita=$1', [id]);
      if (!previa.rows.length) throw new NoEncontrado('CITA_NO_ENCONTRADA');
      await this.bloquearPaciente(c, previa.rows[0].id_paciente);
      const { rows } = await c.query(`UPDATE public.cita SET fecha=$2,hora=$3,estado=$4
        WHERE id_cita=$1 AND estado IN ('programada','confirmada')
        AND NOT EXISTS(SELECT 1 FROM public.consulta WHERE id_cita=$1) RETURNING id_cita`,
      [id, datos.fecha, datos.hora, datos.estado]);
      if (!rows.length) throw new Conflicto('CITA_NO_DISPONIBLE');
      return identificadorDental(rows[0].id_cita);
    });
  }

  async obtenerResponsables(id) {
    if (!await this.obtenerPaciente(id)) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
    const { rows } = await this.pool.query(`SELECT r.*, pr.parentesco, pr.es_principal FROM public.responsable_legal r
      JOIN public.paciente_responsable pr USING(id_responsable) WHERE pr.id_paciente=$1 ORDER BY pr.es_principal DESC, r.id_responsable`, [id]);
    return { items: rows.map(responsableDesdeFila) };
  }

  guardarResponsable(id, datos) {
    return this.transaccionDental(async (c) => {
      await this.bloquearPaciente(c, id);
      return this.insertarResponsable(c, id, datos);
    });
  }

  async insertarResponsable(c, id, datos) {
      const { rows } = await c.query(`INSERT INTO public.responsable_legal(nombres,apellidos,dpi,telefono)
        VALUES($1,$2,$3,$4) RETURNING id_responsable`, [datos.nombres, datos.apellidos, datos.dpi ?? null, datos.telefono ?? null]);
      if (datos.esPrincipal) await c.query('UPDATE public.paciente_responsable SET es_principal=false WHERE id_paciente=$1', [id]);
      await c.query(`INSERT INTO public.paciente_responsable(id_paciente,id_responsable,parentesco,es_principal)
        VALUES($1,$2,$3,$4)`, [id, rows[0].id_responsable, datos.parentesco, datos.esPrincipal]);
      return identificadorDental(rows[0].id_responsable);
  }

  async obtenerAlergias(id) {
    if (!await this.obtenerPaciente(id)) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
    const asignadas = await this.pool.query(`SELECT a.id_alergia, a.nombre, pa.nivel_severidad, pa.reaccion, pa.observaciones
      FROM public.paciente_alergia pa JOIN public.alergia a USING(id_alergia) WHERE pa.id_paciente=$1 ORDER BY a.nombre`, [id]);
    const catalogo = await this.pool.query('SELECT id_alergia,nombre FROM public.alergia WHERE estado=true ORDER BY nombre');
    return { items: asignadas.rows.map(alergiaDesdeFila),
    catalogo: catalogo.rows.map((r) => ({ id: String(r.id_alergia), nombre: r.nombre })) };
  }

  guardarAlergia(id, datos) {
    return this.transaccionDental(async (c) => {
      await this.bloquearPaciente(c, id);
      const { rows } = await c.query(`INSERT INTO public.paciente_alergia(id_paciente,id_alergia,nivel_severidad,reaccion,observaciones,fecha_registro)
        SELECT $1,id_alergia,$3,$4,$5,CURRENT_DATE FROM public.alergia WHERE id_alergia=$2 AND estado=true
        ON CONFLICT(id_paciente,id_alergia) DO UPDATE SET nivel_severidad=EXCLUDED.nivel_severidad,
        reaccion=EXCLUDED.reaccion,observaciones=EXCLUDED.observaciones RETURNING id_alergia`,
      [id, datos.alergiaId, datos.nivelSeveridad, datos.reaccion, datos.observaciones ?? null]);
      if (!rows.length) throw new NoEncontrado('ALERGIA_NO_ENCONTRADA');
      return identificadorDental(rows[0].id_alergia);
    });
  }

  finalizarConsulta(id, usuarioId) {
    return this.transaccionDental(async (c) => {
      const previa = await c.query('SELECT id_paciente FROM public.consulta WHERE id_consulta=$1 AND id_usuario=$2', [id, usuarioId]);
      if (!previa.rows.length) throw new NoEncontrado('CONSULTA_NO_ENCONTRADA');
      await this.bloquearPaciente(c, previa.rows[0].id_paciente);
      const { rows } = await c.query(`UPDATE public.consulta SET estado='finalizada',fecha_finalizacion=now(),fecha_actualizacion=now()
        WHERE id_consulta=$1 AND id_usuario=$2 AND estado='borrador' RETURNING *`, [id, usuarioId]);
      if (!rows.length) throw new Conflicto('CONSULTA_NO_DISPONIBLE');
      if (rows[0].id_cita) await c.query("UPDATE public.cita SET estado='completada' WHERE id_cita=$1", [rows[0].id_cita]);
      return consultaDesdeFila(rows[0]);
    });
  }

  async crearPaciente(datos) {
    const cliente = await this.pool.connect();

    try {
      await cliente.query("BEGIN");

      const resultado = await cliente.query(
        `INSERT INTO public.paciente
          (nombres, apellidos, fecha_nacimiento, sexo, telefono, correo, direccion${datos.documentoIdentidad ? ', documento_identidad' : ''})
         VALUES ($1, $2, $3, $4, $5, $6, $7${datos.documentoIdentidad ? ', $8' : ''})
         RETURNING *`,
        [
          datos.nombres ?? datos.nombre,
          datos.apellidos,
          datos.fechaNacimiento,
          datos.sexo ?? datos.genero ?? null,
          datos.telefono ?? null,
          datos.correo ?? null,
          datos.direccion ?? null,
          ...(datos.documentoIdentidad ? [datos.documentoIdentidad] : []),
        ]
      );

      const paciente = resultado.rows[0];

      await cliente.query(
        "INSERT INTO public.historial_clinico (id_paciente) VALUES ($1)",
        [paciente.id_paciente]
      );

      if (datos.detallesInstitucion?.responsableLegal) {
        await this.insertarResponsable(cliente, paciente.id_paciente, datos.detallesInstitucion.responsableLegal);
      }

      await cliente.query("COMMIT");
      return pacienteDesdeFila(paciente);
    } catch (error) {
      try { await cliente.query("ROLLBACK"); } catch { /* Conservar el error original. */ }
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
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const historial = await this.leerHistorial(cliente, pacienteId);
      await cliente.query('COMMIT');
      return historial;
    } catch (error) {
      try { await cliente.query('ROLLBACK'); } catch { /* Conservar el error original. */ }
      throw error;
    } finally {
      cliente.release();
    }
  }

  async leerHistorial(cliente, pacienteId) {
    const resultado = await cliente.query(
      `SELECT *
       FROM public.historial_clinico
       WHERE id_paciente = $1`,
      [pacienteId]
    );

    if (resultado.rows.length === 0) {
      return null;
    }

    const paciente = await cliente.query('SELECT * FROM public.paciente WHERE id_paciente = $1', [pacienteId]);

    const consultas = await cliente.query(
      `SELECT *
       FROM public.consulta
       WHERE id_paciente = $1
       ORDER BY fecha DESC, id_consulta DESC`,
      [pacienteId]
    );

    return {
      paciente: pacienteDesdeFila(paciente.rows[0]),
      historial: historialDesdeFila(resultado.rows[0]),
      consultas: await this.consolidarConsultas(consultas.rows, cliente),
    };
  }

  async archivarHistorial(pacienteId, motivo) {
    const cliente = await this.pool.connect();

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

      // Leer antes del COMMIT: un fallo al consolidar revierte el archivo.
      const historialArchivado = await this.leerHistorial(cliente, pacienteId);
      await cliente.query("COMMIT");
      return historialArchivado;
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
      const servicios = await this.guardarServicios(cliente, consulta.id, datos.detallesInstitucion?.servicios);
      if (servicios.length) consulta.detallesInstitucion.servicios = servicios;
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
         FOR UPDATE OF h`,
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
         FOR UPDATE OF h`,
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
      return tratamientoDesdeFila(fila);
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
         FOR UPDATE OF h`,
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
      return diagnosticoDesdeFila(fila);
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

      if (datos.citaId) {
        const cita = await cliente.query(`SELECT id_cita FROM public.cita WHERE id_cita=$1
          AND id_paciente=$2 AND id_usuario=$3 AND estado IN ('programada','confirmada') FOR UPDATE`,
        [datos.citaId, datos.pacienteId, datos.usuarioId]);
        if (!cita.rows.length) throw new Conflicto('CITA_NO_DISPONIBLE');
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

      const servicios = await this.guardarServicios(cliente, resultado.rows[0].id_consulta, datos.detallesInstitucion?.servicios);
      await cliente.query("COMMIT");
      const consulta = consultaDesdeFila(resultado.rows[0]);
      if (servicios.length) consulta.detallesInstitucion.servicios = servicios;
      return consulta;
    } catch (error) {
      try { await cliente.query("ROLLBACK"); } catch { /* Conservar el error original. */ }
      throw error;
    } finally {
      cliente.release();
    }
  }

  async guardarServicios(cliente, consultaId, datos = []) {
    const servicios = [];
    for (const servicio of datos) {
      const registro = await cliente.query(`INSERT INTO public.consulta_servicio
        (id_consulta, id_servicio, pieza_dental, superficie, precio_aplicado, observaciones)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [consultaId, servicio.servicioId, servicio.piezaDental ?? null,
        servicio.superficie ?? null, servicio.precioAplicado ?? null, servicio.observaciones ?? null]);
      servicios.push(servicioDesdeFila(registro.rows[0]));
    }
    return servicios;
  }

  async consolidarConsultas(filas, cliente = this.pool) {
    const consultas = filas.map(consultaDesdeFila);
    if (!consultas.length) return consultas;
    const ids = consultas.map((consulta) => consulta.id);
    const diagnosticos = await cliente.query('SELECT * FROM public.diagnostico WHERE id_consulta = ANY($1::integer[]) ORDER BY id_diagnostico', [ids]);
    const tratamientos = await cliente.query(`SELECT t.* FROM public.tratamiento t
      JOIN public.diagnostico d USING (id_diagnostico) WHERE d.id_consulta = ANY($1::integer[]) ORDER BY t.id_tratamiento`, [ids]);
    const recetas = await cliente.query('SELECT * FROM public.receta WHERE id_consulta = ANY($1::integer[]) ORDER BY id_receta', [ids]);
    const medicamentos = await cliente.query(`SELECT dr.*, m.nombre FROM public.detalle_receta dr
      JOIN public.receta r USING (id_receta) JOIN public.medicamento m USING (id_medicamento)
      WHERE r.id_consulta = ANY($1::integer[]) ORDER BY dr.id_detalle_receta`, [ids]);
    const servicios = await cliente.query(`SELECT cs.*, s.nombre FROM public.consulta_servicio cs
      JOIN public.servicio_odontologico s USING (id_servicio)
      WHERE cs.id_consulta = ANY($1::integer[]) ORDER BY cs.id_consulta_servicio`, [ids]);
    for (const consulta of consultas) {
      consulta.diagnosticos = diagnosticos.rows.filter((d) => String(d.id_consulta) === consulta.id).map((d) => ({
        ...diagnosticoDesdeFila(d), tratamientos: tratamientos.rows
          .filter((t) => String(t.id_diagnostico) === String(d.id_diagnostico)).map(tratamientoDesdeFila),
      }));
      consulta.recetas = recetas.rows.filter((r) => String(r.id_consulta) === consulta.id).map((r) => ({
        ...recetaDesdeFila(r), medicamentos: medicamentos.rows
          .filter((m) => String(m.id_receta) === String(r.id_receta)).map(medicamentoDesdeFila),
      }));
      consulta.detallesInstitucion.servicios = servicios.rows
        .filter((s) => String(s.id_consulta) === consulta.id).map(servicioDesdeFila);
    }
    return consultas;
  }

  agregarDiagnostico(consultaId, datos) { return this.crearDiagnostico({ ...datos, consultaId }); }
  registrarTratamiento(diagnosticoId, datos) { return this.crearTratamiento({ ...datos, diagnosticoId }); }
  recetarMedicamento(consultaId, datos) { return this.crearReceta({ ...datos, consultaId }); }

  async ping() {
    const inicio = performance.now();
    await this.pool.query('SELECT 1');
    return { ok: true, motor: 'postgresql', latenciaMs: Math.round(performance.now() - inicio) };
  }

  async obtenerCatalogos() {
    const medicamentos = await this.pool.query('SELECT id_medicamento, nombre, presentacion FROM public.medicamento WHERE estado = true ORDER BY nombre');
    const servicios = await this.pool.query('SELECT id_servicio, nombre, precio_base FROM public.servicio_odontologico WHERE estado = true ORDER BY nombre');
    return {
      medicamentos: medicamentos.rows.map((m) => ({ id: String(m.id_medicamento), nombre: m.nombre, presentacion: m.presentacion })),
      servicios: servicios.rows.map((s) => ({ id: String(s.id_servicio), nombre: s.nombre, precioBase: s.precio_base == null ? null : Number(s.precio_base) })),
    };
  }

  async listarPacientes(filtro = {}) {
    const texto = filtro.texto?.trim() ?? "";
    const pagina = Math.max(1, Number(filtro.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(filtro.limite) || 10));
    const offset = (pagina - 1) * limite;

    const parametros = [texto];
    const condicionEstado = filtro.estado ? (parametros.push(filtro.estado),
      ` AND EXISTS (SELECT 1 FROM public.historial_clinico h
        WHERE h.id_paciente = paciente.id_paciente AND h.estado = $2)`) : '';
    const condicionDocumento = filtro.documento ? (parametros.push(filtro.documento),
      ` AND documento_identidad = $${parametros.length}`) : '';
    const condicion = `
      WHERE ($1 = ''
        OR nombres ILIKE '%' || $1 || '%'
        OR apellidos ILIKE '%' || $1 || '%')
    ${condicionEstado}${condicionDocumento}`;

    const totalResultado = await this.pool.query(
      `SELECT COUNT(*)::integer AS total FROM public.paciente ${condicion}`,
      parametros
    );

    const resultado = await this.pool.query(
      `SELECT * FROM public.paciente ${condicion}
       ORDER BY apellidos, nombres, id_paciente
       LIMIT $${parametros.length + 1} OFFSET $${parametros.length + 2}`,
      [...parametros, limite, offset]
    );

    return {
      items: resultado.rows.map(pacienteDesdeFila),
      total: totalResultado.rows[0].total,
    };
  }
}
