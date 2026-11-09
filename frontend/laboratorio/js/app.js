/* ============================================================
   app.js · Coordinador Principal y Enrutador del Laboratorio Clínico
   ============================================================
   Módulo desacoplado de tamaño reducido. Orquesta:
   - Carga de plantillas HTML y enrutamiento por hash
   - Estado y persistencia con datos.js
   - Vistas modulares en ui/vistas.js
   - Formularios dinámicos de los 8 laboratorios en ui/formularios.js
   ============================================================ */

import { fetchPlantillaHtml } from '../../shared/js/api/client.js';
import { cargarEstado, guardarEstado, reiniciarDemo, pacientes, examenes } from './datos.js';
import { $, esc, toast, inicializarBackdropModal } from './ui/modal.js';
import { formOrden, detalleExamen, detallePaciente } from './ui/formularios.js';
import { vistas } from './ui/vistas.js';

let refreshView = () => {};
const setRefreshView = (fn) => {
  refreshView = fn;
};

/* ---------- Delegación de Eventos Globales ---------- */
document.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-editar]');
  if (editBtn) {
    const orden = examenes.find((x) => x.id === editBtn.dataset.editar);
    if (orden) formOrden(() => refreshView(), orden);
    return;
  }

  const verBtn = e.target.closest('[data-ver]');
  if (verBtn) {
    detalleExamen(verBtn.dataset.ver, () => refreshView());
    return;
  }

  if (e.target.closest('button')) return;

  const fe = e.target.closest('tr[data-id]');
  if (fe) return detalleExamen(fe.dataset.id, () => refreshView());

  const fp = e.target.closest('tr[data-cui]');
  if (fp) return detallePaciente(fp.dataset.cui, () => refreshView());
});

/* ---------- Reiniciar demostración ---------- */
function wireReset() {
  const btn = document.getElementById('btn-reset');
  if (!btn) return;
  btn.onclick = (e) => {
    e.preventDefault();
    if (!confirm('¿Restaurar los datos de demostración con los 8 tipos de laboratorio?')) return;
    reiniciarDemo();
    guardarEstado();
    toast('Datos de demostración restaurados');
    refreshView();
  };
}

/* ---------- Botón superior de acción rápida ---------- */
function wireTopAction() {
  const btn = document.getElementById('btn-top-action');
  if (!btn) return;
  btn.onclick = () => {
    if (location.hash === '#examenes') {
      document.getElementById('btn-nueva-orden')?.click();
    } else if (location.hash === '#principal' || !location.hash) {
      formOrden(() => refreshView());
    } else {
      window.location.hash = '#pacientes';
    }
  };
}

/* ---------- Enrutador Dinámico ---------- */
async function navegar() {
  const nombre = vistas[location.hash.slice(1)] ? location.hash.slice(1) : 'principal';

  // Resaltado de navegación
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('activo', a.hash === `#${nombre}`));
  document.querySelectorAll('.topbar-tab').forEach((a) => a.classList.toggle('active', a.hash === `#${nombre}`));

  // Actualizar insignias del sidebar
  const badgePac = document.getElementById('badge-pacientes');
  if (badgePac) badgePac.textContent = pacientes.length;
  const badgeOrd = document.getElementById('badge-ordenes');
  if (badgeOrd) badgeOrd.textContent = examenes.length;

  try {
    $('#vista').innerHTML = await fetchPlantillaHtml(`./vistas/${nombre}.html`);
    vistas[nombre](setRefreshView);
    window.__labboot = true;
  } catch (err) {
    $('#vista').innerHTML = `<div class="empty-state"><span class="icon">⚠️</span><p>No se pudo cargar la vista «${esc(
      nombre
    )}».</p></div>`;
    console.error(err);
  }
}

/* ---------- Inicialización ---------- */
cargarEstado();
inicializarBackdropModal();
wireReset();
wireTopAction();
window.addEventListener('hashchange', navegar);
navegar();
