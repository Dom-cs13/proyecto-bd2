import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../../src/infrastructure/adapters/mock/MockAdapter.js';

describe('I4-02 · MockAdapter de contrato en memoria', () => {
  it('cumple el ciclo completo: crear paciente, historial, consulta y archivar', async () => {
    const mock = new MockAdapter();

    const paciente = await mock.crearPaciente({
      nombres: 'Carlos',
      apellidos: 'Morales',
      fechaNacimiento: '2022-01-01',
      sexo: 'M',
      documento: 'CUI-123',
    });
    expect(paciente.id).toBe('1');

    const lista = await mock.listarPacientes({ texto: 'Carlos' });
    expect(lista.total).toBe(1);
    expect(lista.items[0].nombres).toBe('Carlos');

    const historial = await mock.obtenerHistorial('1');
    expect(historial.historial.estado).toBe('activo');

    const consulta = await mock.crearConsulta({ pacienteId: '1', motivo: 'Control general' });
    expect(consulta.id).toBe('2');

    const diagnostico = await mock.agregarDiagnostico('2', { descripcion: 'Sano' });
    expect(diagnostico.id).toBe('3');

    const tratamiento = await mock.registrarTratamiento('3', { descripcion: 'Vitaminas' });
    expect(tratamiento.id).toBe('4');

    const receta = await mock.recetarMedicamento('2', {
      medicamentos: [{ medicamentoId: '10', dosis: '1 tableta' }],
    });
    expect(receta.id).toBe('5');

    const archivado = await mock.archivarHistorial('1', { tipo: 'traslado', detalle: 'Cambio de clínica' });
    expect(archivado.historial.estado).toBe('archivado');

    await expect(
      mock.archivarHistorial('1', { tipo: 'traslado', detalle: 'Otro intento' }),
    ).rejects.toThrow('PACIENTE_ARCHIVADO');

    const ping = await mock.ping();
    expect(ping.ok).toBe(true);
    expect(ping.motor).toBe('mock');
  });
});
