import { store } from '../state.js';

export function renderKpiCards(containerId = 'kpi-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const kpis = store.getKPIs();

  container.innerHTML = `
    <div class="kpi-grid">
      <!-- Pacientes indexados -->
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon-wrap">👤</div>
          <span class="kpi-tag">Total BD</span>
        </div>
        <div class="kpi-label">Pacientes indexados</div>
        <div class="kpi-value-row">
          <span class="kpi-number">${kpis.total}</span>
          <span class="kpi-unit">expedientes</span>
        </div>
      </div>

      <!-- Medicina General -->
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon-wrap">🩺</div>
          <span class="kpi-tag">Med. General</span>
        </div>
        <div class="kpi-label">Consultas ambulatorias</div>
        <div class="kpi-value-row">
          <span class="kpi-number">${kpis.medGeneral}</span>
          <span class="kpi-unit">pacientes</span>
        </div>
      </div>

      <!-- En observación / Críticos -->
      <div class="kpi-card">
        <div class="kpi-header">
          <div class="kpi-icon-wrap" style="background-color: #fee2e2; color: #dc2626;">⚠️</div>
          <span class="kpi-tag" style="color: #dc2626;">Atención Crítica</span>
        </div>
        <div class="kpi-label">Estado delicado / observación</div>
        <div class="kpi-value-row">
          <span class="kpi-number" style="color: #dc2626;">${kpis.criticos}</span>
          <span class="kpi-unit">prioritarios</span>
        </div>
      </div>

      <!-- Camas en seguimiento (Highlight Card del Hospital) -->
      <div class="kpi-card highlight">
        <div class="kpi-header">
          <div class="kpi-icon-wrap">🛏️</div>
          <span class="kpi-tag">Hospitalización</span>
        </div>
        <div class="kpi-label">Camas en seguimiento</div>
        <div class="kpi-value-row">
          <span class="kpi-number">${kpis.internados}</span>
          <span class="kpi-unit">en pabellón</span>
        </div>
      </div>
    </div>
  `;
}

