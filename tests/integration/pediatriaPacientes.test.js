import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';

// Impide conexiones reales en tests unitarios/integración si no se inyecta repositorio
vi.mock('../../src/infrastructure/adapters/mariadb/connection.js', () => ({
  crearPoolMariaDb: vi.fn(() => { throw new Error('Conexión real prohibida en tests'); }),
}));

const clave = 'clave-ficticia-exclusiva-de-pruebas-i4-08';
const datosPaciente = {
  nombres: 'Mateo',
  apellidos: 'Morales',
  fechaNacimiento: '2023-05-15',
  sexo: 'M',
  documento: 'CUI-30012020-01',
  detallesInstitucion: {
    grupoSanguineo: 'O+',
    tutorPrincipal: {
      dpi: '2093847580101',
      nombres: 'Carlos',
      apellidos: 'Morales',
      parentesco: 'Padre',
      telefono: '555-1234',
    },
  },
};
const pacienteRetornado = { id: '10', ...datosPaciente };
const motivoArchivo = { tipo: 'traslado', detalle: 'Traslado a otra ciudad' };
const historialRetornado = {
  paciente: pacienteRetornado,
  historial: { estado: 'activo' },
  consultas: [{ id: '1' }],
};

function token(rol = 'recepcion', claims = {}, opciones = {}) {
  return jwt.sign({ institucion: 'pediatria', rol, ...claims }, clave, {
    subject: '1',
    expiresIn: '1h',
    issuer: 'red-salud',
    audience: 'red-salud-web',
    ...opciones,
  });
}

describe('I4-08 · HTTP Pacientes Pediatría sin bases reales', () => {
  let repo;
  let resolver;
  let app;

  beforeEach(() => {
    repo = {
      crearPaciente: vi.fn().mockResolvedValue(pacienteRetornado),
      listarPacientes: vi.fn().mockResolvedValue({ items: [pacienteRetornado], total: 1 }),
      obtenerPaciente: vi.fn().mockResolvedValue(pacienteRetornado),
      obtenerHistorial: vi.fn().mockResolvedValue(historialRetornado),
      archivarHistorial: vi.fn().mockResolvedValue({ ...historialRetornado, historial: { estado: 'archivado' } }),
      ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 5 }),
    };
    resolver = vi.fn(() => repo);
    app = crearApp({ pediatria: { obtenerRepositorio: resolver, obtenerClave: () => clave } });
  });

  afterEach(() => vi.unstubAllEnvs());

  const autenticar = (req, rol = 'recepcion') => req.set('Authorization', `Bearer ${token(rol)}`);

  it('el token emitido por login pediátrico permite registrar paciente', async () => {
    const res = await autenticar(request(app).post('/pacientes')).send(datosPaciente);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('10');
    expect(repo.crearPaciente).toHaveBeenCalledOnce();
  });

  it('rechaza registro si el token no tiene rol autorizado', async () => {
    // Si viene con un rol inválido para registrar (por ejemplo si un rol desconocido intentara)
    const tokenInvalido = jwt.sign({ institucion: 'pediatria', rol: 'desconocido' }, clave, {
      subject: '1',
      expiresIn: '1h',
      issuer: 'red-salud',
      audience: 'red-salud-web',
    });
    const res = await request(app).post('/pacientes').set('Authorization', `Bearer ${tokenInvalido}`).send(datosPaciente);
    expect(res.status).toBe(403);
  });

  it('rechaza registro con fecha futura (400)', async () => {
    const res = await autenticar(request(app).post('/pacientes')).send({
      ...datosPaciente,
      fechaNacimiento: '2099-01-01',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('VALIDACION');
  });

  it('permite listar pacientes con filtros', async () => {
    const res = await autenticar(request(app).get('/pacientes?texto=Mateo&limite=5'));
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(repo.listarPacientes).toHaveBeenCalledWith({
      texto: 'Mateo',
      limite: 5,
      pagina: 1,
    });
  });

  it('permite obtener detalle de paciente por ID', async () => {
    const res = await autenticar(request(app).get('/pacientes/10'));
    expect(res.status).toBe(200);
    expect(res.body.nombres).toBe('Mateo');
  });

  it('devuelve 404 si el paciente no existe', async () => {
    repo.obtenerPaciente.mockResolvedValueOnce(null);
    const res = await autenticar(request(app).get('/pacientes/999'));
    expect(res.status).toBe(404);
    expect(res.body.error.codigo).toBe('PACIENTE_NO_ENCONTRADO');
  });

  it('permite consultar historial con rol enfermeria o pediatra', async () => {
    const resEnf = await autenticar(request(app).get('/pacientes/10/historial'), 'enfermeria');
    expect(resEnf.status).toBe(200);
    expect(resEnf.body.historial.estado).toBe('activo');

    const resPed = await autenticar(request(app).get('/pacientes/10/historial'), 'pediatra');
    expect(resPed.status).toBe(200);
  });

  it('deniega acceso al historial al rol recepcion (403)', async () => {
    const res = await autenticar(request(app).get('/pacientes/10/historial'), 'recepcion');
    expect(res.status).toBe(403);
  });

  it('permite archivar paciente al rol pediatra', async () => {
    const res = await autenticar(request(app).patch('/pacientes/10/archivar'), 'pediatra').send({
      motivo: motivoArchivo,
    });
    expect(res.status).toBe(200);
    expect(repo.archivarHistorial).toHaveBeenCalledWith('10', motivoArchivo);
  });

  it('deniega archivar al rol enfermeria o recepcion (403)', async () => {
    const resEnf = await autenticar(request(app).patch('/pacientes/10/archivar'), 'enfermeria').send({
      motivo: motivoArchivo,
    });
    expect(resEnf.status).toBe(403);

    const resRec = await autenticar(request(app).patch('/pacientes/10/archivar'), 'recepcion').send({
      motivo: motivoArchivo,
    });
    expect(resRec.status).toBe(403);
  });

  it('devuelve 409 si se intenta archivar un paciente ya archivado', async () => {
    repo.obtenerHistorial.mockResolvedValueOnce({
      ...historialRetornado,
      historial: { estado: 'archivado' },
    });
    const res = await autenticar(request(app).patch('/pacientes/10/archivar'), 'pediatra').send({
      motivo: motivoArchivo,
    });
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('PACIENTE_ARCHIVADO');
  });

  it('devuelve 503 cuando el motor MariaDB no está disponible', async () => {
    resolver.mockImplementationOnce(() => {
      throw new Error('Connection refused');
    });
    const res = await autenticar(request(app).get('/pacientes'));
    expect(res.status).toBe(503);
    expect(res.body.error.codigo).toBe('MOTOR_NO_DISPONIBLE');
  });
});
