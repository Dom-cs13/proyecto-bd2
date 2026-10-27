import { store } from '../state.js';

export function renderModalDrawer(containerId = 'drawer-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div id="drawer-backdrop" class="drawer-backdrop"></div>
    <div id="drawer-panel" class="drawer-panel">
      <div class="drawer-header">
        <h3 id="drawer-title" class="drawer-title">Expediente Clínico</h3>
        <button id="drawer-close-btn" class="drawer-close-btn">&times;</button>
      </div>

      <div id="drawer-body" class="drawer-body">
        <!-- Inyección dinámica -->
      </div>

      <div id="drawer-footer" class="drawer-footer">
        <!-- Inyección dinámica -->
      </div>
    </div>
  `;

  const backdrop = document.getElementById('drawer-backdrop');
  const panel = document.getElementById('drawer-panel');
  const closeBtn = document.getElementById('drawer-close-btn');

  const cerrarDrawer = () => {
    backdrop.classList.remove('open');
    panel.classList.remove('open');
  };

  backdrop.addEventListener('click', cerrarDrawer);
  closeBtn.addEventListener('click', cerrarDrawer);
  window.cerrarDrawer = cerrarDrawer;

  // 1. VER EXPEDIENTE CLÍNICO COMPLETO
  window.abrirDrawerDetalle = (paciente) => {
    store.setPacienteSeleccionado(paciente);
    document.getElementById('drawer-title').textContent = `Expediente: ${paciente.expediente}`;

    const internado = paciente.detallesInstitucion?.internamiento?.enCama;
    const antecedentes = paciente.detallesInstitucion?.antecedentesCriticos || [];
    const seguro = paciente.detallesInstitucion?.seguro;

    const consultasHtml = (paciente.historial?.consultas || []).map(c => `
      <div style="background-color: var(--bg-subtle); border-radius: var(--radius-md); padding: 14px; margin-top: 10px; border-left: 3px solid var(--primary);">
        <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">
          <span><strong>Fecha:</strong> ${new Date(c.fecha).toLocaleDateString()}</span>
          <span><strong>Médico:</strong> ${c.medico}</span>
        </div>
        <p style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">${c.motivo}</p>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 8px;"><em>Obs:</em> ${c.observaciones || 'Sin observaciones adicionales'}</p>
        
        ${(c.diagnosticos || []).map(d => `
          <div style="margin-top: 8px; font-size: 0.82rem;">
            <span style="color: var(--primary); font-weight: 700;">Diagnóstico [${d.codigoCie}]:</span> ${d.descripcion}
            ${(d.tratamientos || []).map(t => `
              <div style="padding-left: 12px; color: var(--text-muted); margin-top: 2px;">
                ↳ <strong>Tratamiento:</strong> ${t.descripcion} (${t.diasDuracion} días · Del ${t.fechaInicio} al ${t.fechaFin})
              </div>
            `).join('')}
          </div>
        `).join('')}

        ${(c.recetas || []).map(r => `
          <div style="margin-top: 8px; font-size: 0.82rem; background: white; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
            <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">📋 Receta Médica:</div>
            ${(r.medicamentos || []).map(m => `
              <div style="padding-left: 8px; color: var(--text-muted); font-size: 0.8rem; margin-bottom: 3px;">
                • <strong>${m.nombre}</strong> (${m.dosis}) — Cant: ${m.cantidad} | ${m.frecuencia} por ${m.duracion}. <em>(${m.indicaciones})</em>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Sin consultas registradas aún.</p>';

    document.getElementById('drawer-body').innerHTML = `
      <!-- Cabecera de Paciente -->
      <div style="display: flex; gap: 16px; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border-color);">
        <div class="patient-avatar-circle" style="width: 52px; height: 52px; font-size: 1.2rem;">
          ${(paciente.nombre[0] || '')}${(paciente.apellidos[0] || '')}
        </div>
        <div>
          <h2 style="font-size: 1.15rem; font-weight: 700;">${paciente.nombre} ${paciente.apellidos}</h2>
          <p style="font-size: 0.82rem; color: var(--text-muted);">${paciente.curp} · Tel: ${paciente.telefono}</p>
          <p style="font-size: 0.78rem; color: var(--text-light);">${paciente.correo} · ${paciente.direccion}</p>
        </div>
      </div>

      <!-- Póliza de Seguro Médico (Identificación de Entidades Documento) -->
      ${seguro ? `
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 14px; border-radius: var(--radius-md); font-size: 0.82rem;">
          <div style="font-weight: 700; color: #166534; margin-bottom: 4px;">🛡️ Cobertura de Seguro Médico:</div>
          <div style="display: flex; justify-content: space-between;">
            <span><strong>Aseguradora:</strong> ${seguro.aseguradora}</span>
            <span><strong>Póliza:</strong> ${seguro.poliza}</span>
            <span><strong>Cobertura:</strong> ${seguro.cobertura}%</span>
          </div>
        </div>
      ` : ''}

      <!-- Datos Hospital General (Internamiento y Cama) -->
      <div style="background-color: var(--badge-cyan-bg); padding: 14px; border-radius: var(--radius-md);">
        <h4 style="font-size: 0.8rem; font-weight: 700; color: var(--badge-cyan-text); text-transform: uppercase; margin-bottom: 8px;">
          🏥 Ubicación y Cama · Hospital General
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
          <div><strong>Estado de Cama:</strong> ${internado ? '🛏️ En Pabellón' : '🚶 Ambulatorio'}</div>
          <div><strong>Ubicación:</strong> ${paciente.ubicacion}</div>
          <div><strong>Tipo de Sangre:</strong> ${paciente.detallesInstitucion?.tipoSangre || 'N/A'}</div>
          <div><strong>Médico Asignado:</strong> ${paciente.medicoTratante}</div>
        </div>
      </div>

      <!-- Alergias y Antecedentes Críticos -->
      <div>
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 6px;">Antecedentes Críticos y Alergias</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${antecedentes.length > 0 ? antecedentes.map(a => `
            <span style="background-color: #fee2e2; color: #b91c1c; font-size: 0.78rem; font-weight: 600; padding: 4px 10px; border-radius: 12px;">⚠️ ${a}</span>
          `).join('') : '<span style="color: var(--text-light); font-size: 0.82rem;">Ninguno registrado</span>'}
        </div>
      </div>

      <!-- Historial Clínico Completo -->
      <div>
        <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 6px;">Historial de Consultas & Recetas</h4>
        ${consultasHtml}
      </div>
    `;

    document.getElementById('drawer-footer').innerHTML = `
      <button class="btn btn-outline" onclick="window.cerrarDrawer()">Cerrar</button>
      <button class="btn btn-outline" style="color: #dc2626; border-color: #fca5a5;" onclick="window.confirmarArchivado('${paciente.id}')">Archivar Paciente</button>
      <button class="btn btn-primary" onclick="window.abrirModalEditar('${paciente.id}')">Editar Datos</button>
    `;

    backdrop.classList.add('open');
    panel.classList.add('open');
  };

  // 2. DETALLE DE RESULTADOS DE LABORATORIO
  window.abrirDetalleLaboratorio = (labId) => {
    const lab = store.laboratorios.find(l => l.id === labId);
    if (!lab) return;

    document.getElementById('drawer-title').textContent = `Orden: ${lab.codigoOrden}`;

    const valoresHtml = lab.valores.map(v => {
      let valColor = '#047857';
      if (v.estado === 'alerta') valColor = '#d97706';
      if (v.estado === 'critico') valColor = '#dc2626';

      return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 6px;">
          <div>
            <div style="font-weight: 600; font-size: 0.85rem;">${v.parametro}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Ref: ${v.referencia}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 800; font-size: 0.95rem; color: ${valColor};">${v.valor}</div>
            <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: ${valColor};">${v.estado}</span>
          </div>
        </div>
      `;
    }).join('') || '<p style="font-style: italic; color: var(--text-muted); font-size: 0.85rem;">Muestra en procesamiento. Sin valores disponibles aún.</p>';

    document.getElementById('drawer-body').innerHTML = `
      <div style="background-color: var(--badge-cyan-bg); padding: 16px; border-radius: var(--radius-md);">
        <h2 style="font-size: 1.1rem; font-weight: 700; color: var(--badge-cyan-text); margin-bottom: 4px;">${lab.tipoExamen}</h2>
        <p style="font-size: 0.85rem; color: var(--text-main);"><strong>Paciente:</strong> ${lab.pacienteNombre} (${lab.expediente})</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);"><strong>Médico solicitante:</strong> ${lab.solicitante}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);"><strong>Estado:</strong> ${lab.estado}</p>
      </div>

      <div>
        <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 8px;">Valores Variables y Parámetros Obtenidos</h4>
        ${valoresHtml}
      </div>

      <div style="background-color: var(--bg-subtle); padding: 12px; border-radius: var(--radius-sm);">
        <h5 style="font-size: 0.8rem; font-weight: 700; margin-bottom: 4px;">Observaciones Técnicas del Laboratorio:</h5>
        <p style="font-size: 0.82rem; color: var(--text-muted);">${lab.observacionesTecnicas || 'Ninguna observación reportada'}</p>
      </div>
    `;

    document.getElementById('drawer-footer').innerHTML = `
      <button class="btn btn-outline" onclick="window.cerrarDrawer()">Cerrar</button>
    `;

    backdrop.classList.add('open');
    panel.classList.add('open');
  };

  // 3. CONFIRMAR ARCHIVADO FORMAL
  window.confirmarArchivado = (id) => {
    const paciente = store.pacientes.find(p => p.id === id);
    if (!paciente) return;

    const motivoTipo = prompt(
      `Archivado clínico para ${paciente.nombre} ${paciente.apellidos}.\nSelecciona el tipo de motivo: traslado / fallecimiento / administrativo / otro`,
      "administrativo"
    );
    if (!motivoTipo) return;

    const detalle = prompt("Ingresa el detalle explicativo del archivado:", "Baja administrativa por término de tratamiento hospitalario.");
    store.archivarPaciente(id, { tipo: motivoTipo, detalle: detalle || '' });
    alert(`Expediente ${paciente.expediente} archivado correctamente.`);
    cerrarDrawer();
  };

  // 4. MODAL EDITAR
  window.abrirModalEditar = (id) => {
    const paciente = store.pacientes.find(p => p.id === id);
    if (!paciente) return;

    document.getElementById('drawer-title').textContent = `Editar: ${paciente.expediente}`;

    document.getElementById('drawer-body').innerHTML = `
      <form id="form-editar-paciente" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Nombre(s)</label>
            <input type="text" id="edit-nombre" class="form-control" value="${paciente.nombre}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Apellidos</label>
            <input type="text" id="edit-apellidos" class="form-control" value="${paciente.apellidos}" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="tel" id="edit-telefono" class="form-control" value="${paciente.telefono}" />
          </div>
          <div class="form-group">
            <label class="form-label">Estado Clínico</label>
            <select id="edit-estado" class="form-control">
              <option value="estable" ${paciente.estadoClinico === 'estable' ? 'selected' : ''}>Estable</option>
              <option value="observacion" ${paciente.estadoClinico === 'observacion' ? 'selected' : ''}>Observación</option>
              <option value="critico" ${paciente.estadoClinico === 'critico' ? 'selected' : ''}>Crítico</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Ubicación / Pabellón</label>
            <input type="text" id="edit-ubicacion" class="form-control" value="${paciente.ubicacion}" />
          </div>
          <div class="form-group">
            <label class="form-label">Médico Tratante</label>
            <input type="text" id="edit-medico" class="form-control" value="${paciente.medicoTratante}" />
          </div>
        </div>
      </form>
    `;

    document.getElementById('drawer-footer').innerHTML = `
      <button class="btn btn-outline" onclick="window.abrirDrawerDetalle(store.pacientes.find(p => p.id === '${id}'))">Regresar</button>
      <button class="btn btn-primary" id="btn-actualizar-datos">Actualizar Expediente</button>
    `;

    document.getElementById('btn-actualizar-datos').addEventListener('click', () => {
      store.actualizarPaciente(id, {
        nombre: document.getElementById('edit-nombre').value,
        apellidos: document.getElementById('edit-apellidos').value,
        telefono: document.getElementById('edit-telefono').value,
        estadoClinico: document.getElementById('edit-estado').value,
        ubicacion: document.getElementById('edit-ubicacion').value,
        medicoTratante: document.getElementById('edit-medico').value
      });
      window.abrirDrawerDetalle(store.pacientes.find(p => p.id === id));
    });
  };
}
