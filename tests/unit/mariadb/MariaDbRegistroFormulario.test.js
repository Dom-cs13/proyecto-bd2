import { expect, it, vi } from 'vitest';
import { MariaDbAdapter } from '../../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';
import { pacientePediatria } from '../../../src/interfaces/http/validators/pediatria.js';

it('guarda el tutor con nombre completo del formulario aunque no haya apellidos separados', async () => {
  const conn = { query: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce({ insertId: 1 }).mockResolvedValueOnce([])
    .mockResolvedValueOnce([]).mockResolvedValueOnce({ insertId: 2 }).mockResolvedValueOnce([]).mockResolvedValueOnce([]), release: vi.fn() };
  const repo = new MariaDbAdapter({ getConnection: async () => conn });
  const datos = pacientePediatria.parse({ nombre: 'Menor', apellidos: 'Prueba', genero: 'Masculino', fechaNacimiento: '2020-01-01',
    documentoIdentidad: 'FICTICIO', detallesInstitucion: { tutorPrincipal: { nombre: 'Nombre Completo Tutor', documento: 'TUTOR', parentesco: 'Madre', telefono: '12345678' } } });
  await repo.crearPaciente(datos);
  expect(conn.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO tutor'))).toBe(true);
  const insercion = conn.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO tutor'));
  expect(insercion[1].slice(0, 3)).toEqual(['TUTOR', 'Nombre Completo Tutor', '']);
  expect(conn.query).toHaveBeenCalledWith('COMMIT');
});

it('no responde éxito descartando la identidad ante un esquema incompatible', async () => {
  const conn = { query: vi.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(Object.assign(new Error('Columna desconocida'), { code: 'ER_BAD_FIELD_ERROR', errno: 1054 }))
    .mockResolvedValue([]), release: vi.fn() };
  const repo = new MariaDbAdapter({ getConnection: async () => conn });
  await expect(repo.crearPaciente({ documentoIdentidad: 'FICTICIO', nombre: 'Menor', apellidos: 'Prueba', fechaNacimiento: '2020-01-01' })).rejects.toMatchObject({ status: 503 });
  expect(conn.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO paciente'))).toHaveLength(1);
  expect(conn.query).toHaveBeenCalledWith('ROLLBACK');
});
