import { describe, expect, it, vi } from 'vitest';
import { PostgresAdapter } from '../../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { MotorNoDisponible } from '../../../src/domain/errores.js';
import { PacienteSchema } from '../../../src/domain/entities/paciente.js';

describe('I2-06/I2-07 · consolidación y aislamiento PostgreSQL', () => {
  it('persiste documento y retorna un paciente válido según Zod compartido', async () => {
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_paciente: 7, documento_identidad: 'FICTICIO-7', nombres: 'Ana', apellidos: 'López',
        fecha_nacimiento: new Date('2000-01-01'), sexo: 'Femenino', correo: null, telefono: null, direccion: null }] })
      .mockResolvedValue({ rows: [] }), release: vi.fn() };
    const adapter = new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) });
    const res = await adapter.crearPaciente({ nombre: 'Ana', apellidos: 'López', fechaNacimiento: '2000-01-01', genero: 'Femenino', documentoIdentidad: 'FICTICIO-7' });
    expect(PacienteSchema.safeParse(res).success).toBe(true);
    expect(cliente.query).toHaveBeenCalledWith(expect.stringContaining('documento_identidad'),
      ['Ana', 'López', '2000-01-01', 'Femenino', null, null, null, 'FICTICIO-7']);
    expect(cliente.query).toHaveBeenCalledWith('COMMIT');
  });
  it('documento y estado se parametrizan sin interpolar datos', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] }) };
    await new PostgresAdapter(pool).listarPacientes({ documento: "ficticio' OR 1=1 --", estado: 'activo' });
    expect(pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('documento_identidad = $3'), ['', 'activo', "ficticio' OR 1=1 --"]);
    expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT $4 OFFSET $5'), ['', 'activo', "ficticio' OR 1=1 --", 10, 0]);
  });
  it('consolida diagnósticos, tratamientos, recetas y piezas sin mezclar consultas', async () => {
    const respuestas = [
      [{ id_historial: 1, id_paciente: 7, estado: 'activo' }],
      [{ id_paciente: 7, nombres: 'Ana', fecha_nacimiento: '2000-01-01' }],
      [{ id_consulta: 4, id_paciente: 7, id_usuario: 9 }, { id_consulta: 5, id_paciente: 7, id_usuario: 9 }],
      [{ id_diagnostico: 8, id_consulta: 4, descripcion: 'd' }],
      [{ id_tratamiento: 10, id_diagnostico: 8, descripcion: 't', fecha_inicio: new Date('2026-01-01'), fecha_fin: null }],
      [{ id_receta: 11, id_consulta: 4, fecha: new Date('2026-01-01') }],
      [{ id_detalle_receta: 12, id_receta: 11, id_medicamento: 2, nombre: 'Ficticio', dosis: 'd', frecuencia: 'f' }],
      [{ id_consulta_servicio: 13, id_consulta: 4, id_servicio: 2, pieza_dental: 11, superficie: 'O', precio_aplicado: '25.50' }],
    ];
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] }), release: vi.fn() };
    respuestas.forEach((rows) => cliente.query.mockResolvedValueOnce({ rows }));
    cliente.query.mockResolvedValueOnce({ rows: [] });
    const pool = { query: vi.fn(), connect: vi.fn().mockResolvedValue(cliente) };
    const resultado = await new PostgresAdapter(pool).obtenerHistorial('7');
    const [primera, segunda] = resultado.consultas;
    expect(primera.diagnosticos[0].tratamientos[0].fechaInicio).toBe('2026-01-01');
    expect(primera.recetas[0].medicamentos[0].medicamentoId).toBe('2');
    expect(primera.detallesInstitucion.servicios[0]).toMatchObject({ piezaDental: 11, superficie: 'O', precioAplicado: 25.5 });
    expect(segunda.diagnosticos).toEqual([]);
    expect(segunda.recetas).toEqual([]);
    expect(segunda.detallesInstitucion.servicios).toEqual([]);
    expect(JSON.stringify(resultado)).not.toContain('id_consulta');
    expect(cliente.query).toHaveBeenCalledTimes(10);
    expect(cliente.query).toHaveBeenNthCalledWith(1, 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    expect(cliente.query).toHaveBeenLastCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalledOnce();
    expect(pool.query).not.toHaveBeenCalled();
  });
  it('el filtro de estado aplica tanto al conteo como a las filas', async () => {
    const pool = { query: vi.fn().mockResolvedValueOnce({ rows: [{ total: 0 }] }).mockResolvedValueOnce({ rows: [] }) };
    await new PostgresAdapter(pool).listarPacientes({ texto: 'Ana', estado: 'archivado', pagina: 2, limite: 5 });
    expect(pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining('h.estado = $2'), ['Ana', 'archivado']);
    expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining('LIMIT $3 OFFSET $4'), ['Ana', 'archivado', 5, 5]);
  });
  it('revierte una lectura clínica fallida y libera la conexión', async () => {
    const error = Object.assign(new Error('Lectura simulada fallida'), { code: '08006' });
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ rows: [] }), release: vi.fn() };
    const adapter = new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) });
    await expect(adapter.obtenerHistorial('7')).rejects.toBeInstanceOf(MotorNoDisponible);
    expect(cliente.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(cliente.release).toHaveBeenCalledOnce();
  });
  it('prepara el historial archivado antes de confirmar y no pierde consultas', async () => {
    const filas = [[], [{ id_historial: 1, id_paciente: 7, estado: 'archivado' }],
      [{ id_historial: 1, id_paciente: 7, estado: 'archivado' }], [{ id_paciente: 7, nombres: 'Ana' }],
      [{ id_consulta: 4, id_paciente: 7, id_usuario: 9 }], [], [], [], [], [], []];
    const cliente = { query: vi.fn(), release: vi.fn() };
    filas.forEach((rows) => cliente.query.mockResolvedValueOnce({ rows }));
    const pool = { connect: vi.fn().mockResolvedValue(cliente), query: vi.fn() };
    const resultado = await new PostgresAdapter(pool).archivarHistorial('7', { tipo: 'otro', detalle: 'Prueba' });
    expect(resultado.historial.estado).toBe('archivado');
    expect(resultado.consultas[0].id).toBe('4');
    expect(cliente.query).toHaveBeenLastCalledWith('COMMIT');
    expect(pool.query).not.toHaveBeenCalled();
    expect(cliente.release).toHaveBeenCalledOnce();
  });
  it('no confirma un archivo si falla la lectura de su respuesta', async () => {
    const fallo = Object.assign(new Error('Fallo simulado'), { code: '42703' });
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id_historial: 1, estado: 'archivado' }] })
      .mockRejectedValueOnce(fallo).mockResolvedValueOnce({ rows: [] }), release: vi.fn() };
    const adapter = new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) });
    await expect(adapter.archivarHistorial('7', { tipo: 'otro', detalle: 'Prueba' })).rejects.toBe(fallo);
    expect(cliente.query).toHaveBeenLastCalledWith('ROLLBACK');
    expect(cliente.query).not.toHaveBeenCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalledOnce();
  });
  it.each(['query', 'connect'])('convierte fallo de %s en MotorNoDisponible sin filtrar mensajes', async (metodo) => {
    const adapter = new PostgresAdapter({ [metodo]: vi.fn().mockRejectedValue(Object.assign(new Error('detalle privado'), { code: 'ECONNREFUSED' })) });
    await expect(metodo === 'query' ? adapter.obtenerPaciente('7') : adapter.crearPaciente({})).rejects.toBeInstanceOf(MotorNoDisponible);
  });
  it.each(['CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID'])('un fallo TLS %s tampoco expone detalles de conexión', async (code) => {
    const adapter = new PostgresAdapter({ query: vi.fn().mockRejectedValue(Object.assign(new Error('TLS simulado'), { code })) });
    await expect(adapter.obtenerPaciente('7')).rejects.toBeInstanceOf(MotorNoDisponible);
  });
  it('un fallo al adquirir conexión sin código se trata como motor no disponible', async () => {
    const adapter = new PostgresAdapter({ connect: vi.fn().mockRejectedValue(new Error('Pool cerrado simulado')) });
    await expect(adapter.obtenerHistorial('7')).rejects.toBeInstanceOf(MotorNoDisponible);
  });
  it('revierte consulta y piezas juntas si falla un servicio', async () => {
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ estado: 'activo' }] })
      .mockResolvedValueOnce({ rows: [{ id_consulta: 4, id_paciente: 7, id_usuario: 9 }] })
      .mockRejectedValueOnce(Object.assign(new Error('FK'), { code: '23503' }))
      .mockResolvedValue({ rows: [] }), release: vi.fn() };
    const adapter = new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) });
    await expect(adapter.crearConsulta({ pacienteId: '7', usuarioId: '9', detallesInstitucion: {
      servicios: [{ servicioId: '2', piezaDental: 11 }],
    } })).rejects.toMatchObject({ code: '23503' });
    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.query).not.toHaveBeenCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalledOnce();
  });
  it('confirma consulta y pieza dental en una sola transacción', async () => {
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ estado: 'activo' }] })
      .mockResolvedValueOnce({ rows: [{ id_consulta: 4, id_paciente: 7, id_usuario: 9 }] })
      .mockResolvedValueOnce({ rows: [{ id_consulta_servicio: 13, id_servicio: 2, pieza_dental: 11, superficie: 'O' }] })
      .mockResolvedValue({ rows: [] }), release: vi.fn() };
    const adapter = new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) });
    const res = await adapter.crearConsulta({ pacienteId: '7', usuarioId: '9', detallesInstitucion: {
      servicios: [{ servicioId: '2', piezaDental: 11, superficie: 'O' }],
    } });
    expect(res.detallesInstitucion.servicios[0]).toMatchObject({ id: '13', servicioId: '2', piezaDental: 11 });
    expect(cliente.query).toHaveBeenCalledWith('COMMIT');
  });
  it('la atención completa existente tampoco pierde servicios ni confirma una pieza inválida', async () => {
    const cliente = { query: vi.fn().mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ estado: 'activo' }] })
      .mockResolvedValueOnce({ rows: [{ id_consulta: 4, id_paciente: 7, id_usuario: 9 }] })
      .mockRejectedValueOnce(Object.assign(new Error('Servicio inexistente'), { code: '23503' }))
      .mockResolvedValue({ rows: [] }), release: vi.fn() };
    const adapter = new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) });
    await expect(adapter.registrarAtencionCompleta({ pacienteId: '7', usuarioId: '9', detallesInstitucion: {
      servicios: [{ servicioId: '2', piezaDental: 11 }],
    } })).rejects.toMatchObject({ code: '23503' });
    expect(cliente.query).toHaveBeenCalledWith('ROLLBACK');
    expect(cliente.query).not.toHaveBeenCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalledOnce();
  });
});
