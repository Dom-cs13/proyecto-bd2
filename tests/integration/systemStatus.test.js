import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { crearApp } from '../../src/app.js';
import { SystemStatusSchema } from '../../src/domain/entities/sistema.js';

describe('I1-08 · Integración HTTP GET /system/status', () => {
  it('responde 200 con la estructura oficial del contrato para el panel técnico', async () => {
    const repositorios = {
      hospital: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mongodb', latenciaMs: 14 }) },
      odontologia: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'postgresql', latenciaMs: 28 }) },
      laboratorio: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'firestore', latenciaMs: 35 }) },
      pediatria: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 8 }) },
    };

    const app = crearApp({
      status: {
        obtenerRepositorios: () => repositorios,
      },
    });

    const res = await request(app).get('/system/status');

    expect(res.status).toBe(200);
    expect(SystemStatusSchema.safeParse(res.body).success).toBe(true);
    expect(res.body.motores).toEqual({
      hospital: { estado: 'conectado', motor: 'mongodb', latenciaMs: 14 },
      odontologia: { estado: 'conectado', motor: 'postgresql', latenciaMs: 28 },
      laboratorio: { estado: 'conectado', motor: 'firestore', latenciaMs: 35 },
      pediatria: { estado: 'conectado', motor: 'mariadb', latenciaMs: 8 },
    });
  });

  it('no filtra credenciales, contraseñas ni cadenas de conexión en la respuesta', async () => {
    const repositorios = {
      hospital: { ping: vi.fn().mockRejectedValue(new Error('mongodb://usuario:supersecreto@cluster.mongodb.net/bd')) },
      odontologia: { ping: vi.fn().mockRejectedValue(new Error('postgres://admin:password123@supabase.com:5432')) },
      laboratorio: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'firestore', latenciaMs: 15 }) },
      pediatria: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 5 }) },
    };

    const app = crearApp({
      status: {
        obtenerRepositorios: () => repositorios,
      },
    });

    const res = await request(app).get('/system/status');

    expect(res.status).toBe(200);
    const textoRespuesta = JSON.stringify(res.body);
    expect(textoRespuesta).not.toContain('supersecreto');
    expect(textoRespuesta).not.toContain('password123');
    expect(textoRespuesta).not.toContain('mongodb://');
    expect(textoRespuesta).not.toContain('postgres://');
  });
});
