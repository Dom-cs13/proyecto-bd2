import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';
import { casosPacientesOdontologia } from '../../src/application/useCases/odontologiaPacientes.js';

vi.mock('../../src/infrastructure/adapters/postgresql/connection.js', () => ({
  crearPoolPostgres: () => { throw new Error('Conexión real prohibida'); },
}));
const clave = 'clave-ficticia-i2-clinica';
const rutas = [
  ['/consultas', 'crearConsulta', { pacienteId: '7', motivo: 'Revisión', detallesInstitucion: {
    servicios: [{ servicioId: '2', piezaDental: 11, superficie: 'O' }],
  } }],
  ['/consultas/4/diagnosticos', 'agregarDiagnostico', { descripcion: 'Diagnóstico ficticio' }],
  ['/diagnosticos/8/tratamientos', 'registrarTratamiento', { descripcion: 'Tratamiento ficticio', fechaInicio: '2026-01-01', fechaFin: '2026-01-02' }],
  ['/consultas/4/recetas', 'recetarMedicamento', { medicamentos: [{ medicamentoId: '2', dosis: 'Indicación ficticia', frecuencia: 'Frecuencia ficticia' }] }],
];
function auth(req, rol = 'odontologo', institucion = 'odontologia') {
  return req.set('Authorization', `Bearer ${jwt.sign({ institucion, rol }, clave, {
    subject: '9', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web',
  })}`);
}
describe('I2-02/I2-03/I2-07 · operaciones clínicas', () => {
  let app, repo, resolver;
  beforeEach(() => {
    repo = Object.fromEntries(rutas.map(([, metodo]) => [metodo, vi.fn().mockResolvedValue({ id: '1' })]));
    repo.listarPacientes = vi.fn().mockResolvedValue({ items: [], total: 0 });
    repo.ping = vi.fn().mockResolvedValue({ ok: true, motor: 'postgresql', latenciaMs: 1 });
    repo.obtenerCatalogos = vi.fn().mockResolvedValue({ medicamentos: [], servicios: [] });
    resolver = vi.fn(() => repo);
    app = crearApp({ odontologia: { obtenerRepositorio: resolver, obtenerClave: () => clave } });
  });
  it.each(rutas)('ejecuta %s y pasa por el caso de uso', async (ruta, metodo, datos) => {
    const res = await auth(request(app).post(ruta)).send(datos);
    expect(res.status).toBe(201);
    expect(resolver).toHaveBeenCalledWith('odontologia');
    if (metodo === 'crearConsulta') expect(repo[metodo]).toHaveBeenCalledWith({ ...datos, usuarioId: '9' });
    else expect(repo[metodo]).toHaveBeenCalledWith(ruta.includes('/diagnosticos/8') ? '8' : '4', datos);
  });
  it.each(rutas)('secretaría no puede escribir en %s', async (ruta, metodo, datos) => {
    expect((await auth(request(app).post(ruta), 'secretaria').send(datos)).status).toBe(403);
    expect(resolver).not.toHaveBeenCalled();
  });
  it.each(['hospital', 'laboratorio', 'pediatria'])('deja continuar al usuario de %s sin resolver repositorios odontológicos', async (institucion) => {
    expect((await auth(request(app).post('/consultas'), 'odontologo', institucion).send(rutas[0][2])).status).toBe(404);
    expect(resolver).not.toHaveBeenCalled();
  });
  it('no permite suplantar al usuario tratante', async () => {
    const res = await auth(request(app).post('/consultas')).send({ pacienteId: '7', motivo: 'Revisión', usuarioId: '999' });
    expect(res.status).toBe(400);
    expect(repo.crearConsulta).not.toHaveBeenCalled();
  });
  it.each([10, 19, 20, 49, 55, 11.5])('rechaza pieza FDI inválida %s', async (piezaDental) => {
    const res = await auth(request(app).post('/consultas')).send({ pacienteId: '7', motivo: 'Revisión',
      detallesInstitucion: { servicios: [{ servicioId: '2', piezaDental }] } });
    expect(res.status).toBe(400);
    expect(repo.crearConsulta).not.toHaveBeenCalled();
  });
  it('rechaza superficie sin pieza', async () => {
    const res = await auth(request(app).post('/consultas')).send({ pacienteId: '7', motivo: 'Revisión',
      detallesInstitucion: { servicios: [{ servicioId: '2', superficie: 'O' }] } });
    expect(res.status).toBe(400);
  });
  it.each([
    ['/diagnosticos/8/tratamientos', { descripcion: 'x', fechaFin: '2026-01-01' }],
    ['/diagnosticos/8/tratamientos', { descripcion: 'x', fechaInicio: '2026-02-01', fechaFin: '2026-01-01' }],
    ['/consultas/4/recetas', { medicamentos: [] }],
    ['/consultas/4/recetas', { medicamentos: [{ medicamentoId: '2', dosis: ' ', frecuencia: 'x' }] }],
    ['/consultas/4/recetas', { medicamentos: [{ medicamentoId: '2', dosis: 'x', frecuencia: 'x', cantidad: 0 }] }],
  ])('valida fechas y medicamentos %#', async (ruta, body) => {
    expect((await auth(request(app).post(ruta)).send(body)).status).toBe(400);
  });
  it.each(['HISTORIAL_NO_ACTIVO', 'CONSULTA_NO_DISPONIBLE', 'DIAGNOSTICO_NO_DISPONIBLE'])('traduce conflicto %s', async (codigo) => {
    repo.crearConsulta.mockRejectedValue(Object.assign(new Error('Detalle interno'), { codigo }));
    const res = await auth(request(app).post('/consultas')).send(rutas[0][2]);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe(codigo);
  });
  it('valida referencias FK con 400', async () => {
    repo.crearConsulta.mockRejectedValue(Object.assign(new Error('SQL privado'), { code: '23503' }));
    const res = await auth(request(app).post('/consultas')).send(rutas[0][2]);
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('REFERENCIA_INVALIDA');
  });
  it('un conflicto de cita en una consulta no se etiqueta como paciente duplicado', async () => {
    repo.crearConsulta.mockRejectedValue(Object.assign(new Error('Unicidad simulada'), { code: '23505' }));
    const res = await auth(request(app).post('/consultas')).send(rutas[0][2]);
    expect(res.status).toBe(409);
    expect(res.body.error.codigo).toBe('CONFLICTO');
  });
  it.each(['42501', '42883', '28P01'])('el fallo de configuración %s se sanea como 503', async (code) => {
    repo.crearConsulta.mockRejectedValue(Object.assign(new Error('Información privada de configuración'), { code }));
    const res = await auth(request(app).post('/consultas')).send(rutas[0][2]);
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('privada');
  });
  it('acepta búsqueda por estado sin convertirla en archivo', async () => {
    const res = await auth(request(app).get('/pacientes?estado=archivado'));
    expect(res.status).toBe(200);
    expect(repo.listarPacientes).toHaveBeenCalledWith({ estado: 'archivado', pagina: 1, limite: 10 });
  });
  it('acepta búsqueda exacta por documento combinada con estado', async () => {
    const res = await auth(request(app).get('/pacientes?documento=FICTICIO-7&estado=activo'));
    expect(res.status).toBe(200);
    expect(repo.listarPacientes).toHaveBeenCalledWith({ documento: 'FICTICIO-7', estado: 'activo', pagina: 1, limite: 10 });
  });
  it('entrega catálogos al odontólogo', async () => {
    expect((await auth(request(app).get('/odontologia/catalogos'))).body).toEqual({ medicamentos: [], servicios: [] });
  });
  it('no entrega catálogos clínicos a secretaría', async () => {
    expect((await auth(request(app).get('/odontologia/catalogos'), 'secretaria')).status).toBe(403);
  });
  it('expone estado técnico local sin datos clínicos', async () => {
    const res = await auth(request(app).get('/odontologia/status'), 'secretaria');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, motor: 'postgresql', latenciaMs: 1 });
  });
  it('los casos de uso se prueban sin drivers y derivan el usuario de la sesión', async () => {
    const casos = casosPacientesOdontologia(repo);
    await casos.crearConsulta({ pacienteId: '7', usuarioId: 'otro' }, '9');
    await casos.agregarDiagnostico('4', { descripcion: 'd' });
    await casos.registrarTratamiento('8', { descripcion: 't' });
    await casos.recetarMedicamento('4', rutas[3][2]);
    expect(repo.crearConsulta).toHaveBeenCalledWith({ pacienteId: '7', usuarioId: '9' });
    expect(repo.agregarDiagnostico).toHaveBeenCalledWith('4', { descripcion: 'd' });
    expect(repo.registrarTratamiento).toHaveBeenCalledWith('8', { descripcion: 't' });
    expect(repo.recetarMedicamento).toHaveBeenCalledWith('4', rutas[3][2]);
  });
});
