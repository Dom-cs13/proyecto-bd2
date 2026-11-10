import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { apiClient } from '../../frontend/shared/js/api/client.js';
import { login, obtenerSesion, rutaInstitucion } from '../../frontend/shared/js/api/auth.js';

beforeEach(() => {
  const datos = new Map();
  vi.stubGlobal('sessionStorage', {
    getItem: (key) => datos.get(key) ?? null,
    setItem: (key, value) => datos.set(key, value),
    removeItem: (key) => datos.delete(key),
  });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

describe('Login y sesion institucional del frontend', () => {
  test.each(['hospital', 'odontologia', 'laboratorio', 'pediatria'])('abre el portal de %s con la sesion del servidor', async (institucion) => {
    const payload = btoa(JSON.stringify({ institucion, rol: 'profesional', exp: Math.floor(Date.now() / 1000) + 3600 }));
    const token = `header.${payload}.signature`;
    fetch.mockResolvedValue(new Response(JSON.stringify({ token })));
    const sesion = await login({ institucion, usuario: 'usuario', password: 'prueba' });
    expect(sesion.institucion).toBe(institucion);
    expect(rutaInstitucion(sesion.institucion)).toBe(`${institucion}/index.html`);
    expect(sessionStorage.getItem('token')).toBe(token);
  });

  test.each([401, 404, 503])('un error %s no crea una sesion ficticia', async (status) => {
    fetch.mockResolvedValue(new Response(JSON.stringify({ error: { mensaje: 'Acceso no disponible' } }), { status }));
    await expect(login({ institucion: 'pediatria', usuario: 'usuario', password: 'prueba' })).rejects.toThrow('Acceso no disponible');
    expect(obtenerSesion()).toBeNull();
  });

  test('sin backend no permite entrar', async () => {
    fetch.mockRejectedValue(new TypeError('fetch failed'));
    await expect(login({ institucion: 'hospital' })).rejects.toThrow();
    expect(obtenerSesion()).toBeNull();
  });

  test('un 401 limpia el token sin iniciar sesion en otra institucion', async () => {
    sessionStorage.setItem('token', 'token-caducado');
    fetch.mockResolvedValue(new Response('', { status: 401 }));
    const res = await apiClient('/pacientes', { headers: { 'X-Prueba': 'si' } });
    expect(res.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ Authorization: 'Bearer token-caducado', 'X-Prueba': 'si' });
    expect(sessionStorage.getItem('token')).toBeNull();
  });

  test('rechaza una respuesta de login sin token', async () => {
    fetch.mockResolvedValue(new Response('{}'));
    await expect(login({ institucion: 'hospital' })).rejects.toThrow('sesion valida');
    expect(obtenerSesion()).toBeNull();
  });
});
