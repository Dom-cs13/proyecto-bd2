import { store } from '../state.js';

export function inicializarVistaPolizas() {
  actualizarMetricasPolizas();
  poblarSelectsPolizas();
  renderPolizasTable();
  configurarEventosPolizas();
}

export function actualizarMetricasPolizas() {
  const kpis = store.getKPIs();
  const elTotal = document.getElementById('kpi-polizas-total');
  const elVigentes = document.getElementById('kpi-polizas-vigentes');
  const elPacientes = document.getElementById('kpi-polizas-pacientes');
  const elEmpresas = document.getElementById('kpi-polizas-empresas');

  if (elTotal) elTotal.textContent = kpis.totalPolizas || 0;
  if (elVigentes) elVigentes.textContent = kpis.polizasVigentes || 0;
  if (elPacientes) elPacientes.textContent = kpis.pacientesAsegurados || 0;

  if (elEmpresas) {
    const empresasSet = new Set(store.polizas.map(p => p.aseguradora?.nombreEmpresa).filter(Boolean));
    elEmpresas.textContent = empresasSet.size;
  }
}

export function poblarSelectsPolizas() {
  const selPacienteNueva = document.getElementById('pol-inp-paciente-select');
  const selPolizaAsoc = document.getElementById('asoc-sel-poliza');
  const selPacienteAsoc = document.getElementById('asoc-sel-paciente');

  const pacientesActivos = store.pacientes.filter(p => p.estadoArchivo === 'activo');

  if (selPacienteNueva) {
    selPacienteNueva.innerHTML = `
      <option value="">-- Dejar disponible (sin asociar aún) --</option>
      ${pacientesActivos.map(p => `
        <option value="${p.id}">${p.nombre} ${p.apellidos} (${p.expediente}) · DPI: ${p.curp}</option>
      `).join('')}
    `;
  }

  if (selPolizaAsoc) {
    selPolizaAsoc.innerHTML = `
      <option value="">-- Seleccionar Póliza --</option>
      ${store.polizas.map(pol => `
        <option value="${pol.idPoliza}">
          ${pol.idPoliza} · ${pol.aseguradora.nombreEmpresa} (${pol.cobertura} - ${pol.porcentajeCobertura}%) ${pol.pacienteNombre && pol.pacienteNombre !== 'Sin asignar' ? `[Asignada a: ${pol.pacienteNombre}]` : '[Disponible]'}
        </option>
      `).join('')}
    `;
  }

  if (selPacienteAsoc) {
    selPacienteAsoc.innerHTML = `
      <option value="">-- Seleccionar Paciente --</option>
      ${pacientesActivos.map(p => `
        <option value="${p.id}">
          ${p.nombre} ${p.apellidos} (${p.expediente}) ${p.detallesInstitucion?.seguro ? `[Seguro: ${p.detallesInstitucion.seguro.aseguradora}]` : '[Sin Seguro]'}
        </option>
      `).join('')}
    `;
  }
}

export function renderPolizasTable(containerId = 'polizas-table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const polizas = store.getPolizasFiltradas();

  if (polizas.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 40px; text-align: center;">
        <p style="color: var(--text-muted); font-size: 1rem;">No se encontraron pólizas con los filtros de búsqueda.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = polizas.map(p => {
    const esVigente = p.estado === 'vigente';
    const estadoBg = esVigente ? '#ecfdf5' : '#fef2f2';
    const estadoColor = esVigente ? '#047857' : '#dc2626';
    const asignada = p.pacienteId && p.pacienteNombre !== 'Sin asignar';

    return `
      <tr>
        <td>
          <span class="badge-exp" style="background-color: #eff6ff; color: #1e40af; font-weight: 700;">
            🛡️ ${p.idPoliza}
          </span>
        </td>
        <td>
          <div>
            <div style="font-weight: 600; color: var(--text-main);">${p.aseguradora.nombreEmpresa}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">NIT: ${p.aseguradora.nitIdentificador} · Tel: ${p.aseguradora.telefono}</div>
          </div>
        </td>
        <td>
          <div>
            <span class="badge-tag" style="background-color: var(--badge-cyan-bg); color: var(--badge-cyan-text); font-weight: 700;">
              ${p.cobertura}
            </span>
            <div style="font-size: 0.8rem; font-weight: 700; color: #047857; margin-top: 4px;">
              Cobertura: ${p.porcentajeCobertura}%
            </div>
          </div>
        </td>
        <td>
          <div style="font-size: 0.82rem; color: var(--text-main);">
            <strong>Del:</strong> ${p.fechaInicio}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">
            <strong>Al:</strong> ${p.fechaVencimiento}
          </div>
        </td>
        <td>
          ${asignada ? `
            <div>
              <div style="font-weight: 600; color: var(--primary);">👤 ${p.pacienteNombre}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${p.expediente}</div>
            </div>
          ` : `
            <span style="font-size: 0.78rem; background-color: #f1f5f9; color: #64748b; padding: 4px 10px; border-radius: 12px; font-weight: 600;">
              Disponible / Vacante
            </span>
          `}
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; background-color: ${estadoBg}; color: ${estadoColor};">
            <span class="status-dot ${esVigente ? 'active' : 'inactive'}"></span>
            ${p.estado}
          </span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="window.abrirModalAsignarPoliza('${p.idPoliza}')">
            ${asignada ? 'Reasignar' : 'Vincular'}
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
              <th>No. Póliza</th>
              <th>Aseguradora (ER)</th>
              <th>Cobertura Médica</th>
              <th>Periodo de Vigencia</th>
              <th>Paciente Asociado</th>
              <th>Estado</th>
              <th>Acción</th>
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

function configurarEventosPolizas() {
  // Prellenar fechas por defecto
  const inpInicio = document.getElementById('pol-inp-inicio');
  const inpFin = document.getElementById('pol-inp-fin');
  if (inpInicio && !inpInicio.value) {
    const hoy = new Date().toISOString().slice(0, 10);
    inpInicio.value = hoy;
    if (inpFin && !inpFin.value) {
      const fin = new Date();
      fin.setFullYear(fin.getFullYear() + 1);
      inpFin.value = fin.toISOString().slice(0, 10);
    }
  }

  // Filtrado numérico estricto de teléfono de aseguradora (8 dígitos)
  const telAsegInp = document.getElementById('pol-inp-tel-aseg');
  if (telAsegInp) {
    telAsegInp.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });
  }

  // Búsqueda en catálogo
  const searchInput = document.getElementById('pol-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.setFiltroPolizaTexto(e.target.value);
      renderPolizasTable();
    });
  }

  // Formulario Nueva Póliza
  const formNueva = document.getElementById('form-nueva-poliza');
  if (formNueva) {
    formNueva.addEventListener('submit', (e) => {
      e.preventDefault();

      const telVal = (document.getElementById('pol-inp-tel-aseg').value || '').trim();
      if (!/^\d{8}$/.test(telVal)) {
        alert('El teléfono de la aseguradora debe contener exactamente 8 dígitos numéricos enteros.');
        return;
      }

      const idPoliza = document.getElementById('pol-inp-codigo').value.trim().toUpperCase();
      const pacienteId = document.getElementById('pol-inp-paciente-select').value;
      const paciente = store.pacientes.find(p => p.id === pacienteId);

      const nuevaPoliza = {
        id: `pol-${Date.now()}`,
        idPoliza,
        cobertura: document.getElementById('pol-inp-cobertura').value,
        porcentajeCobertura: Number(document.getElementById('pol-inp-porcentaje').value),
        fechaInicio: document.getElementById('pol-inp-inicio').value,
        fechaVencimiento: document.getElementById('pol-inp-fin').value,
        estado: document.getElementById('pol-inp-estado').value,
        pacienteId: paciente ? paciente.id : null,
        expediente: paciente ? paciente.expediente : null,
        pacienteNombre: paciente ? `${paciente.nombre} ${paciente.apellidos}` : 'Sin asignar',
        aseguradora: {
          idAseguradora: `ASEG-${Math.floor(10 + Math.random() * 90)}`,
          nombreEmpresa: document.getElementById('pol-inp-empresa').value.trim(),
          nitIdentificador: document.getElementById('pol-inp-nit').value.trim(),
          telefono: telVal
        }
      };

      store.agregarPoliza(nuevaPoliza);
      formNueva.reset();
      actualizarMetricasPolizas();
      poblarSelectsPolizas();
      renderPolizasTable();

      alert(`¡Póliza ${nuevaPoliza.idPoliza} registrada exitosamente${paciente ? ` y asociada a ${paciente.nombre} ${paciente.apellidos}` : ''}!`);
    });
  }

  // Formulario Asociación Rápida
  const formAsoc = document.getElementById('form-asociar-poliza-existente');
  if (formAsoc) {
    formAsoc.addEventListener('submit', (e) => {
      e.preventDefault();
      const polizaCodigo = document.getElementById('asoc-sel-poliza').value;
      const pacienteId = document.getElementById('asoc-sel-paciente').value;

      if (!polizaCodigo || !pacienteId) {
        alert('Por favor selecciona una póliza y un paciente para vincular.');
        return;
      }

      const ok = store.asociarPolizaAPaciente(polizaCodigo, pacienteId);
      if (ok) {
        const paciente = store.pacientes.find(p => p.id === pacienteId);
        actualizarMetricasPolizas();
        poblarSelectsPolizas();
        renderPolizasTable();
        alert(`¡Póliza ${polizaCodigo} vinculada con éxito al paciente ${paciente.nombre} ${paciente.apellidos} (${paciente.expediente})!`);
      } else {
        alert('No se pudo completar la asociación de la póliza.');
      }
    });
  }

  // Modal para vincular rápido desde la tabla
  window.abrirModalAsignarPoliza = (polizaCodigo) => {
    const selPoliza = document.getElementById('asoc-sel-poliza');
    if (selPoliza) {
      selPoliza.value = polizaCodigo;
      const formCard = document.getElementById('form-asociar-poliza-existente');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };
}
