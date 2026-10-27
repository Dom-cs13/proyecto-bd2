import { store } from '../state.js';

export function renderInicioCriticos(containerId = 'inicio-criticos-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const criticos = store.pacientes.filter(p => 
    (p.estadoClinico === 'critico' || p.estadoClinico === 'observacion') && p.estadoArchivo === 'activo'
  );

  if (criticos.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 32px; text-align: center;">
        <p style="color: var(--text-muted);">No hay pacientes en estado crítico o en observación en este momento.</p>
      </div>
    `;
    return;
  }

  const rows = criticos.map(p => {
    const iniciales = `${p.nombre[0] || ''}${p.apellidos[0] || ''}`.toUpperCase();
    const esCritico = p.estadoClinico === 'critico';
    const tagBg = esCritico ? '#fee2e2' : '#fef3c7';
    const tagColor = esCritico ? '#dc2626' : '#d97706';
    const dotClass = esCritico ? 'critical' : 'warning';
    const label = esCritico ? 'Crítico Prioritario' : 'En Observación Médica';

    const fechaObj = new Date(p.ultimaConsulta);
    const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

    return `
      <tr data-patient-id="${p.id}">
        <td><span class="badge-exp">${p.expediente}</span></td>
        <td>
          <div class="patient-cell">
            <div class="patient-avatar-circle" style="background-color: ${tagColor};">${iniciales}</div>
            <div>
              <div class="patient-meta-name">${p.nombre} ${p.apellidos}</div>
              <div class="patient-meta-sub">${p.curp}</div>
            </div>
          </div>
        </td>
        <td>
          <span style="background-color: ${tagBg}; color: ${tagColor}; font-weight: 700; font-size: 0.78rem; padding: 4px 10px; border-radius: 12px; display: inline-flex; align-items: center; gap: 6px;">
            <span class="status-dot ${dotClass}"></span>
            ${label}
          </span>
        </td>
        <td><strong>${p.ubicacion}</strong></td>
        <td>${p.medicoTratante}</td>
        <td>${fechaStr}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.abrirDrawerDetalle(store.pacientes.find(x => x.id === '${p.id}'))">
            Ver Expediente
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-card">
      <div class="table-responsive">
        <table class="clinical-table">
          <thead>
            <tr>
              <th>Expediente</th>
              <th>Paciente</th>
              <th>Alerta Clínica</th>
              <th>Ubicación / Pabellón</th>
              <th>Médico Asignado</th>
              <th>Última Atención</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', () => {
      const id = tr.getAttribute('data-patient-id');
      const p = store.pacientes.find(x => x.id === id);
      if (p && window.abrirDrawerDetalle) window.abrirDrawerDetalle(p);
    });
  });
}

