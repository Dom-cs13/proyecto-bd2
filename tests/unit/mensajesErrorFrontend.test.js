// @vitest-environment jsdom
/* global document */
import { expect, it, vi } from 'vitest';
import { mostrarErrorHttp } from '../../frontend/shared/js/components/mensajesError.js';

it('muestra el mensaje real de Error de API sin convertirlo en HTML ni cambiar el componente', () => {
  vi.useFakeTimers();
  document.body.replaceChildren();
  mostrarErrorHttp(Object.assign(new Error('Permisos insuficientes <img src=x>'), { status: 503 }));
  expect(document.querySelector('[role="alert"]').textContent).toContain('Permisos insuficientes <img src=x>');
  expect(document.querySelector('img')).toBeNull();
  expect(document.querySelector('[aria-label="Cerrar aviso"]')).not.toBeNull();
  vi.runAllTimers(); vi.useRealTimers();
});
