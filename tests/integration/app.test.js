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
});
