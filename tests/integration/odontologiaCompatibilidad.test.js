import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { crearApp } from '../../src/app.js';
import { MotorNoDisponible } from '../../src/domain/errores.js';

const hospital = vi.hoisted(() => ({ listarPacientes: vi.fn() }));
vi.mock('../../src/infrastructure/config/RepositoryFactory.js', () => ({
  obtenerRepositorio: () => hospital,
}));
const clave = 'clave-ficticia-compatibilidad-main';
const token = (institucion, rol) => jwt.sign({ institucion, rol }, clave, {
  subject: '1', expiresIn: '1h', issuer: 'red-salud', audience: 'red-salud-web',
});

describe('Odontología · composición de los routers actuales de main', () => {
  let app, odonto, pedia;
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', clave);
    hospital.listarPacientes.mockReset().mockResolvedValue({ items: [{ id: 'H' }], total: 1 });
    odonto = { listarPacientes: vi.fn().mockResolvedValue({ items: [{ id: 'O' }], total: 1 }), obtenerAgenda: vi.fn().mockResolvedValue({ items: [] }) };
    pedia = { listarPacientes: vi.fn().mockResolvedValue({ items: [{ id: 'P' }], total: 1 }) };
    app = crearApp({ odontologia: { obtenerRepositorio: () => odonto, obtenerClave: () => clave },
      pediatria: { obtenerRepositorio: () => pedia, obtenerClave: () => clave } });
  });
  it.each([['hospital', 'admin', 'H'], ['pediatria', 'recepcion', 'P'], ['odontologia', 'secretaria', 'O']])(
    'la ruta compartida sigue llegando al router real de %s', async (institucion, rol, id) => {
      const res = await request(app).get('/pacientes').set('Authorization', `Bearer ${token(institucion, rol)}`);
      expect(res.status).toBe(200); expect(res.body.items[0].id).toBe(id);
      if (institucion !== 'odontologia') expect(odonto.listarPacientes).not.toHaveBeenCalled();
    });
  it('Hospital y Pediatría caídos no afectan agenda ni pacientes dentales', async () => {
    hospital.listarPacientes.mockRejectedValue(new MotorNoDisponible('hospital'));
    pedia.listarPacientes.mockRejectedValue(new MotorNoDisponible('pediatria'));
    for (const [institucion, rol] of [['hospital', 'admin'], ['pediatria', 'recepcion']]) {
      expect((await request(app).get('/pacientes').set('Authorization', `Bearer ${token(institucion, rol)}`)).status).toBe(503);
    }
    for (const ruta of ['/pacientes', '/odontologia/agenda?fecha=2026-11-10']) {
      expect((await request(app).get(ruta).set('Authorization', `Bearer ${token('odontologia', 'secretaria')}`)).status).toBe(200);
    }
  });
  it('Odontología caída no afecta a Hospital ni Pediatría', async () => {
    odonto.listarPacientes.mockRejectedValue(new MotorNoDisponible('odontologia'));
    expect((await request(app).get('/pacientes').set('Authorization', `Bearer ${token('odontologia', 'secretaria')}`)).status).toBe(503);
    for (const [institucion, rol] of [['hospital', 'admin'], ['pediatria', 'recepcion']]) {
      expect((await request(app).get('/pacientes').set('Authorization', `Bearer ${token(institucion, rol)}`)).status).toBe(200);
    }
  });
});
