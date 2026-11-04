import { store } from '../state.js';

export function renderKpiCards(containerId = 'inicio-kpi-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const kpis = store.getKPIs();

  container.innerHTML = `
    <!-- Card 1: Total Pacientes -->
    <div class="kpi-card">
      <div class="kpi-header">
        <div class="kpi-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <span class="badge badge-stable">Activos</span>
      </div>
      <div class="kpi-body">
        <span class="kpi-value">${kpis.totalPacientes}</span>
        <span class="kpi-label">Menores Registrados</span>
      </div>
      <div class="kpi-footer">
        <span>Con tutor legal vinculado</span>
        <strong style="color: var(--color-treehouse);">100%</strong>
      </div>
    </div>

    <!-- Card 2: Controles Antropométricos -->
    <div class="kpi-card">
      <div class="kpi-header">
        <div class="kpi-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
        </div>
        <span class="badge" style="background-color: var(--color-daydream); color: var(--color-pacific);">Percentiles</span>
      </div>
      <div class="kpi-body">
        <span class="kpi-value">${kpis.totalControles}</span>
        <span class="kpi-label">Controles Antropométricos</span>
      </div>
      <div class="kpi-footer">
        <span>Peso, talla y perímetro</span>
        <strong style="color: var(--color-pacific);">Al día</strong>
      </div>
    </div>

    <!-- Card 3: Vacunas Pendientes -->
    <div class="kpi-card">
      <div class="kpi-header">
        <div class="kpi-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <span class="badge badge-vacuna-pend">Inmunización</span>
      </div>
      <div class="kpi-body">
        <span class="kpi-value">${kpis.vacunasPendientes}</span>
        <span class="kpi-label">Dosis por Completar</span>
      </div>
      <div class="kpi-footer">
        <span>Esquema nacional</span>
        <strong style="color: var(--color-sunkissed);">Revisión periódica</strong>
      </div>
    </div>

    <!-- Card 4: Observación Especial (Bubblegum suave) -->
    <div class="kpi-card alert-card">
      <div class="kpi-header">
        <div class="kpi-icon-wrap alert">
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <span class="badge badge-critical">Prioritario</span>
      </div>
      <div class="kpi-body">
        <span class="kpi-value">${kpis.enObservacion}</span>
        <span class="kpi-label">Pacientes en Seguimiento</span>
      </div>
      <div class="kpi-footer" style="border-top-color: #f7b3a9;">
        <span>Alergias / Triage delicado</span>
        <strong style="color: #8a2428;">Atención hoy</strong>
      </div>
    </div>
  `;
}

export function renderInicioObservacion(containerId = 'inicio-observacion-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const observacion = store.pacientes.filter(p => p.estadoArchivo === 'activo' && (p.estadoClinico === 'observacion' || p.estadoClinico === 'critico'));

  if (observacion.length === 0) {
    container.innerHTML = `
      <div class="kpi-card" style="text-align: center; padding: 28px; color: var(--text-muted);">
        <p>No hay pacientes en estado crítico u observación en este momento. Todos los menores se encuentran estables.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-container">
      <div class="table-scroll">
        <table class="pediatria-table">
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Menor y Edad</th>
              <th>Tutor Responsable</th>
              <th>Condición / Alergias</th>
              <th>Estado Clínico</th>
              <th style="text-align: right;">Acción Rápida</th>
            </tr>
          </thead>
          <tbody>
            ${observacion.map(p => {
              const tutor = p.detallesInstitucion?.tutorPrincipal;
              const alergias = (p.detallesInstitucion?.alergias || []).map(a => a.alergeno).join(', ') || 'Ninguna registrada';
              return `
                <tr>
                  <td>
                    <span class="badge badge-tutor" style="font-family: monospace;">${p.expediente}</span>
                  </td>
                  <td>
                    <div class="patient-cell">
                      <div class="patient-avatar">${p.nombre[0]}${p.apellidos[0]}</div>
                      <div class="patient-meta">
                        <span class="patient-name">${p.nombre} ${p.apellidos}</span>
                        <span class="patient-age">Nac: ${p.fechaNacimiento} (${p.genero})</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="display: flex; flex-direction: column;">
                      <strong style="font-size: 0.82rem; color: var(--color-pacific);">${tutor?.nombre || 'Sin tutor'}</strong>
                      <span style="font-size: 0.74rem; color: var(--text-muted);">${tutor?.parentesco || ''} · ${tutor?.telefono || ''}</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-alerta-bg" style="color: #8a2428; border: 1px solid #f8aba0;">
                      ${alergias}
                    </span>
                  </td>
                  <td>
                    <span class="badge ${p.estadoClinico === 'critico' ? 'badge-critical' : 'badge-warning'}">
                      ● ${p.estadoClinico === 'critico' ? 'Estado Crítico' : 'En Observación'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm btn-abrir-drawer" data-id="${p.id}">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>Abrir Expediente</span>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('.btn-abrir-drawer').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (window.abrirDrawerExpediente) {
        window.abrirDrawerExpediente(id);
      }
    });
  });
}
