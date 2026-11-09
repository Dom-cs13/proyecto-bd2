import { afterEach, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it('el CI de la rama I2-11 publica diagnóstico sin intentar fusionar un PR Open', async () => {
  for (const [nombre, valor] of Object.entries({ GH_TOKEN: 'fixture-local', GITHUB_REPOSITORY: 'fixture/repo',
    PR_NUMBER: '1', PR_TITLE: '[I2-11] Frontend', PR_HEAD_REF: 'feat/I2-11-mejoras-frontend',
    PR_IS_DRAFT: 'false', BASE_SHA: '', HEAD_SHA: '', RESULT_REGLAS: 'success', RESULT_SECRETOS: 'success', RESULT_CALIDAD: 'success' })) vi.stubEnv(nombre, valor);
  const solicitar = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => [] }).mockResolvedValueOnce({ ok: true });
  vi.stubGlobal('fetch', solicitar);
  await import('../../scripts/notificar-pr.js');
  expect(solicitar).toHaveBeenCalledTimes(2);
  expect(solicitar.mock.calls.map(([url]) => url).every((url) => !url.includes('/merge'))).toBe(true);
  expect(JSON.parse(solicitar.mock.calls[1][1].body).body).toContain('fusión manual');
  const { execSync } = await import('node:child_process');
  expect(execSync).not.toHaveBeenCalled();
});
