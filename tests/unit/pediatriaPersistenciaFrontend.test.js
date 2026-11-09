import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../frontend/shared/js/api/pediatria.js', () => ({ apiPediatria: { registrar: vi.fn(), archivar: vi.fn(), crecimiento: vi.fn(), vacuna: vi.fn(), catalogos: vi.fn() } }));
import { apiPediatria } from '../../frontend/shared/js/api/pediatria.js';
import { store } from '../../frontend/pediatria/js/state.js';
afterEach(() => { vi.resetAllMocks(); store.pacientes = []; });
describe('Pediatría · interfaz conectada sin éxitos locales', () => {
  it('inicia sin pacientes de demostración', () => expect(store.pacientes).toEqual([]));
  it('no anuncia un alta si MariaDB rechaza la operación', async () => {
    apiPediatria.registrar.mockRejectedValue(new Error('Motor caído'));
    await expect(store.agregarPaciente({ nombre: 'Prueba' })).rejects.toThrow('Motor caído');
    expect(store.pacientes).toEqual([]);
  });
  it('conserva el historial activo si falla el archivado', async () => {
    store.pacientes = [{ id: '1', historial: { estado: 'activo' } }];
    apiPediatria.archivar.mockRejectedValue(new Error('Conflicto'));
    await expect(store.archivarPaciente('1', { tipo: 'otro', detalle: 'Prueba' })).rejects.toThrow();
    expect(store.pacientes[0].historial.estado).toBe('activo');
  });
  it('no agrega mediciones en memoria antes de confirmar escritura', async () => {
    const paciente = { id: '1', detallesInstitucion: { controlesCrecimiento: [] } };
    store.pacientes = [paciente];
    apiPediatria.crecimiento.mockRejectedValue(new Error('Sin conexión'));
    await expect(store.agregarControlCrecimiento('1', { pesoKg: 10 })).rejects.toThrow();
    expect(paciente.detallesInstitucion.controlesCrecimiento).toEqual([]);
  });
});
