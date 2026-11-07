import { describe, expect, it } from 'vitest';
import { crearPoolPostgres } from '../../../src/infrastructure/adapters/postgresql/connection.js';

describe('Pool odontológico · configuración sin abrir conexiones', () => {
  it('configura TLS y mantiene DATE como día sin zona horaria', async () => {
    const pool = crearPoolPostgres({ connectionString: 'postgresql://pruebas@localhost/ficticia' });
    try {
      expect(pool.options.ssl).toEqual({ rejectUnauthorized: true });
      expect(pool.options.types.getTypeParser(1082)('2000-01-01')).toBe('2000-01-01');
      expect(pool.options.types.getTypeParser(23)('7')).toBe(7);
      expect(() => pool.emit('error', new Error('Error simulado de cliente inactivo'))).not.toThrow();
      expect(pool.totalCount).toBe(0);
    } finally { await pool.end(); }
  });
  it('permite desactivar TLS explícitamente para un entorno local controlado', async () => {
    const pool = crearPoolPostgres({ connectionString: 'postgresql://pruebas@localhost/ficticia', ssl: false });
    expect(pool.options.ssl).toBe(false);
    await pool.end();
  });
});
