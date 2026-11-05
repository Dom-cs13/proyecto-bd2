import { MotorNoDisponible } from "../../../domain/errores.js";
import {
  pacienteDesdeFila,
  historialDesdeFila,
  consultaDesdeFila,
  controlCrecimientoDesdeFila,
  vacunaAplicadaDesdeFila,
} from "./mapper.js";

export class MariaDbAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async _obtenerConexion() {
    try {
      if (typeof this.pool.getConnection === "function") {
        return await this.pool.getConnection();
      }
      if (typeof this.pool.connect === "function") {
        return await this.pool.connect();
      }
      throw new Error("El pool no proporciona un metodo de conexion valido");
    } catch (error) {
      if (error instanceof MotorNoDisponible) throw error;
      throw new MotorNoDisponible("pediatria", error.message);
    }
  }

  async crearPaciente(datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resultado = await conn.query(
        `INSERT INTO paciente
          (documento, nombres, apellidos, fecha_nacimiento, sexo, grupo_sanguineo, telefono, correo, direccion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datos.documento ?? null,
          datos.nombres,
          datos.apellidos,
          datos.fechaNacimiento,
          datos.sexo ?? null,
          datos.detallesInstitucion?.grupoSanguineo ?? null,
          datos.telefono ?? null,
          datos.correo ?? null,
          datos.direccion ?? null,
        ]
      );

      const pacienteId = resultado.insertId ?? resultado[0]?.insertId;

      await conn.query(
        "INSERT INTO historial_clinico (id_paciente, estado) VALUES (?, 'activo')",
        [pacienteId]
      );

      const tutorDatos = datos.detallesInstitucion?.tutorPrincipal;
      if (tutorDatos?.dpi && tutorDatos?.nombres && tutorDatos?.apellidos) {
        let tutorId;
        const tutorExistente = await conn.query(
          "SELECT id_tutor FROM tutor WHERE dpi = ? LIMIT 1",
          [tutorDatos.dpi]
        );

        const filasTutor = Array.isArray(tutorExistente) ? tutorExistente : tutorExistente.rows ?? [];
        if (filasTutor.length > 0) {
          tutorId = filasTutor[0].id_tutor;
        } else {
          const resTutor = await conn.query(
            `INSERT INTO tutor (dpi, nombres, apellidos, telefono, correo, direccion)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              tutorDatos.dpi,
              tutorDatos.nombres,
              tutorDatos.apellidos,
              tutorDatos.telefono ?? "",
              tutorDatos.correo ?? null,
              tutorDatos.direccion ?? null,
            ]
          );
          tutorId = resTutor.insertId ?? resTutor[0]?.insertId;
        }

        await conn.query(
          `INSERT INTO paciente_tutor (id_paciente, id_tutor, parentesco, es_principal)
           VALUES (?, ?, ?, 1)`,
          [pacienteId, tutorId, tutorDatos.parentesco ?? "Tutor"]
        );
      }

      await conn.query("COMMIT");

      return pacienteDesdeFila({
        id_paciente: pacienteId,
        documento: datos.documento ?? null,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        fecha_nacimiento: datos.fechaNacimiento,
        sexo: datos.sexo ?? null,
        grupo_sanguineo: datos.detallesInstitucion?.grupoSanguineo ?? null,
        telefono: datos.telefono ?? null,
        correo: datos.correo ?? null,
        direccion: datos.direccion ?? null,
      }, {
        tutorPrincipal: tutorDatos ? { ...tutorDatos, esPrincipal: true } : null,
      });
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async obtenerPaciente(id) {
    const conn = await this._obtenerConexion();

    try {
      const resPac = await conn.query(
        "SELECT * FROM paciente WHERE id_paciente = ?",
        [id]
      );
      const filasPac = Array.isArray(resPac) ? resPac : resPac.rows ?? [];
      if (filasPac.length === 0) {
        return null;
      }

      const pacienteFila = filasPac[0];

      // Tutor principal
      const resTutor = await conn.query(
        `SELECT t.*, pt.parentesco, pt.es_principal
         FROM paciente_tutor pt
         JOIN tutor t ON t.id_tutor = pt.id_tutor
         WHERE pt.id_paciente = ? AND pt.es_principal = 1
         LIMIT 1`,
        [id]
      );
      const filasTutor = Array.isArray(resTutor) ? resTutor : resTutor.rows ?? [];
      const tutorPrincipal = filasTutor.length > 0
        ? {
            id: String(filasTutor[0].id_tutor),
            dpi: filasTutor[0].dpi,
            nombres: filasTutor[0].nombres,
            apellidos: filasTutor[0].apellidos,
            telefono: filasTutor[0].telefono,
            correo: filasTutor[0].correo,
            parentesco: filasTutor[0].parentesco,
            esPrincipal: true,
          }
        : null;

      // Alergias
      const resAlergias = await conn.query(
        `SELECT a.id_alergia, a.nombre, pa.nivel_severidad, pa.reaccion, pa.fecha_deteccion
         FROM paciente_alergia pa
         JOIN alergia a ON a.id_alergia = pa.id_alergia
         WHERE pa.id_paciente = ?`,
        [id]
      );
      const filasAlergias = Array.isArray(resAlergias) ? resAlergias : resAlergias.rows ?? [];
      const alergias = filasAlergias.map((a) => ({
        id: String(a.id_alergia),
        nombre: a.nombre,
        severidad: a.nivel_severidad,
        reaccion: a.reaccion ?? null,
        fechaDeteccion: a.fecha_deteccion ? String(a.fecha_deteccion).slice(0, 10) : null,
      }));

      // Controles de crecimiento
      const resControles = await conn.query(
        "SELECT * FROM control_crecimiento WHERE id_paciente = ? ORDER BY fecha DESC, id_control DESC",
        [id]
      );
      const filasControles = Array.isArray(resControles) ? resControles : resControles.rows ?? [];
      const controlesCrecimiento = filasControles.map(controlCrecimientoDesdeFila);

      // Vacunas aplicadas
      const resVacunas = await conn.query(
        `SELECT va.*, v.nombre AS nombre_vacuna
         FROM vacuna_aplicada va
         JOIN vacuna v ON v.id_vacuna = va.id_vacuna
         WHERE va.id_paciente = ?
         ORDER BY va.fecha_aplicacion DESC`,
        [id]
      );
      const filasVacunas = Array.isArray(resVacunas) ? resVacunas : resVacunas.rows ?? [];
      const vacunasAplicadas = filasVacunas.map(vacunaAplicadaDesdeFila);

      return pacienteDesdeFila(pacienteFila, {
        tutorPrincipal,
        alergias,
        controlesCrecimiento,
        vacunasAplicadas,
      });
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async listarPacientes(filtro = {}) {
    const conn = await this._obtenerConexion();

    try {
      const texto = filtro.texto?.trim() ?? "";
      const estado = filtro.estado?.trim() ?? "";
      const pagina = Math.max(1, Number(filtro.pagina) || 1);
      const limite = Math.min(100, Math.max(1, Number(filtro.limite) || 10));
      const offset = (pagina - 1) * limite;

      const condiciones = [];
      const parametros = [];

      if (texto) {
        condiciones.push("(p.nombres LIKE ? OR p.apellidos LIKE ? OR p.documento LIKE ?)");
        const patron = `%${texto}%`;
        parametros.push(patron, patron, patron);
      }

      if (estado) {
        condiciones.push("h.estado = ?");
        parametros.push(estado);
      }

      const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";

      const sqlTotal = `
        SELECT COUNT(p.id_paciente) AS total
        FROM paciente p
        LEFT JOIN historial_clinico h ON h.id_paciente = p.id_paciente
        ${whereClause}
      `;

      const resTotal = await conn.query(sqlTotal, parametros);
      const filasTotal = Array.isArray(resTotal) ? resTotal : resTotal.rows ?? [];
      const total = Number(filasTotal[0]?.total ?? 0);

      const sqlItems = `
        SELECT p.*
        FROM paciente p
        LEFT JOIN historial_clinico h ON h.id_paciente = p.id_paciente
        ${whereClause}
        ORDER BY p.apellidos, p.nombres, p.id_paciente
        LIMIT ? OFFSET ?
      `;

      const resItems = await conn.query(sqlItems, [...parametros, limite, offset]);
      const filasItems = Array.isArray(resItems) ? resItems : resItems.rows ?? [];

      return {
        items: filasItems.map((f) => pacienteDesdeFila(f)),
        total,
      };
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async obtenerHistorial(pacienteId) {
    const conn = await this._obtenerConexion();

    try {
      const resHist = await conn.query(
        "SELECT * FROM historial_clinico WHERE id_paciente = ?",
        [pacienteId]
      );
      const filasHist = Array.isArray(resHist) ? resHist : resHist.rows ?? [];
      if (filasHist.length === 0) {
        return null;
      }

      const paciente = await this.obtenerPaciente(pacienteId);

      const resConsultas = await conn.query(
        "SELECT * FROM consulta WHERE id_paciente = ? ORDER BY fecha DESC, id_consulta DESC",
        [pacienteId]
      );
      const filasConsultas = Array.isArray(resConsultas) ? resConsultas : resConsultas.rows ?? [];

      const consultas = [];
      for (const cf of filasConsultas) {
        const consulta = consultaDesdeFila(cf);

        // Diagnósticos
        const resDiag = await conn.query(
          "SELECT * FROM diagnostico WHERE id_consulta = ?",
          [consulta.id]
        );
        const filasDiag = Array.isArray(resDiag) ? resDiag : resDiag.rows ?? [];

        const diagnosticos = [];
        for (const df of filasDiag) {
          const resTrat = await conn.query(
            "SELECT * FROM tratamiento WHERE id_diagnostico = ?",
            [df.id_diagnostico]
          );
          const filasTrat = Array.isArray(resTrat) ? resTrat : resTrat.rows ?? [];

          diagnosticos.push({
            id: String(df.id_diagnostico),
            descripcion: df.descripcion,
            codigoCie10: df.codigo_cie10 ?? null,
            observaciones: df.observaciones ?? null,
            tratamientos: filasTrat.map((tf) => ({
              id: String(tf.id_tratamiento),
              descripcion: tf.descripcion,
              fechaInicio: tf.fecha_inicio ? String(tf.fecha_inicio).slice(0, 10) : null,
              fechaFin: tf.fecha_fin ? String(tf.fecha_fin).slice(0, 10) : null,
              estado: tf.estado,
            })),
          });
        }

        // Receta
        const resRec = await conn.query(
          "SELECT * FROM receta WHERE id_consulta = ? LIMIT 1",
          [consulta.id]
        );
        const filasRec = Array.isArray(resRec) ? resRec : resRec.rows ?? [];
        let receta = null;

        if (filasRec.length > 0) {
          const rf = filasRec[0];
          const resDet = await conn.query(
            `SELECT dr.*, m.nombre AS nombre_medicamento
             FROM detalle_receta dr
             JOIN medicamento m ON m.id_medicamento = dr.id_medicamento
             WHERE dr.id_receta = ?`,
            [rf.id_receta]
          );
          const filasDet = Array.isArray(resDet) ? resDet : resDet.rows ?? [];

          receta = {
            id: String(rf.id_receta),
            pesoReferenciaKg: rf.peso_referencia_kg == null ? null : Number(rf.peso_referencia_kg),
            indicacionesGenerales: rf.indicaciones_generales ?? null,
            medicamentos: filasDet.map((df) => ({
              id: String(df.id_detalle_receta),
              medicamentoId: String(df.id_medicamento),
              nombre: df.nombre_medicamento,
              dosis: df.dosis,
              frecuencia: df.frecuencia,
              duracion: df.duracion ?? null,
              cantidad: df.cantidad == null ? null : Number(df.cantidad),
              indicaciones: df.indicaciones ?? null,
            })),
          };
        }

        consultas.push({
          ...consulta,
          diagnosticos,
          receta,
        });
      }

      return {
        paciente,
        historial: historialDesdeFila(filasHist[0]),
        consultas,
      };
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async archivarHistorial(pacienteId, motivo) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resultado = await conn.query(
        `UPDATE historial_clinico
         SET estado = 'archivado',
             fecha_archivo = NOW(),
             motivo_archivo_tipo = ?,
             motivo_archivo_detalle = ?
         WHERE id_paciente = ? AND estado = 'activo'`,
        [motivo.tipo, motivo.detalle, pacienteId]
      );

      const affected = resultado.affectedRows ?? resultado[0]?.affectedRows ?? 0;
      if (affected === 0) {
        const error = new Error("Historial no encontrado o ya archivado");
        error.codigo = "HISTORIAL_NO_DISPONIBLE";
        throw error;
      }

      const resHist = await conn.query(
        "SELECT * FROM historial_clinico WHERE id_paciente = ?",
        [pacienteId]
      );
      const filasHist = Array.isArray(resHist) ? resHist : resHist.rows ?? [];

      await conn.query("COMMIT");

      return {
        paciente: await this.obtenerPaciente(pacienteId),
        historial: historialDesdeFila(filasHist[0]),
        consultas: [],
      };
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async registrarControlCrecimiento(pacienteId, datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resHist = await conn.query(
        "SELECT estado FROM historial_clinico WHERE id_paciente = ? FOR UPDATE",
        [pacienteId]
      );
      const filasHist = Array.isArray(resHist) ? resHist : resHist.rows ?? [];
      if (filasHist[0]?.estado !== "activo") {
        const error = new Error("El paciente no tiene un historial activo");
        error.codigo = "HISTORIAL_NO_ACTIVO";
        throw error;
      }

      const resultado = await conn.query(
        `INSERT INTO control_crecimiento
          (id_paciente, id_consulta, fecha, edad_meses, peso_kg, talla_cm, perimetro_cefalico_cm, imc, percentil_oms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId,
          datos.consultaId ?? null,
          datos.fecha ?? new Date().toISOString().slice(0, 10),
          datos.edadMeses,
          datos.pesoKg,
          datos.tallaCm,
          datos.perimetroCefalicoCm ?? null,
          datos.imc ?? null,
          datos.percentilOms ?? null,
        ]
      );

      const controlId = resultado.insertId ?? resultado[0]?.insertId;

      await conn.query("COMMIT");

      return controlCrecimientoDesdeFila({
        id_control: controlId,
        id_paciente: pacienteId,
        id_consulta: datos.consultaId ?? null,
        fecha: datos.fecha ?? new Date().toISOString().slice(0, 10),
        edad_meses: datos.edadMeses,
        peso_kg: datos.pesoKg,
        talla_cm: datos.tallaCm,
        perimetro_cefalico_cm: datos.perimetroCefalicoCm ?? null,
        imc: datos.imc ?? null,
        percentil_oms: datos.percentilOms ?? null,
      });
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async registrarVacunaAplicada(pacienteId, datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resHist = await conn.query(
        "SELECT estado FROM historial_clinico WHERE id_paciente = ? FOR UPDATE",
        [pacienteId]
      );
      const filasHist = Array.isArray(resHist) ? resHist : resHist.rows ?? [];
      if (filasHist[0]?.estado !== "activo") {
        const error = new Error("El paciente no tiene un historial activo");
        error.codigo = "HISTORIAL_NO_ACTIVO";
        throw error;
      }

      const resultado = await conn.query(
        `INSERT INTO vacuna_aplicada
          (id_paciente, id_vacuna, numero_dosis, id_consulta, id_usuario, fecha_aplicacion, lote, reaccion_adversa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId,
          datos.vacunaId,
          datos.numeroDosis,
          datos.consultaId ?? null,
          datos.usuarioId ?? null,
          datos.fechaAplicacion ?? new Date().toISOString().slice(0, 10),
          datos.lote,
          datos.reaccionAdversa ?? null,
        ]
      );

      const vacunaAplicadaId = resultado.insertId ?? resultado[0]?.insertId;

      await conn.query("COMMIT");

      return vacunaAplicadaDesdeFila({
        id_vacuna_aplicada: vacunaAplicadaId,
        id_paciente: pacienteId,
        id_vacuna: datos.vacunaId,
        nombre_vacuna: datos.nombreVacuna ?? null,
        numero_dosis: datos.numeroDosis,
        id_consulta: datos.consultaId ?? null,
        fecha_aplicacion: datos.fechaAplicacion ?? new Date().toISOString().slice(0, 10),
        lote: datos.lote,
        reaccion_adversa: datos.reaccionAdversa ?? null,
      });
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async crearConsulta(datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resHist = await conn.query(
        "SELECT estado FROM historial_clinico WHERE id_paciente = ? FOR UPDATE",
        [datos.pacienteId]
      );
      const filasHist = Array.isArray(resHist) ? resHist : resHist.rows ?? [];
      if (filasHist[0]?.estado !== "activo") {
        const error = new Error("El paciente no tiene un historial activo");
        error.codigo = "HISTORIAL_NO_ACTIVO";
        throw error;
      }

      const resultado = await conn.query(
        `INSERT INTO consulta
          (id_paciente, id_usuario, id_cita, motivo, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, 'borrador')`,
        [
          datos.pacienteId,
          datos.usuarioId,
          datos.citaId ?? null,
          datos.motivo ?? null,
          datos.observaciones ?? null,
        ]
      );

      const consultaId = resultado.insertId ?? resultado[0]?.insertId;

      await conn.query("COMMIT");

      return consultaDesdeFila({
        id_consulta: consultaId,
        id_paciente: datos.pacienteId,
        id_usuario: datos.usuarioId,
        id_cita: datos.citaId ?? null,
        fecha: new Date(),
        motivo: datos.motivo ?? null,
        observaciones: datos.observaciones ?? null,
        estado: "borrador",
      });
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async crearDiagnostico(datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resCons = await conn.query(
        `SELECT c.id_consulta
         FROM consulta c
         JOIN historial_clinico h ON h.id_paciente = c.id_paciente
         WHERE c.id_consulta = ? AND h.estado = 'activo' AND c.estado = 'borrador'
         FOR UPDATE`,
        [datos.consultaId]
      );
      const filasCons = Array.isArray(resCons) ? resCons : resCons.rows ?? [];
      if (filasCons.length === 0) {
        const error = new Error("Consulta no disponible para diagnostico");
        error.codigo = "CONSULTA_NO_DISPONIBLE";
        throw error;
      }

      const resultado = await conn.query(
        `INSERT INTO diagnostico (id_consulta, codigo_cie10, descripcion, observaciones)
         VALUES (?, ?, ?, ?)`,
        [
          datos.consultaId,
          datos.codigoCie10 ?? null,
          datos.descripcion,
          datos.observaciones ?? null,
        ]
      );

      const diagnosticoId = resultado.insertId ?? resultado[0]?.insertId;

      await conn.query("COMMIT");

      return {
        id: String(diagnosticoId),
        consultaId: String(datos.consultaId),
        codigoCie10: datos.codigoCie10 ?? null,
        descripcion: datos.descripcion,
        observaciones: datos.observaciones ?? null,
      };
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async agregarDiagnostico(consultaId, datos) {
    return this.crearDiagnostico({ ...datos, consultaId });
  }

  async crearTratamiento(datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resDiag = await conn.query(
        `SELECT d.id_diagnostico
         FROM diagnostico d
         JOIN consulta c ON c.id_consulta = d.id_consulta
         JOIN historial_clinico h ON h.id_paciente = c.id_paciente
         WHERE d.id_diagnostico = ? AND c.estado = 'borrador' AND h.estado = 'activo'
         FOR UPDATE`,
        [datos.diagnosticoId]
      );
      const filasDiag = Array.isArray(resDiag) ? resDiag : resDiag.rows ?? [];
      if (filasDiag.length === 0) {
        const error = new Error("Diagnostico no disponible para tratamiento");
        error.codigo = "DIAGNOSTICO_NO_DISPONIBLE";
        throw error;
      }

      const resultado = await conn.query(
        `INSERT INTO tratamiento
          (id_diagnostico, descripcion, fecha_inicio, fecha_fin, estado, observaciones)
         VALUES (?, ?, ?, ?, 'activo', ?)`,
        [
          datos.diagnosticoId,
          datos.descripcion,
          datos.fechaInicio ?? null,
          datos.fechaFin ?? null,
          datos.observaciones ?? null,
        ]
      );

      const tratamientoId = resultado.insertId ?? resultado[0]?.insertId;

      await conn.query("COMMIT");

      return {
        id: String(tratamientoId),
        diagnosticoId: String(datos.diagnosticoId),
        descripcion: datos.descripcion,
        fechaInicio: datos.fechaInicio ?? null,
        fechaFin: datos.fechaFin ?? null,
        estado: "activo",
        observaciones: datos.observaciones ?? null,
      };
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async registrarTratamiento(diagnosticoId, datos) {
    return this.crearTratamiento({ ...datos, diagnosticoId });
  }

  async crearReceta(datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resCons = await conn.query(
        `SELECT c.id_consulta
         FROM consulta c
         JOIN historial_clinico h ON h.id_paciente = c.id_paciente
         WHERE c.id_consulta = ? AND c.estado = 'borrador' AND h.estado = 'activo'
         FOR UPDATE`,
        [datos.consultaId]
      );
      const filasCons = Array.isArray(resCons) ? resCons : resCons.rows ?? [];
      if (filasCons.length === 0) {
        const error = new Error("Consulta no disponible para receta");
        error.codigo = "CONSULTA_NO_DISPONIBLE";
        throw error;
      }

      if (!Array.isArray(datos.medicamentos) || datos.medicamentos.length === 0) {
        throw new Error("La receta necesita al menos un medicamento");
      }

      const resReceta = await conn.query(
        `INSERT INTO receta (id_consulta, peso_referencia_kg, indicaciones_generales)
         VALUES (?, ?, ?)`,
        [
          datos.consultaId,
          datos.pesoReferenciaKg ?? null,
          datos.indicacionesGenerales ?? null,
        ]
      );

      const recetaId = resReceta.insertId ?? resReceta[0]?.insertId;
      const detalles = [];

      for (const med of datos.medicamentos) {
        const resDet = await conn.query(
          `INSERT INTO detalle_receta
            (id_receta, id_medicamento, dosis, frecuencia, duracion, cantidad, indicaciones)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            recetaId,
            med.medicamentoId,
            med.dosis,
            med.frecuencia,
            med.duracion ?? null,
            med.cantidad ?? null,
            med.indicaciones ?? null,
          ]
        );

        const detalleId = resDet.insertId ?? resDet[0]?.insertId;
        detalles.push({
          id: String(detalleId),
          medicamentoId: String(med.medicamentoId),
          dosis: med.dosis,
          frecuencia: med.frecuencia,
          duracion: med.duracion ?? null,
          cantidad: med.cantidad ?? null,
          indicaciones: med.indicaciones ?? null,
        });
      }

      await conn.query("COMMIT");

      return {
        id: String(recetaId),
        consultaId: String(datos.consultaId),
        pesoReferenciaKg: datos.pesoReferenciaKg ?? null,
        indicacionesGenerales: datos.indicacionesGenerales ?? null,
        medicamentos: detalles,
      };
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async recetarMedicamento(consultaId, datos) {
    return this.crearReceta({ ...datos, consultaId });
  }

  async registrarAtencionCompleta(datos) {
    const conn = await this._obtenerConexion();

    try {
      await conn.query("BEGIN");

      const resHist = await conn.query(
        "SELECT estado FROM historial_clinico WHERE id_paciente = ? FOR UPDATE",
        [datos.pacienteId]
      );
      const filasHist = Array.isArray(resHist) ? resHist : resHist.rows ?? [];
      if (filasHist[0]?.estado !== "activo") {
        const error = new Error("El paciente no tiene historial activo");
        error.codigo = "HISTORIAL_NO_ACTIVO";
        throw error;
      }

      const resCons = await conn.query(
        `INSERT INTO consulta
          (id_paciente, id_usuario, id_cita, motivo, observaciones, estado)
         VALUES (?, ?, ?, ?, ?, 'borrador')`,
        [
          datos.pacienteId,
          datos.usuarioId,
          datos.citaId ?? null,
          datos.motivo ?? null,
          datos.observaciones ?? null,
        ]
      );
      const consultaId = resCons.insertId ?? resCons[0]?.insertId;

      const diagnosticos = [];
      for (const diag of datos.diagnosticos ?? []) {
        const resDiag = await conn.query(
          `INSERT INTO diagnostico (id_consulta, codigo_cie10, descripcion, observaciones)
           VALUES (?, ?, ?, ?)`,
          [consultaId, diag.codigoCie10 ?? null, diag.descripcion, diag.observaciones ?? null]
        );
        const diagId = resDiag.insertId ?? resDiag[0]?.insertId;

        const tratamientos = [];
        for (const trat of diag.tratamientos ?? []) {
          const resTrat = await conn.query(
            `INSERT INTO tratamiento
              (id_diagnostico, descripcion, fecha_inicio, fecha_fin, estado, observaciones)
             VALUES (?, ?, ?, ?, 'activo', ?)`,
            [
              diagId,
              trat.descripcion,
              trat.fechaInicio ?? null,
              trat.fechaFin ?? null,
              trat.observaciones ?? null,
            ]
          );
          const tratId = resTrat.insertId ?? resTrat[0]?.insertId;
          tratamientos.push({
            id: String(tratId),
            descripcion: trat.descripcion,
          });
        }

        diagnosticos.push({
          id: String(diagId),
          descripcion: diag.descripcion,
          tratamientos,
        });
      }

      let receta = null;
      if (datos.receta) {
        if (!Array.isArray(datos.receta.medicamentos) || datos.receta.medicamentos.length === 0) {
          throw new Error("La receta necesita medicamentos");
        }

        const resRec = await conn.query(
          `INSERT INTO receta (id_consulta, peso_referencia_kg, indicaciones_generales)
           VALUES (?, ?, ?)`,
          [consultaId, datos.receta.pesoReferenciaKg ?? null, datos.receta.indicacionesGenerales ?? null]
        );
        const recetaId = resRec.insertId ?? resRec[0]?.insertId;

        const medicamentos = [];
        for (const med of datos.receta.medicamentos) {
          const resDet = await conn.query(
            `INSERT INTO detalle_receta
              (id_receta, id_medicamento, dosis, frecuencia, duracion, cantidad, indicaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              recetaId,
              med.medicamentoId,
              med.dosis,
              med.frecuencia,
              med.duracion ?? null,
              med.cantidad ?? null,
              med.indicaciones ?? null,
            ]
          );
          const detId = resDet.insertId ?? resDet[0]?.insertId;
          medicamentos.push({
            id: String(detId),
            medicamentoId: String(med.medicamentoId),
          });
        }

        receta = {
          id: String(recetaId),
          medicamentos,
        };
      }

      await conn.query("COMMIT");

      return {
        consulta: consultaDesdeFila({
          id_consulta: consultaId,
          id_paciente: datos.pacienteId,
          id_usuario: datos.usuarioId,
          id_cita: datos.citaId ?? null,
          fecha: new Date(),
          motivo: datos.motivo ?? null,
          observaciones: datos.observaciones ?? null,
          estado: "borrador",
        }),
        diagnosticos,
        receta,
      };
    } catch (error) {
      try {
        await conn.query("ROLLBACK");
      } catch {
        // Conservar error original
      }
      throw error;
    } finally {
      if (typeof conn.release === "function") conn.release();
    }
  }

  async ping() {
    const inicio = Date.now();
    let conn;
    try {
      conn = await this._obtenerConexion();
      await conn.query("SELECT 1 AS conectado");
      return {
        ok: true,
        motor: "mariadb",
        latenciaMs: Date.now() - inicio,
      };
    } catch (error) {
      if (error instanceof MotorNoDisponible) throw error;
      throw new MotorNoDisponible("pediatria", error.message);
    } finally {
      if (conn && typeof conn.release === "function") conn.release();
    }
  }
}
