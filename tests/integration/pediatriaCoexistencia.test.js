import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { crearRouterOdontologia } from '../../src/interfaces/http/routes/odontologiaPacientes.js';
import { crearRouterPediatria } from '../../src/interfaces/http/routes/pediatriaPacientes.js';
import { errorHandler, noEncontrado } from '../../src/interfaces/http/middleware/errorHandler.js';

const clave = 'clave-coexistencia-pediatria-odontologia';

const token = (institucion, rol = 'recepcion') =>
  jwt.sign({ institucion, rol }, clave, {
    subject: '1',
    expiresIn: '1h',
    issuer: 'red-salud',
    audience: 'red-salud-web',
  });

describe('Estabilización · Coexistencia entre Odontología y Pediatría', () => {
  let app;
  let repoOdonto;
  let repoPedia;

  beforeEach(() => {
    repoOdonto = {
      listarPacientes: vi.fn().mockResolvedValue({ items: [{ id: '1', institucion: 'odontologia' }], total: 1 }),
      obtenerPaciente: vi.fn().mockResolvedValue({ id: '1', institucion: 'odontologia' }),
    };
    repoPedia = {
      listarPacientes: vi.fn().mockResolvedValue({ items: [{ id: '2', institucion: 'pediatria' }], total: 1 }),
      obtenerPaciente: vi.fn().mockResolvedValue({ id: '2', institucion: 'pediatria' }),
    };

    app = express();
    app.use(express.json());

    // Se montan ambos routers exactamente como en src/app.js
    app.use(crearRouterOdontologia({
      obtenerRepositorio: () => repoOdonto,
      obtenerClave: () => clave,
    }));
    app.use(crearRouterPediatria({
      obtenerRepositorio: () => repoPedia,
      obtenerClave: () => clave,
    }));

    app.use(noEncontrado);
    app.use(errorHandler);
  });

  it('un token de odontología es atendido por el router odontológico', async () => {
    const res = await request(app)
      .get('/pacientes')
      .set('Authorization', `Bearer ${token('odontologia', 'secretaria')}`);

    expect(res.status).toBe(200);
    expect(res.body.items[0].institucion).toBe('odontologia');
    expect(repoOdonto.listarPacientes).toHaveBeenCalledOnce();
    expect(repoPedia.listarPacientes).not.toHaveBeenCalled();
  });

  it('un token de pediatría pasa a través de odontología y es atendido por pediatría', async () => {
    const res = await request(app)
      .get('/pacientes')
      .set('Authorization', `Bearer ${token('pediatria', 'recepcion')}`);

    expect(res.status).toBe(200);
    expect(res.body.items[0].institucion).toBe('pediatria');
    expect(repoPedia.listarPacientes).toHaveBeenCalledOnce();
    expect(repoOdonto.listarPacientes).not.toHaveBeenCalled();
  });

  it('un token con institución desconocida no es atendido por ninguno (404/401)', async () => {
    const tokenExt = token('otra_institucion', 'admin');
    const res = await request(app)
      .get('/pacientes')
      .set('Authorization', `Bearer ${tokenExt}`);

    expect([401, 403, 404]).toContain(res.status);
  });
});
