import { store } from '../state.js';

export function renderLaboratorioTable(containerId = 'laboratorio-table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const examenes = store.getLaboratoriosFiltrados();

  if (examenes.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 40px; text-align: center;">
        <p style="color: var(--text-muted); font-size: 1rem;">No se encontraron órdenes de laboratorio con los filtros aplicados.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = examenes.map(lab => {
    const esCompletado = lab.estado === 'Completado';
    const estadoBg = esCompletado ? '#ecfdf5' : '#fef3c7';
    const estadoColor = esCompletado ? '#047857' : '#d97706';
    const dotClass = esCompletado ? 'active' : 'warning';

    const fechaOrdenStr = new Date(lab.fechaOrden).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return `
      <tr data-lab-id="${lab.id}">
        <td>
          <span class="badge-exp" style="background-color: #f1f5f9; color: #334155;">${lab.codigoOrden}</span>
        </td>
        <td>
          <div>
            <div style="font-weight: 600; color: var(--text-main);">${lab.pacienteNombre}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${lab.expediente}</div>
          </div>
        </td>
        <td>
          <span class="badge-tag" style="background-color: var(--badge-cyan-bg); color: var(--badge-cyan-text); font-weight: 700;">
            ${lab.tipoExamen}
          </span>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; background-color: ${estadoBg}; color: ${estadoColor};">
            <span class="status-dot ${dotClass}"></span>
            ${lab.estado}
          </span>
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-main);">${lab.resultadoResumen}</div>
          <div style="font-size: 0.75rem; color: var(--text-light);">${lab.valores.length} parámetros analizados</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${lab.solicitante}</div>
          <div style="font-size: 0.75rem; color: var(--text-light);">${fechaOrdenStr}</div>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); window.abrirDetalleLaboratorio('${lab.id}')">
            Ver Resultados
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
              <th>Código Orden</th>
              <th>Paciente</th>
              <th>Tipo de Análisis</th>
              <th>Estado</th>
              <th>Hallazgo Clínico</th>
              <th>Médico / Fecha</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div>Total órdenes registradas: <strong>${examenes.length}</strong></div>
      </div>
    </div>
  `;

  // Listener para ver detalle
  container.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-lab-id');
      if (window.abrirDetalleLaboratorio) window.abrirDetalleLaboratorio(id);
    });
  });
}

