import { scryptSync } from 'node:crypto';
import { vi } from 'vitest';

export function configurarCuenta(institucion, usuario, rol, password = 'password-de-prueba') {
  const sal = '0'.repeat(32);
  const hash = scryptSync(password, sal, 64).toString('hex');
  vi.stubEnv('JWT_SECRET', 'clave-exclusiva-pruebas-locales');
  vi.stubEnv(`${institucion.toUpperCase()}_AUTH_USUARIOS`, JSON.stringify([
    { id: '1', usuario, rol, passwordHash: `scrypt$${sal}$${hash}` },
  ]));
}
