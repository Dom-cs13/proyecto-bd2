import { afterEach, expect, it, vi } from 'vitest';
vi.mock('mariadb', () => ({ default: { createPool: vi.fn(opciones => opciones) } }));
import { crearPoolMariaDb } from '../../../src/infrastructure/adapters/mariadb/connection.js';
afterEach(() => vi.unstubAllEnvs());
it('TLS de MariaDB verifica certificados por defecto', () => {
  vi.stubEnv('MARIADB_SSL_REJECT_UNAUTHORIZED', '');
  expect(crearPoolMariaDb({ host: 'localhost', user: 'ficticio', database: 'ficticia', ssl: true }).ssl).toEqual({ rejectUnauthorized: true });
});
it('MariaDB local sin TLS exige configuración explícita', () => {
  expect(crearPoolMariaDb({ host: 'localhost', user: 'ficticio', database: 'ficticia', ssl: false }).ssl).toBeUndefined();
});
