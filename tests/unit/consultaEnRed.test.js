import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../../src/infrastructure/adapters/mock/MockAdapter.js';
import { buscarEnRed, obtenerHistorialEnRed, institucionesRed } from '../../src/application/useCases/consultaEnRed.js';

describe('I2-02 · casos de uso de red con MockAdapter existente', () => {
  it('busca mediante el puerto en cuatro instancias independientes', async () => {
    const repositorios = Object.fromEntries(institucionesRed.map((i) => [i, new MockAdapter()]));
    await repositorios.odontologia.crearPaciente({ nombres: 'Paciente', apellidos: 'Prueba', documentoIdentidad: 'FICTICIO-1', fechaNacimiento: '2000-01-01' });
    const respuesta = await buscarEnRed(repositorios, { documento: 'FICTICIO-1' });
    expect(respuesta.resultados.map((r) => r.estado)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(respuesta.resultados.map((r) => r.total)).toEqual([0, 1, 0, 0]);
  });
  it('obtiene historial y distingue paciente inexistente sin modificarlo', async () => {
    const repo = new MockAdapter();
    const paciente = await repo.crearPaciente({ nombres: 'Paciente', apellidos: 'Prueba', documentoIdentidad: 'FICTICIO-2', fechaNacimiento: '2000-01-01' });
    const respuesta = await obtenerHistorialEnRed({ odontologia: repo }, 'odontologia', paciente.id);
    expect(respuesta.paciente.id).toBe(paciente.id);
    expect(respuesta.historial.estado).toBe('activo');
    expect(respuesta.consultas).toEqual([]);
    await expect(obtenerHistorialEnRed({ odontologia: repo }, 'odontologia', '999')).rejects.toMatchObject({ status: 404 });
    expect((await repo.obtenerHistorial(paciente.id)).historial.estado).toBe('activo');
  });
});
