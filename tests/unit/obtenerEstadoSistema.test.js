import { describe, it, expect, vi } from 'vitest';
import { obtenerEstadoSistema } from '../../src/application/useCases/obtenerEstadoSistema.js';
import { SystemStatusSchema } from '../../src/domain/entities/sistema.js';

describe('I1-08 · Caso de uso obtenerEstadoSistema', () => {
  it('reporta todos los motores conectados cuando responden ping exitosamente', async () => {
    const repos = {
      hospital: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'MongoDB Atlas', latenciaMs: 14 }) },
      odontologia: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'postgresql', latenciaMs: 28 }) },
      laboratorio: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'firestore', latenciaMs: 35 }) },
      pediatria: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 8 }) },
    };

    const resultado = await obtenerEstadoSistema(repos);

    expect(SystemStatusSchema.safeParse(resultado).success).toBe(true);
    expect(resultado.motores.hospital).toEqual({ estado: 'conectado', motor: 'mongodb', latenciaMs: 14 });
    expect(resultado.motores.odontologia).toEqual({ estado: 'conectado', motor: 'postgresql', latenciaMs: 28 });
    expect(resultado.motores.laboratorio).toEqual({ estado: 'conectado', motor: 'firestore', latenciaMs: 35 });
    expect(resultado.motores.pediatria).toEqual({ estado: 'conectado', motor: 'mariadb', latenciaMs: 8 });
  });

  it('aísla fallos de motor marcando desconectado sin fallar los demás', async () => {
    const repos = {
      hospital: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mongodb', latenciaMs: 12 }) },
      odontologia: { ping: vi.fn().mockRejectedValue(new Error('Conexión rehusada')) },
      laboratorio: { ping: vi.fn().mockResolvedValue({ ok: false, motor: 'firestore', latenciaMs: 40 }) },
      pediatria: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 5 }) },
    };

    const resultado = await obtenerEstadoSistema(repos);

    expect(SystemStatusSchema.safeParse(resultado).success).toBe(true);
    expect(resultado.motores.hospital.estado).toBe('conectado');
    expect(resultado.motores.odontologia).toEqual({ estado: 'desconectado', motor: 'postgresql', latenciaMs: null });
    expect(resultado.motores.laboratorio).toEqual({ estado: 'desconectado', motor: 'firestore', latenciaMs: null });
    expect(resultado.motores.pediatria.estado).toBe('conectado');
  });

  it('marca como desconectado si un repositorio tarda más que el timeout configurado', async () => {
    const repos = {
      hospital: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mongodb', latenciaMs: 5 }) },
      odontologia: { ping: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100))) },
      laboratorio: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'firestore', latenciaMs: 10 }) },
      pediatria: { ping: vi.fn().mockResolvedValue({ ok: true, motor: 'mariadb', latenciaMs: 4 }) },
    };

    const resultado = await obtenerEstadoSistema(repos, { timeoutMs: 20 });

    expect(resultado.motores.odontologia.estado).toBe('desconectado');
    expect(resultado.motores.hospital.estado).toBe('conectado');
  });

  it('maneja repositorios no registrados o nulos sin lanzar excepción', async () => {
    const resultado = await obtenerEstadoSistema({});

    expect(SystemStatusSchema.safeParse(resultado).success).toBe(true);
    expect(resultado.motores.hospital.estado).toBe('desconectado');
    expect(resultado.motores.odontologia.estado).toBe('desconectado');
    expect(resultado.motores.laboratorio.estado).toBe('desconectado');
    expect(resultado.motores.pediatria.estado).toBe('desconectado');
  });
});
