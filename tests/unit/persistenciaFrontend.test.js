import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../frontend/shared/js/api/client.js', () => ({ apiClient: vi.fn() }));
import { apiClient } from '../../frontend/shared/js/api/client.js';
import { store } from '../../frontend/hospital/js/state.js';
import * as laboratorio from '../../frontend/laboratorio/js/datos.js';

beforeEach(() => {
  store.pacientes = [];
  laboratorio.pacientes.length = 0;
});
afterEach(() => vi.resetAllMocks());

describe('Persistencia confirmada por API sin alterar las vistas', () => {
  it('Hospital no agrega pacientes si el motor rechaza la escritura', async () => {
    apiClient.mockResolvedValue({ ok: false, status: 503, json: async () => ({ error: { mensaje: 'Motor caído' } }) });
    await expect(store.agregarPaciente({ nombre: 'Ficticio' })).rejects.toThrow('Motor caído');
    expect(store.pacientes).toEqual([]);
  });
  it('Hospital conserva los datos de edición cuando la API falla', async () => {
    store.pacientes = [{ id: '1', telefono: '12345678' }];
    apiClient.mockRejectedValue(new TypeError('sin conexión'));
    await expect(store.actualizarPaciente('1', { telefono: '87654321' })).rejects.toThrow();
    expect(store.pacientes[0].telefono).toBe('12345678');
  });
  it('Hospital no archiva en memoria tras un error HTTP', async () => {
    store.pacientes = [{ id: '1', estadoArchivo: 'activo' }];
    apiClient.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { mensaje: 'Conflicto' } }) });
    await expect(store.archivarPaciente('1', {})).rejects.toThrow();
    expect(store.pacientes[0].estadoArchivo).toBe('activo');
  });
  it('Laboratorio inicia vacío si la API está caída y no hidrata fixtures', async () => {
    apiClient.mockRejectedValue(new TypeError('sin conexión'));
    await expect(laboratorio.cargarEstado()).rejects.toThrow();
    expect(laboratorio.pacientes).toEqual([]);
    expect(laboratorio.examenes).toEqual([]);
  });
  it('Laboratorio propaga el rechazo del registro y no agrega un paciente local', async () => {
    apiClient.mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: { mensaje: 'Duplicado' } }) });
    await expect(laboratorio.crearPacienteApi({ nombre: 'Ficticio' })).rejects.toThrow('Duplicado');
    expect(laboratorio.pacientes).toEqual([]);
  });
});
