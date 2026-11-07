import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearRouterOdontologia } from '../../src/interfaces/http/routes/odontologiaPacientes.js';
import { errorHandler, noEncontrado } from '../../src/interfaces/http/middleware/errorHandler.js';

const clave = 'clave-ficticia-pruebas-coexistencia';
const token = (institucion, opciones = {}) => jwt.sign({ institucion, rol: 'secretaria' }, clave, {
  subject: '7', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web', ...opciones,
});

describe('Estabilización · router odontológico compuesto con rutas posteriores', () => {
  let app, resolver, otro;
  beforeEach(() => {
    resolver = vi.fn(() => ({ listarPacientes: vi.fn().mockResolvedValue({ items: [], total: 0 }) }));
    otro = vi.fn();
    app = express(); app.use(express.json());
    // Simula req.user precargado por el middleware global propuesto en PR #23.
    app.use((req, res, next) => { req.user = { institucion: 'odontologia', rol: 'secretaria' }; next(); });
    app.use(crearRouterOdontologia({ obtenerRepositorio: resolver, obtenerClave: () => clave }));
    app.all(['/pacientes', '/pacientes/7', '/consultas', '/diagnosticos/8/tratamientos'], (req, res) => {
      otro();
      try {
        const usuario = jwt.verify(req.get('authorization')?.slice(7) ?? '', clave);
        if (!['hospital', 'laboratorio', 'pediatria'].includes(usuario.institucion)) return res.sendStatus(403);
        return res.json({ institucion: usuario.institucion });
      } catch { return res.sendStatus(401); }
    });
    app.get('/pacientes/7/extension-posterior', (req, res) => res.json({ extension: true }));
    app.use(noEncontrado); app.use(errorHandler);
  });
  it.each(['hospital', 'laboratorio', 'pediatria'])('deja continuar al router posterior de %s', async (institucion) => {
    const res = await request(app).get('/pacientes').set('Authorization', `Bearer ${token(institucion)}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ institucion });
    expect(otro).toHaveBeenCalledOnce();
    expect(resolver).not.toHaveBeenCalled();
  });
  it('un token dental válido solo usa el repositorio dental', async () => {
    expect((await request(app).get('/pacientes').set('Authorization', `Bearer ${token('odontologia')}`)).status).toBe(200);
    expect(resolver).toHaveBeenCalledWith('odontologia');
    expect(otro).not.toHaveBeenCalled();
  });
  it('no toma req.user precargado como autenticación', async () => {
    const falso = jwt.sign({ institucion: 'odontologia', rol: 'secretaria' }, 'clave-incorrecta');
    expect((await request(app).get('/pacientes').set('Authorization', `Bearer ${falso}`)).status).toBe(401);
    expect(resolver).not.toHaveBeenCalled();
    expect(otro).not.toHaveBeenCalled();
  });
  it('decodificar un destino ajeno no autoriza ninguna escritura', async () => {
    const falso = jwt.sign({ institucion: 'laboratorio', rol: 'secretaria' }, 'clave-incorrecta');
    expect((await request(app).post('/pacientes').set('Authorization', `Bearer ${falso}`).send({})).status).toBe(401);
    expect(resolver).not.toHaveBeenCalled();
  });
  it('no intercepta extensiones ni métodos que no implementa', async () => {
    expect((await request(app).get('/pacientes/7/extension-posterior')).body).toEqual({ extension: true });
    expect((await request(app).delete('/pacientes/7').set('Authorization', `Bearer ${token('laboratorio')}`)).status).toBe(200);
    expect(resolver).not.toHaveBeenCalled();
  });
  it.each(['', '0', '-1', '2147483648', 'constructor'])('rechaza sujeto dental inválido %s antes del repositorio', async (subject) => {
    const res = await request(app).get('/pacientes').set('Authorization', `Bearer ${token('odontologia', { subject })}`);
    expect(res.status).toBe(401);
    expect(resolver).not.toHaveBeenCalled();
  });
  it('la ruta institucional no se cede a tokens de otras instituciones', async () => {
    const res = await request(app).get('/odontologia/status').set('Authorization', `Bearer ${token('laboratorio')}`);
    expect(res.status).toBe(403);
    expect(resolver).not.toHaveBeenCalled();
  });
});
