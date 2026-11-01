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
