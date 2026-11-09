/* ============================================================
   modal.js · Gestión de Modales, Notificaciones Toast y Helpers DOM
   ============================================================ */

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const fmt = (d) =>
  d
    ? new Date(d.includes('T') ? d : d + 'T00:00:00').toLocaleDateString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

export const hoy = () => new Date().toISOString().slice(0, 10);

export function debounce(fn, ms = 200) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function toast(msg, tipo = 'ok') {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.dataset.tipo = tipo;
  t.classList.add('ver');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('ver'), 2600);
}

export function abrirModal(titulo, html) {
  const m = $('#modal');
  if (!m) return null;
  if (m.open) m.close();
  m.innerHTML = `<div class="dialog-cab"><h2>${titulo}</h2><button class="cerrar" type="button" aria-label="Cerrar">✕</button></div>${html}`;
  const btnCerrar = $('.cerrar', m);
  if (btnCerrar) btnCerrar.onclick = () => m.close();
  m.showModal();
  return m;
}

export function inicializarBackdropModal() {
  const modalEl = $('#modal');
  if (!modalEl) return;
  modalEl.addEventListener('click', (e) => {
    if (e.target !== modalEl) return;
    const r = modalEl.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) modalEl.close();
  });
}
