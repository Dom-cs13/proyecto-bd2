import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';

afterEach(() => vi.unstubAllEnvs());

describe('Regresión de accesos institucionales', () => {
  it.each(['/pacientes', '/polizas', '/doctores', '/laboratorios', '/laboratorio/ordenes'])('rechaza lectura anónima de %s', async (ruta) => {
    expect((await request(crearApp()).get(ruta)).status).toBe(401);
  });
  it.each(['firma-ajena', 'caducado', 'sin-expiracion'])('rechaza JWT %s antes de resolver un motor', async (tipo) => {
    vi.stubEnv('JWT_SECRET', 'clave-prueba-aislada');
    const token = jwt.sign({ institucion: 'hospital', rol: 'admin' }, tipo === 'firma-ajena' ? 'otra-clave' : process.env.JWT_SECRET,
      tipo === 'sin-expiracion' ? {} : { expiresIn: tipo === 'caducado' ? -1 : 3600 });
    expect((await request(crearApp()).get('/pacientes').auth(token, { type: 'bearer' })).status).toBe(401);
  });
  it('no emite un token de Hospital con credenciales arbitrarias', async () => {
    vi.stubEnv('HOSPITAL_AUTH_USUARIOS', '');
    const res = await request(crearApp()).post('/auth/login').send({ institucion: 'hospital', usuario: 'inventado', password: 'inventada' });
    expect([401, 503]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });
  it('no permite las cuentas demo implícitas de Laboratorio', async () => {
    vi.stubEnv('LABORATORIO_AUTH_USUARIOS', '');
    const res = await request(crearApp()).post('/auth/login').send({ institucion: 'laboratorio', usuario: 'inventado', password: 'demo' });
    expect([401, 503]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });
  it('prohíbe escritura especializada desde otra institución', async () => {
    vi.stubEnv('JWT_SECRET', 'clave-prueba-aislada');
    const token = jwt.sign({ institucion: 'hospital', rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    expect((await request(crearApp()).post('/laboratorio/ordenes').auth(token, { type: 'bearer' }).send({})).status).toBe(403);
  });
});
