import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';
import { PostgresAdapter } from '../../src/infrastructure/adapters/postgresql/PostgresAdapter.js';
import { crearPoolPostgres } from '../../src/infrastructure/adapters/postgresql/connection.js';

// Impide conexiones reales incluso si una prueba olvida inyectar el repositorio.
vi.mock('../../src/infrastructure/adapters/postgresql/connection.js', () => ({
  crearPoolPostgres: vi.fn(() => { throw new Error('Conexión real prohibida en tests'); }),
}));

const clave = 'clave-ficticia-exclusiva-de-pruebas-i2-03';
const datos = { nombres: 'Ana', apellidos: 'López', fechaNacimiento: '2000-01-01', sexo: 'Femenino' };
const paciente = { id: '7', ...datos, detallesInstitucion: {} };
const motivo = { tipo: 'traslado', detalle: 'Traslado solicitado' };
const historial = { paciente, historial: { estado: 'activo' }, consultas: [{ id: '2' }] };
function token(rol = 'secretaria', claims = {}, opciones = {}) {
  return jwt.sign({ institucion: 'odontologia', rol, ...claims }, clave, {
    subject: '1', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web', ...opciones,
  });
}

describe('I2-03 · HTTP Odontología sin bases reales', () => {
  let repo, resolver, app;
  beforeEach(() => {
    repo = {
      crearPaciente: vi.fn().mockResolvedValue(paciente),
      listarPacientes: vi.fn().mockResolvedValue({ items: [paciente], total: 1 }),
      obtenerPaciente: vi.fn().mockResolvedValue(paciente),
      obtenerHistorial: vi.fn().mockResolvedValue(historial),
      archivarHistorial: vi.fn().mockResolvedValue({ ...historial, consultas: [] }),
    };
    resolver = vi.fn(() => repo);
    app = crearApp({ odontologia: { obtenerRepositorio: resolver, obtenerClave: () => clave } });
  });
  const autenticar = (req, rol = 'secretaria') => req.set('Authorization', `Bearer ${token(rol)}`);
  afterEach(() => vi.unstubAllEnvs());

  it('el token emitido por el login odontológico funciona en las rutas protegidas', async () => {
    vi.stubEnv('JWT_SECRET', clave);
    vi.stubEnv('DATABASE_URL', 'postgresql://conexion-ficticia.invalid/pruebas');
    const query = vi.fn().mockResolvedValue({ rowCount: 1, rows: [
      { id_usuario: 1, correo: 'secretaria@example.invalid', rol: 'secretaria' },
    ] });
    vi.mocked(crearPoolPostgres).mockReturnValueOnce({ query });
    const login = await request(app).post('/auth/login').send({
      institucion: 'odontologia', usuario: 'secretaria@example.invalid', password: 'dato-ficticio',
    });
    expect(login.status).toBe(200);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM public.usuario'),
      ['secretaria@example.invalid', 'dato-ficticio']);
    const res = await request(app).get('/pacientes').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const rechazado = await request(app).post('/auth/login').send({
      institucion: 'odontologia', usuario: 'constructor', password: 'dato-ficticio',
    });
    expect(rechazado.status).toBe(401);
    expect(query).toHaveBeenLastCalledWith(expect.any(String), ['constructor', 'dato-ficticio']);
  });

  it('registra con 201 y resuelve la institución exclusivamente del JWT', async () => {
    const res = await autenticar(request(app).post('/pacientes')).send(datos);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(paciente);
    expect(resolver).toHaveBeenCalledWith('odontologia');
    expect(repo.crearPaciente).toHaveBeenCalledWith(datos);
  });
  it('lista y busca por texto con paginación validada', async () => {
    const res = await autenticar(request(app).get('/pacientes?texto=Ana&pagina=2&limite=5'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [paciente], total: 1 });
    expect(repo.listarPacientes).toHaveBeenCalledWith({ texto: 'Ana', pagina: 2, limite: 5 });
  });
  it('acepta nombres canónicos sin modificar el esquema compartido', async () => {
    const res = await autenticar(request(app).post('/pacientes')).send({
      nombre: 'Ana', apellidos: 'López', fechaNacimiento: '2000-01-01', genero: 'Femenino', documentoIdentidad: 'FICTICIO-7',
    });
    expect(res.status).toBe(201);
    expect(repo.crearPaciente).toHaveBeenCalledWith({ ...datos, documentoIdentidad: 'FICTICIO-7' });
  });
  it.each(['secretaria', 'odontologo'])('%s consulta la ficha', async (rol) => {
    const res = await autenticar(request(app).get('/pacientes/7'), rol);
    expect(res.status).toBe(200);
    expect(repo.obtenerPaciente).toHaveBeenCalledWith('7');
  });
  it('permite consultar historial al odontólogo', async () => {
    const res = await autenticar(request(app).get('/pacientes/7/historial'), 'odontologo');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(historial);
  });
  it('archiva con motivo formal y conserva las consultas', async () => {
    const archivado = { ...historial, historial: { estado: 'archivado', motivoArchivo: motivo } };
    repo.obtenerHistorial.mockResolvedValueOnce(historial).mockResolvedValueOnce(archivado);
    repo.archivarHistorial.mockResolvedValue(archivado);
    const res = await autenticar(request(app).patch('/pacientes/7/archivar'), 'odontologo').send({ motivo });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(archivado);
    expect(repo.archivarHistorial).toHaveBeenCalledWith('7', motivo);
  });
  it.each([
    ['get', '/pacientes/7/historial', 'secretaria'],
    ['patch', '/pacientes/7/archivar', 'secretaria'],
    ['post', '/pacientes', 'odontologo'],
  ])('deniega %s %s para %s antes de acceder al repositorio', async (metodo, ruta, rol) => {
    const res = await autenticar(request(app)[metodo](ruta), rol).send({ motivo });
    expect(res.status).toBe(403);
    expect(resolver).not.toHaveBeenCalled();
  });
  it.each([
    undefined, 'Bearer basura',
    `Bearer ${token('secretaria', {}, { expiresIn: -1 })}`,
    `Bearer ${token('secretaria', {}, { issuer: 'otro' })}`,
    `Bearer ${token('secretaria', {}, { audience: 'otro' })}`,
    `Bearer ${jwt.sign({ institucion: 'odontologia', rol: 'secretaria' }, 'otra-clave')}`,
    `Bearer ${token('secretaria', {}, { algorithm: 'HS384' })}`,
    `Bearer ${jwt.sign({ institucion: 'odontologia', rol: 'secretaria' }, clave,
      { subject: '1', issuer: 'red-salud', audience: 'red-salud-web' })}`,
  ])('rechaza JWT ausente, inválido o incompleto %#', async (authorization) => {
    const req = request(app).get('/pacientes');
    if (authorization) req.set('Authorization', authorization);
    const res = await req;
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe('NO_AUTENTICADO');
    expect(resolver).not.toHaveBeenCalled();
  });
  it.each([
    { institucion: 'laboratorio' }, { institucion: 'hospital' }, { institucion: 'pediatria' }, { rol: 'admin' },
  ])('no atiende instituciones ajenas ni roles no autorizados %#', async (claims) => {
    const res = await request(app).get('/pacientes').set('Authorization', `Bearer ${token('secretaria', claims)}`);
    expect(res.status).toBe(claims.institucion ? 404 : 403);
    expect(resolver).not.toHaveBeenCalled();
  });
  it.each([
    {}, { ...datos, nombres: ' ' }, { ...datos, fechaNacimiento: '2000-02-30' },
    { ...datos, fechaNacimiento: '2999-01-01' }, { ...datos, correo: 'inválido' },
    { ...datos, institucion: 'hospital' }, { ...datos, documentoIdentidad: ' ' },
  ])('rechaza registro inválido o datos no persistibles %#', async (body) => {
    const res = await autenticar(request(app).post('/pacientes')).send(body);
    expect(res.status).toBe(400);
    expect(repo.crearPaciente).not.toHaveBeenCalled();
  });
  it.each(['pagina=0', 'limite=101', 'pagina=1.5', 'texto=a&texto=b', 'documento=', 'estado=invalido', 'institucion=hospital'])('rechaza filtro inválido o no soportado %s', async (query) => {
    const res = await autenticar(request(app).get(`/pacientes?${query}`));
    expect(res.status).toBe(400);
    expect(repo.listarPacientes).not.toHaveBeenCalled();
  });
  it.each(['abc', '0', '-1', '2147483648'])('valida id %s', async (id) => {
    const res = await autenticar(request(app).get(`/pacientes/${id}`));
    expect(res.status).toBe(400);
    expect(repo.obtenerPaciente).not.toHaveBeenCalled();
  });
  it.each([{}, { motivo: 'texto' }, { motivo: { tipo: 'otro', detalle: ' ' } }])('valida motivo antes de archivar %#', async (body) => {
    const res = await autenticar(request(app).patch('/pacientes/7/archivar'), 'odontologo').send(body);
    expect(res.status).toBe(400);
    expect(repo.archivarHistorial).not.toHaveBeenCalled();
  });
  it.each([['obtenerPaciente', '/pacientes/7'], ['obtenerHistorial', '/pacientes/7/historial']])('devuelve 404 para %s ausente', async (metodo, ruta) => {
    repo[metodo].mockResolvedValue(null);
    const res = await autenticar(request(app).get(ruta), 'odontologo');
    expect(res.status).toBe(404);
  });
  it('evita un segundo archivado con 409', async () => {
    repo.obtenerHistorial.mockResolvedValue({ ...historial, historial: { estado: 'archivado' } });
    const res = await autenticar(request(app).patch('/pacientes/7/archivar'), 'odontologo').send({ motivo });
    expect(res.status).toBe(409);
    expect(repo.archivarHistorial).not.toHaveBeenCalled();
  });
  it.each([['23505', 409], ['ECONNREFUSED', 503], ['08006', 503], ['23514', 400], ['42703', 503]])('traduce error %s a %s sin filtrar detalles', async (code, status) => {
    repo.crearPaciente.mockRejectedValue(Object.assign(new Error('detalle interno privado'), { code }));
    const res = await autenticar(request(app).post('/pacientes')).send(datos);
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: { codigo: expect.any(String), mensaje: expect.any(String) } });
    expect(JSON.stringify(res.body)).not.toContain('privado');
  });
  it('ejecuta HTTP → caso de uso → PostgresAdapter → mapper con pool simulado', async () => {
    const cliente = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [{ id_paciente: 7, nombres: 'Ana', apellidos: 'López', fecha_nacimiento: new Date('2000-01-01') }],
      }).mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    };
    resolver.mockReturnValue(new PostgresAdapter({ connect: vi.fn().mockResolvedValue(cliente) }));
    const res = await autenticar(request(app).post('/pacientes')).send(datos);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('7');
    expect(res.body.fechaNacimiento).toBe('2000-01-01');
    expect(cliente.query).toHaveBeenCalledWith('COMMIT');
    expect(cliente.release).toHaveBeenCalledOnce();
  });
});
