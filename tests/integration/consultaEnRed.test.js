import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';
import { crearRouterRed } from '../../src/interfaces/http/routes/consultaEnRed.js';
import { errorHandler, noEncontrado } from '../../src/interfaces/http/middleware/errorHandler.js';
import { buscarEnRed, obtenerHistorialEnRed, institucionesRed } from '../../src/application/useCases/consultaEnRed.js';
import { MotorNoDisponible } from '../../src/domain/errores.js';
import { pacienteDesdeFila as pacientePediatria } from '../../src/infrastructure/adapters/mariadb/mapper.js';

const clave = 'clave-ficticia-red-supertest';
const perfiles = [['hospital', 'admin'], ['odontologia', 'odontologo'], ['laboratorio', 'laboratorista'], ['pediatria', 'pediatra']];
const firma = (institucion = 'odontologia', rol = 'odontologo', opciones = {}) => jwt.sign({ institucion, rol }, clave,
  { subject: '1', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web', ...opciones });
const autorizar = (req, institucion, rol) => req.set('Authorization', `Bearer ${firma(institucion, rol)}`);
const paciente = { id: 'opaque-1', documentoIdentidad: 'FICTICIO', nombre: 'Paciente', apellidos: 'Prueba', fechaNacimiento: '2000-01-01', genero: 'Otro',
  telefono: 'NO-COMPARTIR', alergias: ['NO-COMPARTIR'], detallesInstitucion: { reservado: 'NO-COMPARTIR' }, passwordHash: 'NO-COMPARTIR' };
const expediente = { paciente, historial: { id: 'h1', pacienteId: 'opaque-1', estado: 'activo', motivoArchivo: { detalle: 'NO-COMPARTIR' } },
  auditoria: 'NO-COMPARTIR', consultas: [{ id: 'c1', motivo: 'Dato clínico', observaciones: 'Nota reservada', detallesInstitucion: { reservado: true },
    diagnosticos: [{ id: 'd1', descripcion: 'Diagnóstico de prueba', tratamientos: [] }], recetas: [] }] };

describe('I2-02/I2-03/I2-10 · red HTTP (cuatro repositorios simulados)', () => {
  let app, repos, obtenerTodos;
  beforeEach(() => {
    repos = Object.fromEntries(institucionesRed.map((institucion) => [institucion, {
      listarPacientes: vi.fn().mockResolvedValue({ items: [paciente], total: 1 }),
      obtenerHistorial: vi.fn().mockResolvedValue(expediente),
      crearPaciente: vi.fn(), archivarHistorial: vi.fn(), crearConsulta: vi.fn(),
    }]));
    obtenerTodos = vi.fn(() => repos);
    app = crearApp({ red: { obtenerTodos, obtenerClave: () => clave, timeoutMs: 50 },
      odontologia: { obtenerRepositorio: () => repos.odontologia, obtenerClave: () => clave } });
  });
  it.each(perfiles)('%s/%s busca en cuatro instituciones con datos autorizados', async (institucion, rol) => {
    const res = await autorizar(request(app).get('/red/pacientes?documento=FICTICIO'), institucion, rol);
    expect(res.status).toBe(200);
    expect(res.body.resultados).toHaveLength(4);
    for (const resultado of res.body.resultados) {
      expect(resultado).toMatchObject({ estado: 'ok', total: 1, items: [{ id: 'opaque-1', nombre: 'Paciente' }] });
      expect(repos[resultado.institucion].listarPacientes).toHaveBeenCalledWith({ documento: 'FICTICIO', pagina: 1, limite: 10 });
    }
    expect(JSON.stringify(res.body)).not.toContain('NO-COMPARTIR');
  });
  it.each(perfiles)('%s/%s consulta historiales extranjeros sin campos restringidos', async (institucion, rol) => {
    for (const destino of institucionesRed.filter((i) => i !== institucion)) {
      const res = await autorizar(request(app).get(`/red/${destino}/pacientes/opaque-1/historial`), institucion, rol);
      expect(res.status).toBe(200);
      expect(res.body.historial.estado).toBe('activo');
      expect(res.body.consultas).toEqual([]);
      expect(JSON.stringify(res.body)).not.toMatch(/NO-COMPARTIR|Nota reservada|Dato clínico/);
    }
  });
  it.each([...perfiles, ['odontologia', 'secretaria'], ['pediatria', 'recepcion']])('%s/%s nunca escribe por /red', async (institucion, rol) => {
    for (const metodo of ['post', 'put', 'patch', 'delete']) {
      const res = await autorizar(request(app)[metodo]('/red/odontologia/pacientes/7/historial'), institucion, rol).send({ estado: 'archivado' });
      expect(res.status).toBe(403); expect(res.body.error.codigo).toBe('ESCRITURA_EN_RED_PROHIBIDA');
    }
    expect(obtenerTodos).not.toHaveBeenCalled();
  });
  it('secretaría y recepción no ven notas clínicas locales en red', async () => {
    for (const [institucion, rol] of [['odontologia', 'secretaria'], ['pediatria', 'recepcion']]) {
      const res = await autorizar(request(app).get(`/red/${institucion}/pacientes/opaque-1/historial`), institucion, rol);
      expect(res.body.consultas).toEqual([]);
      expect(JSON.stringify(res.body)).not.toContain('NO-COMPARTIR');
    }
  });
  it('el odontólogo conserva lectura clínica propia, con proyección positiva', async () => {
    const res = await autorizar(request(app).get('/red/odontologia/pacientes/opaque-1/historial'), 'odontologia', 'odontologo');
    expect(res.body.consultas[0].diagnosticos[0].descripcion).toBe('Diagnóstico de prueba');
    expect(JSON.stringify(res.body)).not.toContain('NO-COMPARTIR');
  });
  it.each(institucionesRed)('si falla %s, conserva los otros tres resultados y responde 200', async (institucion) => {
    repos[institucion].listarPacientes.mockRejectedValue(new MotorNoDisponible(institucion));
    const res = await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'odontologo');
    expect(res.status).toBe(200);
    expect(res.body.resultados.find((r) => r.institucion === institucion)).toEqual({ institucion, estado: 'no_disponible', items: [], total: 0 });
    expect(res.body.resultados.filter((r) => r.estado === 'ok')).toHaveLength(3);
  });
  it('solo responde 503 en búsqueda cuando ninguna institución puede consultarse', async () => {
    for (const repo of Object.values(repos)) repo.listarPacientes.mockRejectedValue(new MotorNoDisponible('prueba'));
    expect((await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'odontologo')).status).toBe(503);
  });
  it('un registro ausente se marca no disponible, no se inventa que el motor está sano', async () => {
    delete repos.laboratorio;
    const res = await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'odontologo');
    expect(res.status).toBe(200);
    expect(res.body.resultados[2].estado).toBe('no_disponible');
    expect((await autorizar(request(app).get('/red/laboratorio/pacientes/abc/historial'), 'odontologia', 'odontologo')).status).toBe(503);
  });
  it('un motor que no resuelve no bloquea indefinidamente los demás', async () => {
    repos.hospital.listarPacientes.mockImplementation(() => new Promise(() => {}));
    const res = await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'odontologo');
    expect(res.status).toBe(200); expect(res.body.resultados[0].estado).toBe('no_disponible');
  });
  it('devuelve 404 para historial inexistente y 503 para caída sin filtrar detalles internos', async () => {
    repos.hospital.obtenerHistorial.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('detalle interno'));
    for (const status of [404, 503]) {
      const res = await autorizar(request(app).get('/red/hospital/pacientes/abc/historial'), 'odontologia', 'odontologo');
      expect(res.status).toBe(status); expect(JSON.stringify(res.body)).not.toContain('detalle interno');
    }
  });
  it('rechaza firma falsa y req.user precargado, sin consultar repositorios', async () => {
    const propia = express(); propia.use((req, res, next) => { req.user = { institucion: 'odontologia', rol: 'odontologo' }; next(); });
    propia.use(crearRouterRed({ obtenerTodos, obtenerClave: () => clave })); propia.use(noEncontrado); propia.use(errorHandler);
    expect((await request(propia).get('/red/pacientes?texto=Pa')).status).toBe(401);
    const falso = jwt.sign({ institucion: 'odontologia', rol: 'odontologo' }, 'clave-ajena');
    expect((await request(propia).get('/red/pacientes?texto=Pa').set('Authorization', `Bearer ${falso}`)).status).toBe(401);
    expect(obtenerTodos).not.toHaveBeenCalled();
  });
  it('rechaza expiración, audiencia incorrecta, rol cruzado y campos extra', async () => {
    for (const opciones of [{ expiresIn: '-1s' }, { audience: 'otra' }]) {
      expect((await request(app).get('/red/pacientes?texto=Pa').set('Authorization', `Bearer ${firma('odontologia', 'odontologo', opciones)}`)).status).toBe(401);
    }
    expect((await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'pediatra')).status).toBe(403);
    for (const ruta of ['/red/pacientes', '/red/pacientes?texto=Pa&institucion=hospital', '/red/desconocida/pacientes/abc/historial', '/red/hospital/pacientes/a.b/historial']) {
      expect((await autorizar(request(app).get(ruta), 'odontologia', 'odontologo')).status).toBe(400);
    }
    expect(obtenerTodos).not.toHaveBeenCalled();
  });
  it('acepta token Hospital firmado de su login actual sin inventar iss/sub', async () => {
    const token = jwt.sign({ institucion: 'hospital', rol: 'admin' }, clave, { expiresIn: '1h' });
    expect((await request(app).get('/red/pacientes?texto=Pa').set('Authorization', `Bearer ${token}`)).status).toBe(200);
  });
  it.each(perfiles.filter(([i]) => i !== 'odontologia'))('el rol de %s no puede escribir en rutas dentales', async (institucion, rol) => {
    expect((await autorizar(request(app).post('/odontologia/citas'), institucion, rol).send({ pacienteId: '7' })).status).toBe(403);
    expect(obtenerTodos).not.toHaveBeenCalled();
  });
  it('valida todas las respuestas y no presenta un contrato roto como disponible', async () => {
    repos.hospital.listarPacientes.mockResolvedValue({ items: [], total: '1' });
    const res = await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'odontologo');
    expect(res.body.resultados[0].estado).toBe('no_disponible');
  });
  it('detecta la dependencia del mapper pediátrico actual sin reescribirlo ni inventar nombres', async () => {
    const anterior = pacientePediatria({ id_paciente: 1, nombres: 'Paciente', apellidos: 'Prueba', fecha_nacimiento: '2000-01-01' });
    repos.pediatria.listarPacientes.mockResolvedValue({ items: [anterior], total: 1 });
    const res = await autorizar(request(app).get('/red/pacientes?texto=Pa'), 'odontologia', 'odontologo');
    expect(res.status).toBe(200);
    expect(res.body.resultados.find((r) => r.institucion === 'pediatria').estado).toBe('no_disponible');
    expect(anterior.nombre).toBeUndefined();
  });
});

describe('I2-02 · aplicación sin HTTP ni drivers', () => {
  it('solo usa los dos métodos de lectura permitidos', async () => {
    const llamadas = [];
    const repo = new Proxy({}, { get: (_, metodo) => {
      llamadas.push(metodo);
      if (metodo === 'listarPacientes') return async () => ({ items: [], total: 0 });
      if (metodo === 'obtenerHistorial') return async () => expediente;
      throw new Error('Operación no autorizada');
    } });
    const repos = Object.fromEntries(institucionesRed.map((i) => [i, repo]));
    await buscarEnRed(repos, { texto: 'Pa' });
    await obtenerHistorialEnRed(repos, 'odontologia', '7');
    expect(new Set(llamadas)).toEqual(new Set(['listarPacientes', 'obtenerHistorial']));
  });
});
