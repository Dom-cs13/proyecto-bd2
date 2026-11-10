import { afterEach, expect, it, vi } from 'vitest';
const pool = vi.hoisted(() => vi.fn(() => ({})));
vi.mock('../../src/infrastructure/adapters/postgresql/connection.js', () => ({ crearPoolPostgres: pool }));
vi.mock('../../src/infrastructure/adapters/postgresql/PostgresAdapter.js', () => ({ PostgresAdapter: class {} }));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });
it.each([['', true], ['true', true], ['false', false]])('la fábrica odontológica respeta TLS explícito %s y verifica certificados por defecto', async (valor, esperado) => {
  vi.stubEnv('PGSSL_REJECT_UNAUTHORIZED', valor);
  const { obtenerRepositorio } = await import('../../src/infrastructure/config/odontologiaRepositoryFactory.js');
  obtenerRepositorio('odontologia');
  expect(pool).toHaveBeenCalledWith({ ssl: { rejectUnauthorized: esperado } });
});
