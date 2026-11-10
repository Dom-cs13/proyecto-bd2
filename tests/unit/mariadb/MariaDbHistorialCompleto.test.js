import { expect, it, vi } from 'vitest';
import { MariaDbAdapter } from '../../../src/infrastructure/adapters/mariadb/MariaDbAdapter.js';

it('recupera todas las recetas y los detalles de cada consulta con fechas ISO', async () => {
  const recetas = [{ id_receta: 11, id_consulta: 1 }, { id_receta: 12, id_consulta: 1 }];
  const conn = { release: vi.fn(), query: vi.fn(async (sql, parametros) => {
    if (sql.includes('FROM historial_clinico')) return [{ id_historial: 1, id_paciente: 1, estado: 'activo' }];
    if (sql.includes('FROM consulta')) return [{ id_consulta: 1, id_paciente: 1 }, { id_consulta: 2, id_paciente: 1 }];
    if (sql.includes('FROM diagnostico')) return parametros[0] === '1' ? [{ id_diagnostico: 4, descripcion: 'Diagnóstico ficticio' }] : [];
    if (sql.includes('FROM tratamiento')) return [{ id_tratamiento: 5, descripcion: 'Tratamiento ficticio', fecha_inicio: new Date('2026-01-01T00:00:00Z') }];
    if (sql.includes('FROM detalle_receta')) return [{ id_detalle_receta: parametros[0], id_medicamento: 7, nombre_medicamento: 'Medicamento ficticio', dosis: 'Dosis de prueba' }];
    if (sql.includes('FROM receta')) return parametros[0] === '1' ? (sql.includes('LIMIT 1') ? recetas.slice(0, 1) : recetas) : [];
    throw new Error('Consulta no esperada en prueba');
  }) };
  const repo = new MariaDbAdapter({ getConnection: async () => conn });
  vi.spyOn(repo, 'obtenerPaciente').mockResolvedValue({ id: '1', nombre: 'Paciente', apellidos: 'Ficticio' });
  const historial = await repo.obtenerHistorial('1');
  expect(historial.consultas[0].diagnosticos[0].tratamientos[0].fechaInicio).toBe('2026-01-01');
  expect(historial.consultas[0].recetas).toHaveLength(2);
  expect(historial.consultas[0].recetas[1].medicamentos[0].nombre).toBe('Medicamento ficticio');
  expect(historial.consultas[1].diagnosticos).toEqual([]);
  expect(historial.consultas[1].recetas).toEqual([]);
  expect(conn.query.mock.calls.every(([sql]) => /^SELECT/.test(sql.trim()))).toBe(true);
});
