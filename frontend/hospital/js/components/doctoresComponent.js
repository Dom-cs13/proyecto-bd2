import { store } from '../state.js';
import { mostrarToast, mostrarAlertaPersonalizada } from './modalDialog.js';

export function inicializarVistaDoctores() {
  actualizarMetricasDoctores();
  renderDoctoresTable();
  configurarEventosDoctores();
}

export function actualizarMetricasDoctores() {
  const kpis = store.getKPIs();
  const elTotal = document.getElementById('kpi-doctores-total');
  const elTurno = document.getElementById('kpi-doctores-turno');
  const elEspec = document.getElementById('kpi-doctores-especialidades');
  const elPacientes = document.getElementById('kpi-doctores-pacientes');

  if (elTotal) elTotal.textContent = kpis.totalDoctores || 0;
  if (elTurno) elTurno.textContent = kpis.doctoresActivos || 0;

  if (elEspec) {
    const especSet = new Set(store.doctores.map(d => d.especialidad).filter(Boolean));
    elEspec.textContent = especSet.size;
  }

  if (elPacientes) {
    elPacientes.textContent = store.pacientes.filter(p => p.estadoArchivo === 'activo' && p.medicoTratante).length;
  }
}

export function renderDoctoresTable(containerId = 'doctores-table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const doctores = store.getDoctoresFiltrados();

  if (doctores.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 40px; text-align: center;">
        <p style="color: var(--text-muted); font-size: 1rem;">No se encontraron médicos con los filtros aplicados.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = doctores.map(d => {
    const esActivo = d.estado === 'activo' || d.estado === 'de turno';
    const estadoBg = esActivo ? '#ecfdf5' : '#fef3c7';
    const estadoColor = esActivo ? '#047857' : '#d97706';

    const nombreCompleto = `Dr(a). ${d.nombre} ${d.apellidos}`;
    const pacientesAsignados = store.pacientes.filter(p => 
      p.estadoArchivo === 'activo' && 
      (p.medicoTratante === nombreCompleto || p.medicoTratante?.includes(d.apellidos))
    ).length;

    const iniciales = `${(d.nombre[0] || '')}${(d.apellidos[0] || '')}`.toUpperCase();

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="patient-avatar-circle" style="width: 38px; height: 38px; font-size: 0.88rem; background-color: var(--primary-light); color: var(--primary);">
              ${iniciales}
            </div>
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${nombreCompleto}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${d.correo}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge-exp" style="background-color: #f1f5f9; color: #334155;">
            ${d.idColegiado}
          </span>
        </td>
        <td>
          <span class="badge-tag" style="background-color: var(--badge-cyan-bg); color: var(--badge-cyan-text); font-weight: 700;">
            ${d.especialidad}
          </span>
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-main);">Tel: ${d.telefono}</div>
        </td>
        <td>
          <div style="font-size: 0.82rem; color: var(--text-muted);">${d.horario || 'Turno Completo'}</div>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; background-color: ${estadoBg}; color: ${estadoColor};">
            <span class="status-dot ${esActivo ? 'active' : 'warning'}"></span>
            ${d.estado}
          </span>
        </td>
        <td>
          <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 700; background-color: #eff6ff; color: #1d4ed8;">
            👥 ${pacientesAsignados} pacientes
          </span>
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
              <th>Médico / Facultativo</th>
              <th>No. Colegiado</th>
              <th>Especialidad</th>
              <th>Contacto</th>
              <th>Turno Asignado</th>
              <th>Estado</th>
              <th>Pacientes a Cargo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function configurarEventosDoctores() {
  const telInp = document.getElementById('doc-inp-telefono');
  if (telInp) {
    telInp.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });
  }

  const searchInp = document.getElementById('doc-search-input');
  if (searchInp) {
    searchInp.addEventListener('input', (e) => {
      store.setFiltroDoctorTexto(e.target.value);
      renderDoctoresTable();
    });
  }

  const form = document.getElementById('form-nuevo-doctor');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const telVal = (document.getElementById('doc-inp-telefono').value || '').trim();
      if (!/^\d{8}$/.test(telVal)) {
        mostrarAlertaPersonalizada({
          titulo: 'Teléfono Inválido',
          mensaje: 'El teléfono del médico debe contener exactamente 8 dígitos numéricos enteros.',
          tipo: 'error'
        });
        return;
      }

      const nuevoDoctor = {
        id: `doc-${Date.now()}`,
        idColegiado: document.getElementById('doc-inp-colegiado').value.trim().toUpperCase(),
        nombre: document.getElementById('doc-inp-nombre').value.trim(),
        apellidos: document.getElementById('doc-inp-apellidos').value.trim(),
        especialidad: document.getElementById('doc-inp-especialidad').value,
        telefono: telVal,
        correo: document.getElementById('doc-inp-correo').value.trim(),
        horario: document.getElementById('doc-inp-horario').value,
        estado: document.getElementById('doc-inp-estado').value,
        institucionId: 'I1'
      };

      await store.agregarDoctor(nuevoDoctor);
      form.reset();
      actualizarMetricasDoctores();
      renderDoctoresTable();

      mostrarToast({
        titulo: 'Médico Registrado en MongoDB Atlas',
        mensaje: `Dr(a). ${nuevoDoctor.nombre} ${nuevoDoctor.apellidos} habilitado(a) como médico tratante (${nuevoDoctor.especialidad}).`,
        tipo: 'success'
      });
    });
  }
}
