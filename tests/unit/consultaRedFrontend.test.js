// @vitest-environment jsdom
/* global document */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { consultarRed } from '../../frontend/shared/js/components/consultaRed.js';
vi.mock('../../frontend/shared/js/api/red.js', () => ({ buscarEnRed: vi.fn(), historialEnRed: vi.fn() }));
import { buscarEnRed, historialEnRed } from '../../frontend/shared/js/api/red.js';

afterEach(() => vi.resetAllMocks());
describe('Consulta de red dentro de los componentes existentes', () => {
  it('conserva el modal y sus controles, indica origen y recupera la ficha autorizada', async () => {
    document.body.innerHTML = '<dialog><button id="cerrar">Cerrar</button><div id="datos"></div></dialog>';
    const cerrar = document.getElementById('cerrar');
    buscarEnRed.mockResolvedValue({ resultados: [
      { institucion: 'laboratorio', estado: 'ok', items: [{ id: '1', nombre: '<img src=x>', apellidos: 'Ficticio', documentoIdentidad: 'PRUEBA' }] },
      { institucion: 'hospital', estado: 'no_disponible', items: [] },
    ] });
    historialEnRed.mockResolvedValue({ historial: { estado: 'activo' }, consultas: [] });
    await consultarRed('PRUEBA', document.getElementById('datos'), 'clinical-table');
    expect(document.getElementById('cerrar')).toBe(cerrar);
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('table').className).toBe('clinical-table');
    expect(document.body.textContent).toContain('no_disponible');
    document.querySelector('#datos button').click();
    await vi.waitFor(() => expect(historialEnRed).toHaveBeenCalledWith('laboratorio', '1'));
    expect(document.body.textContent).toContain('Datos clínicos externos restringidos');
    expect(document.querySelector('form')).toBeNull();
  });
  it('muestra un fallo de API sin inventar pacientes ni perder el modal', async () => {
    document.body.innerHTML = '<dialog open><div id="datos"></div></dialog>';
    buscarEnRed.mockRejectedValue(new Error('Sin conexión'));
    await consultarRed('PRUEBA', document.getElementById('datos'));
    expect(document.querySelector('dialog').open).toBe(true);
    expect(document.getElementById('datos').textContent).toBe('Sin conexión');
    expect(document.querySelector('table')).toBeNull();
  });
});
