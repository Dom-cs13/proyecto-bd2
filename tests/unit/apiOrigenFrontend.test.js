import { afterEach, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it.each([undefined, 'http://127.0.0.1:3000'])('la API conserva el origen de Express salvo base explícita %s', async (base) => {
  vi.resetModules();
  vi.stubGlobal('location', { protocol: 'http:', hostname: '127.0.0.1', port: '45678' });
  vi.stubGlobal('ALBA_API_BASE', base);
  const solicitar = vi.fn().mockResolvedValue(new Response('{}'));
  vi.stubGlobal('fetch', solicitar);
  vi.stubGlobal('sessionStorage', { getItem: () => null });
  const { apiClient } = await import('../../frontend/shared/js/api/client.js');
  await apiClient('/pacientes');
  expect(solicitar.mock.calls[0][0]).toBe(base ? `${base}/pacientes` : '/pacientes');
});
