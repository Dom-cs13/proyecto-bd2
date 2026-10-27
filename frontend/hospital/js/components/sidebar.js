import { store } from '../state.js';

export function renderSidebar(containerId = 'sidebar-container', vistaActiva = 'principal') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const kpis = store.getKPIs();

  container.innerHTML = `
    <div>
      <div class="brand-section">
        <div class="brand-icon">+</div>
        <div>
          <h1 class="brand-title">Hospital General</h1>
          <p class="brand-subtitle">Alba Suite · Plataforma Clínica</p>
        </div>
      </div>

      <div class="nav-group-title">Módulos del Sistema</div>
      <ul class="nav-list">
        <li>
          <button class="nav-item ${vistaActiva === 'principal' ? 'active' : ''}" data-view="principal">
            <span class="nav-item-content">
              <span>🩺</span>
              <span>Principal</span>
            </span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'buscador' ? 'active' : ''}" data-view="buscador">
            <span class="nav-item-content">
              <span>🔍</span>
              <span>Buscador</span>
            </span>
            <span class="nav-badge" id="sidebar-total-badge">${kpis.total}</span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'gestion' ? 'active' : ''}" data-view="gestion">
            <span class="nav-item-content">
              <span>🗂️</span>
              <span>Crear / Archivar</span>
            </span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'laboratorio' ? 'active' : ''}" data-view="laboratorio">
            <span class="nav-item-content">
              <span>🔬</span>
              <span>Laboratorios</span>
            </span>
            <span class="nav-badge" style="background-color: #fee2e2; color: #dc2626;" id="sidebar-lab-badge">${kpis.labsPendientes > 0 ? kpis.labsPendientes : 'OK'}</span>
          </button>
        </li>
      </ul>

      <div class="nav-group-title" style="margin-top: 28px;">Otras Instituciones (Demo)</div>
      <ul class="nav-list">
        <li>
          <button class="nav-item" style="opacity: 0.5; cursor: not-allowed;" title="Asignado a I2">
            <span class="nav-item-content">
              <span>🦷</span>
              <span>Odontología (I2)</span>
            </span>
          </button>
        </li>
        <li>
          <button class="nav-item" style="opacity: 0.5; cursor: not-allowed;" title="Asignado a I4">
            <span class="nav-item-content">
              <span>👶</span>
              <span>Pediatría (I4)</span>
            </span>
          </button>
        </li>
      </ul>
    </div>

    <div class="sidebar-footer">
      <div class="db-status-pill">
        <div class="db-indicator">
          <span class="db-dot"></span>
          <span>BD Interna activa</span>
        </div>
        <span style="font-family: monospace; font-size: 0.72rem;">MongoDB Atlas</span>
      </div>

      <div class="user-profile-card">
        <div class="user-avatar">DR</div>
        <div class="user-info">
          <span class="user-name">Dr. Rodrigo Palma</span>
          <span class="user-role">Hospital General / Admin</span>
        </div>
      </div>
    </div>
  `;

  // Asignar listeners de navegación
  container.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (window.navegarA) {
        window.navegarA(targetView);
      }
    });
  });
}
