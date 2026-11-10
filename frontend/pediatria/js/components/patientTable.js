import { datoSeguro } from '../../../shared/js/components/pacientes.js';
import { store } from '../state.js';

export function renderSearchBar(containerId = 'search-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="search-bar-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input 
        type="search" 
        id="input-buscador-pediatrico" 
        class="search-input" 
        placeholder="Buscar por nombre del menor, expediente (PED-...), CUI o nombre del tutor..."
        value="${store.filtroTexto}" 
      />
    </div>
  `;

  const input = container.querySelector('#input-buscador-pediatrico');
  if (input) {
    input.addEventListener('input', (e) => {
      store.setFiltroTexto(e.target.value);
    });
  }
}

export function renderPatientTable(containerId = 'table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pacientes = store.getPacientesFiltrados();

  if (pacientes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 700; color: var(--color-pacific); margin-bottom: 6px;">No se encontraron expedientes pediátricos</p>
        <p style="font-size: 0.85rem;">Prueba con otro término de búsqueda o registra un nuevo paciente.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="table-scroll">
      <table class="pediatria-table">
        <thead>
          <tr>
            <th>Expediente</th>
            <th>Menor y Nacimiento</th>
            <th>Tutor Principal (Responsable)</th>
            <th>Último Control Antropométrico</th>
            <th>Vacunas Aplicadas</th>
            <th>Estado (historial.estado)</th>
            <th style="text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${pacientes.map(p => {
            const tutor = p.detallesInstitucion?.tutorPrincipal;
            const controles = p.detallesInstitucion?.controlesCrecimiento || [];
            const ultimoControl = controles[0];
            const vacunas = p.detallesInstitucion?.vacunasAplicadas || [];
            const esActivo = p.historial?.estado === 'activo';

            return `
              <tr style="${!esActivo ? 'opacity: 0.65; background-color: #fafbfc;' : ''}">
                <td>
                  <span class="badge badge-tutor" style="font-family: monospace;">${datoSeguro(p.expediente ?? p.id)}</span>
                </td>
                <td>
                  <div class="patient-cell">
                    <div class="patient-avatar">${datoSeguro(p.nombre?.[0] ?? p.apellidos?.[0])}${p.nombre && p.apellidos ? datoSeguro(p.apellidos[0]) : ''}</div>
                    <div class="patient-meta">
                      <span class="patient-name">${datoSeguro(p.nombre)} ${datoSeguro(p.apellidos)}</span>
                      <span class="patient-age">${datoSeguro(p.fechaNacimiento)} · ${datoSeguro(p.genero)}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <div style="display: flex; flex-direction: column;">
                    <strong style="color: var(--color-pacific); font-size: 0.82rem;">${datoSeguro(tutor?.nombre)}</strong>
                    <span style="color: var(--text-muted); font-size: 0.74rem;">${datoSeguro(tutor?.parentesco)} · ${datoSeguro(tutor?.telefono)}</span>
                  </div>
                </td>
                <td>
                  ${ultimoControl ? `
                    <div style="display: flex; flex-direction: column; font-size: 0.78rem;">
                      <span style="font-weight: 700; color: var(--color-pacific);">${datoSeguro(ultimoControl.pesoKg)} kg · ${datoSeguro(ultimoControl.tallaCm)} cm</span>
                      <span style="color: var(--text-muted); font-size: 0.72rem;">PC: ${datoSeguro(ultimoControl.perimetroCefalicoCm)} cm (${datoSeguro(ultimoControl.fecha)})</span>
                    </div>
                  ` : `
                    <span style="color: var(--text-muted); font-size: 0.76rem;">Sin controles previos</span>
                  `}
                </td>
                <td>
                  <span class="badge ${vacunas.length >= 6 ? 'badge-vacuna-ok' : 'badge-vacuna-pend'}">
                    ${vacunas.length} dosis registradas
                  </span>
                </td>
                <td>
                  ${esActivo ? `
                    <span class="badge ${p.estadoClinico === 'critico' ? 'badge-critical' : p.estadoClinico === 'observacion' ? 'badge-warning' : 'badge-stable'}">
                      ● ${(p.estadoClinico ?? 'estable').toUpperCase()}
                    </span>
                  ` : `
                    <span class="badge badge-archived">ARCHIVADO (${p.historial?.motivoArchivo?.tipo || 'cerrado'})</span>
                  `}
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-outline btn-sm btn-abrir-drawer-paciente" data-id="${p.id}" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    <span>Expediente</span>
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('.btn-abrir-drawer-paciente').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (window.abrirDrawerExpediente) {
        window.abrirDrawerExpediente(id);
      }
    });
  });
}
