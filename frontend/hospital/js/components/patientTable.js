import { store } from '../state.js';

export function renderPatientTable(containerId = 'table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pacientes = store.getPacientesFiltrados();

  if (pacientes.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 48px; text-align: center;">
        <p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 8px;">No se encontraron pacientes con los criterios de búsqueda.</p>
        <p style="font-size: 0.85rem; color: var(--text-light);">Intenta limpiar el filtro o registrar un nuevo paciente.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = pacientes.map(p => {
    // Iniciales para el avatar
    const iniciales = `${p.nombre[0] || ''}${p.apellidos[0] || ''}`.toUpperCase();
    
    // Calcular edad
    const edad = new Date().getFullYear() - new Date(p.fechaNacimiento).getFullYear();

    // Estado dot
    let statusDotClass = 'active';
    let statusLabel = 'Estable';
    if (p.estadoClinico === 'observacion') {
      statusDotClass = 'warning';
      statusLabel = 'Observación';
    } else if (p.estadoClinico === 'critico') {
      statusDotClass = 'critical';
      statusLabel = 'Crítico';
    }

    // Badge de servicio
    const badgeClass = p.servicioArea === 'Hospitalización' ? 'badge-hospital' : 'badge-medicina';

    // Fecha legible
    const fechaObj = new Date(p.ultimaConsulta);
    const fechaStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

    return `
      <tr data-patient-id="${p.id}">
        <td>
          <span class="badge-exp">${p.expediente}</span>
        </td>
        <td>
          <div class="patient-cell">
            <div class="patient-avatar-circle">${iniciales}</div>
            <div>
              <div class="patient-meta-name">${p.nombre} ${p.apellidos}</div>
              <div class="patient-meta-sub">${edad} años · ${p.genero} · ${p.curp}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-tag ${badgeClass}">${p.servicioArea}</span>
        </td>
        <td>
          <div style="font-weight: 500;">${p.medicoTratante}</div>
        </td>
        <td>
          <div style="color: var(--text-muted); font-size: 0.82rem;">${p.ubicacion}</div>
        </td>
        <td>
          <div style="color: var(--text-muted); font-size: 0.82rem;">${fechaStr}</div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; font-weight: 500;">
            <span class="status-dot ${statusDotClass}"></span>
            <span>${statusLabel}</span>
          </div>
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
              <th>Servicio / Área</th>
              <th>Médico Tratante</th>
              <th>Ubicación</th>
              <th>Última Consulta</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>

      <div class="table-footer">
        <div>Mostrando <strong>${pacientes.length}</strong> pacientes activos</div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-outline btn-sm" disabled>Anterior</button>
          <button class="btn btn-primary btn-sm">1</button>
          <button class="btn btn-outline btn-sm" disabled>Siguiente</button>
        </div>
      </div>
    </div>
  `;

  // Listener en cada fila para ver detalle / editar
  container.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-patient-id');
      const paciente = store.pacientes.find(p => p.id === id);
      if (paciente && window.abrirDrawerDetalle) {
        window.abrirDrawerDetalle(paciente);
      }
    });
  });
}

