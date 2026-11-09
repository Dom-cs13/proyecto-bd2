import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { activarOdontograma, vistaOdontograma } from '../../frontend/odontologia/js/odontograma.js';

describe('I2-11 · odontograma FDI accesible', () => {
  let dom, raiz, seleccionar;
  beforeEach(() => {
    dom = new JSDOM(vistaOdontograma([{ piezaDental: 11, superficie: 'V' }]));
    raiz = dom.window.document.querySelector('.odontograma');
    seleccionar = vi.fn(); activarOdontograma(raiz, seleccionar);
  });
  afterEach(() => dom.window.close());
  it('incluye exactamente las 32 piezas permanentes válidas y sus cuatro cuadrantes', () => {
    const piezas = [...raiz.querySelectorAll('[data-pieza]')].map((b) => Number(b.dataset.pieza));
    expect(piezas).toHaveLength(32);
    expect(new Set(piezas).size).toBe(32);
    for (const cuadrante of [1, 2, 3, 4]) for (let pieza = 1; pieza <= 8; pieza++) expect(piezas).toContain(cuadrante * 10 + pieza);
    expect(raiz.querySelectorAll('.dental-quadrant')).toHaveLength(4);
  });
  it.each(['O', 'I', 'M', 'D', 'V', 'L', 'P'])('envía pieza y superficie %s sin guardar un estado ficticio', (superficie) => {
    raiz.querySelector('[data-pieza="11"]').click();
    raiz.querySelector(`[data-superficie="${superficie}"]`).click();
    expect(seleccionar).toHaveBeenLastCalledWith({ piezaDental: 11, superficie });
    expect(raiz.querySelector('[data-pieza="11"]').getAttribute('aria-pressed')).toBe('true');
    expect(raiz.querySelector(`[data-superficie="${superficie}"]`).getAttribute('aria-pressed')).toBe('true');
  });
  it('permite seleccionar superficie antes de pieza y volver a pieza completa', () => {
    raiz.querySelector('[data-superficie="M"]').click(); expect(seleccionar).not.toHaveBeenCalled();
    raiz.querySelector('[data-pieza="48"]').click();
    expect(seleccionar).toHaveBeenLastCalledWith({ piezaDental: 48, superficie: 'M' });
    raiz.querySelector('[data-superficie=""]').click();
    expect(seleccionar).toHaveBeenLastCalledWith({ piezaDental: 48, superficie: '' });
  });
  it('resalta solo los registros persistidos, y el historial es de solo lectura', () => {
    expect(raiz.querySelectorAll('.has-record')).toHaveLength(1);
    const lectura = new JSDOM(vistaOdontograma([{ piezaDental: 48 }], true));
    expect(lectura.window.document.querySelectorAll('[data-pieza]:disabled')).toHaveLength(32);
    expect(lectura.window.document.querySelector('[data-superficie]')).toBeNull();
    lectura.window.close();
  });
});
