import { afterEach, expect, it, vi } from 'vitest';

vi.mock('node:child_process', () => ({ execSync: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

it.each(['feat/I2-11-mejoras-frontend', 'fix/I3-09-auditoria-integracion'])('el CI de %s publica diagnóstico sin fusionar un PR Open', async (rama) => {
  for (const [nombre, valor] of Object.entries({ GH_TOKEN: 'fixture-local', GITHUB_REPOSITORY: 'fixture/repo',
    PR_NUMBER: '1', PR_TITLE: '[I3-09] Auditoría', PR_HEAD_REF: rama,
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
