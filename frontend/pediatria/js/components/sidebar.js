import { store } from '../state.js';
import { obtenerConfiguracionRol, puedeAccederVista } from '../../../shared/js/components/navegacionRol.js';
import { mostrarErrorHttp } from '../../../shared/js/components/mensajesError.js';

export function renderSidebar(containerId = 'sidebar-container', vistaActiva = 'principal') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const kpis = store.getKPIs();
  const rolCfg = obtenerConfiguracionRol();

  container.innerHTML = `
    <div>
      <div class="brand-section">
        <div class="brand-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/><path d="M5 19v-2a7 7 0 0 1 14 0v2"/></svg>
        </div>
        <div>
          <h1 class="brand-title">Centro Pediátrico</h1>
          <p class="brand-subtitle">Alba Suite · Red Pediátrica (I4)</p>
        </div>
      </div>

      <div class="nav-group-title">Módulos del Sistema</div>
      <ul class="nav-list">
        <li>
          <button class="nav-item ${vistaActiva === 'principal' ? 'active' : ''}" data-view="principal" type="button">
            <span class="nav-item-content">
              <span class="nav-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
              </span>
              <span>Principal</span>
            </span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'buscador' ? 'active' : ''}" data-view="buscador" type="button">
            <span class="nav-item-content">
              <span class="nav-icon">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <span>Buscador y Menores</span>
            </span>
            <span class="nav-badge" id="sidebar-total-badge">${kpis.totalPacientes}</span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'crecimiento' ? 'active' : ''}" data-view="crecimiento" type="button" style="${!puedeAccederVista('crecimiento') ? 'opacity:0.55;' : ''}">
            <span class="nav-item-content">
              <span class="nav-icon">
                <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
              </span>
              <span>Crecimiento y Vacunas</span>
            </span>
            <span class="nav-badge ${kpis.vacunasPendientes > 0 ? 'alert' : ''}">${kpis.vacunasPendientes > 0 ? kpis.vacunasPendientes : 'OK'}</span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'gestion' ? 'active' : ''}" data-view="gestion" type="button" style="${!puedeAccederVista('gestion') ? 'opacity:0.55;' : ''}">
            <span class="nav-item-content">
              <span class="nav-icon">
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </span>
              <span>Alta y Archivado</span>
            </span>
          </button>
        </li>
        <li>
          <button class="nav-item ${vistaActiva === 'consulta-red' ? 'active' : ''}" data-view="consulta-red" type="button" style="${!puedeAccederVista('consulta-red') ? 'opacity:0.55;' : ''}">
            <span class="nav-item-content">
              <span class="nav-icon">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </span>
              <span>Consulta en Red</span>
            </span>
          </button>
        </li>
      </ul>

      <div class="nav-group-title" style="margin-top: 24px;">Otras Instituciones (Red)</div>
      <ul class="nav-list">
        <li>
          <a href="../hospital/index.html" class="nav-item" style="opacity: 0.75;" title="Ir a Hospital General">
            <span class="nav-item-content">
              <span class="nav-icon" style="color: #00595d;">
                <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </span>
              <span>Hospital General (I1)</span>
            </span>
          </a>
        </li>
        <li>
          <a href="../odontologia/index.html" class="nav-item" style="opacity: 0.75;" title="Ir a Clínica Odontológica">
            <span class="nav-item-content">
              <span class="nav-icon" style="color: #1e5a8a;">
                <svg viewBox="0 0 24 24"><path d="M12 5C8 1 3 4 4 10c.5 3 2 4 2.5 8 .5 4 3 4 3.5 0 .5-3 3.5-3 4 0 .5 4 3 4 3.5 0 .5-4 2-5 2.5-8 1-6-4-9-8-5Z"/></svg>
              </span>
              <span>Odontología (I2)</span>
            </span>
          </a>
        </li>
        <li>
          <a href="../laboratorio/index.html" class="nav-item" style="opacity: 0.75;" title="Ir a Laboratorio Clínico">
            <span class="nav-item-content">
              <span class="nav-icon" style="color: #5b4a9e;">
                <svg viewBox="0 0 24 24"><path d="M10 2v7.31L4.17 19.5A2 2 0 0 0 6 22h12a2 2 0 0 0 1.83-2.5L14 9.31V2"/></svg>
              </span>
              <span>Laboratorio (I3)</span>
            </span>
          </a>
        </li>
      </ul>
    </div>

    <div class="sidebar-footer">
      <div class="db-status-pill">
        <div class="db-indicator">
          <span class="db-dot"></span>
          <span>Nodo Local</span>
        </div>
        <span style="font-family: monospace; font-size: 0.72rem; font-weight: 700; color: var(--color-treehouse);">Institución I4</span>
      </div>

      <div class="user-profile-card">
        <div class="user-avatar">DRA</div>
        <div class="user-info">
          <span class="user-name">Dra. Sofía Mendoza</span>
          <span class="user-role">${rolCfg.etiqueta}</span>
        </div>
      </div>

      <button id="btn-cerrar-sesion-sidebar" class="btn-salir" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>Cerrar sesión</span>
      </button>
    </div>
  `;

  // Listeners de navegación con validación de rol (403 si no tiene permiso)
  container.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      if (!puedeAccederVista(targetView)) {
        mostrarErrorHttp({
          status: 403,
          error: {
            codigo: 'ACCESO_DENEGADO',
            mensaje: `El rol actual (${rolCfg.etiqueta}) no tiene permisos para acceder a la sección "${targetView}".`
          }
        });
        return;
      }
      if (window.navegarA) {
        window.navegarA(targetView);
      }
    });
  });

  // Salir
  const btnSalir = container.querySelector('#btn-cerrar-sesion-sidebar');
  if (btnSalir) {
    btnSalir.addEventListener('click', () => {
      if (window.cerrarSesionApp) {
        window.cerrarSesionApp();
      }
    });
  }
}
