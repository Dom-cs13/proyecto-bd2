import { describe, expect, it, vi } from 'vitest';
import { crearApiPediatria } from '../../frontend/shared/js/api/pediatria.js';

describe('I4-10/I4-11 · Cliente HTTP Pediatría', () => {
  const sesion = () => ({
    institucion: 'pediatria',
    rol: 'pediatra',
    token: 'token-ficticio-pediatria',
  });

  it('envía bearer, JSON y filtros mediante el cliente compartido', async () => {
    const cliente = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });
    const api = crearApiPediatria({ cliente, sesion });

    await api.listar({ texto: 'Mateo Morales', pagina: 1, estado: 'activo' });
    expect(cliente).toHaveBeenCalledWith(
      '/pacientes?texto=Mateo+Morales&pagina=1&estado=activo',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-ficticio-pediatria',
        },
      }),
    );
  });

  it('permite registrar control de crecimiento y vacuna', async () => {
    const cliente = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '1' }),
    });
    const api = crearApiPediatria({ cliente, sesion });

    await api.crecimiento('10', { pesoKg: 12.5, tallaCm: 88.0 });
    expect(cliente).toHaveBeenCalledWith(
      '/pacientes/10/crecimiento',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ pesoKg: 12.5, tallaCm: 88.0 }),
      }),
    );

    await api.vacuna('10', { vacunaId: '1', numeroDosis: 1 });
    expect(cliente).toHaveBeenCalledWith(
      '/pacientes/10/vacunas',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ vacunaId: '1', numeroDosis: 1 }),
      }),
    );
  });

  it.each([null, { institucion: 'odontologia', token: 'otro' }])(
    'no llama a la API si no hay sesión pediátrica activa %#',
    async (actual) => {
      const cliente = vi.fn();
      await expect(
        crearApiPediatria({ cliente, sesion: () => actual }).listar(),
      ).rejects.toMatchObject({ status: 401 });
      expect(cliente).not.toHaveBeenCalled();
    },
  );

  it('cierra sesión ante 401 y propaga el error con status', async () => {
    const alExpirar = vi.fn();
    const cliente = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { codigo: 'NO_AUTENTICADO', mensaje: 'Sesión terminada' } }),
    });
    await expect(
      crearApiPediatria({ cliente, sesion, alExpirar }).listar(),
    ).rejects.toMatchObject({ status: 401, codigo: 'NO_AUTENTICADO' });
    expect(alExpirar).toHaveBeenCalledOnce();
  });

  it('propaga 503 sin cerrar la sesión', async () => {
    const alExpirar = vi.fn();
    const cliente = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: { mensaje: 'Motor no disponible' } }),
    });
    await expect(
      crearApiPediatria({ cliente, sesion, alExpirar }).listar(),
    ).rejects.toMatchObject({ status: 503 });
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('impide construir rutas con identificadores manipulados', () => {
    expect(() => crearApiPediatria({ sesion }).historial('../hospital')).toThrow('identificador');
  });

  it.each([true, [], null])(
    'rechaza respuestas exitosas que no contienen un objeto de API válido %#',
    async (cuerpo) => {
      const cliente = vi.fn().mockResolvedValue({ ok: true, json: async () => cuerpo });
      await expect(crearApiPediatria({ cliente, sesion }).listar()).rejects.toThrow('respuesta inválida');
    },
  );
});
