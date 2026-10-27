import { store } from '../state.js';

export function renderListaArchivar(containerId = 'lista-archivar-pacientes-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activos = store.pacientes.filter(p => p.estadoArchivo === 'activo');

  if (activos.length === 0) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted);">No hay pacientes activos disponibles para archivar.</p>`;
    return;
  }

  const itemsHtml = activos.map(p => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 8px;">
      <div>
        <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main);">${p.nombre} ${p.apellidos}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">${p.expediente} · ${p.ubicacion}</div>
      </div>
      <button class="btn btn-outline btn-sm" style="color: #dc2626; border-color: #fca5a5;" onclick="window.confirmarArchivado('${p.id}')">
        Archivar
      </button>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="max-height: 380px; overflow-y: auto; padding-right: 4px;">
      ${itemsHtml}
    </div>
  `;
}

