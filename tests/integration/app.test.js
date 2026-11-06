import { describe, expect, test } from 'vitest';
import request from 'supertest';
import { crearApp } from '../../src/app.js';

describe('App base · formato de error único', () => {
  const app = crearApp();

  test('una ruta inexistente responde 404 con { error: { codigo, mensaje } }', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { codigo: 'RUTA_NO_EXISTE', mensaje: expect.any(String) } });
  });

  test('un JSON mal formado responde 400', async () => {
    const res = await request(app).post('/pacientes').set('Content-Type', 'application/json').send('{mal');
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe('JSON_INVALIDO');
  });

  test('POST /auth/login emite un token JWT con la institucion', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ institucion: 'hospital', usuario: 'dr.palma', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
