import { store } from '../state.js';
import { mostrarToast, mostrarAlertaPersonalizada, mostrarModalNuevaOrdenLab } from './modalDialog.js';

let modoVistaOrdenes = 'ordenes'; // 'ordenes' | 'pacientes'

export function actualizarMetricasLaboratorio() {
  const kpis = store.getKPIs();
  const pacientesAsoc = store.getPacientesPorLaboratorio();

  const totalOrdEl = document.getElementById('kpi-lab-total-ordenes');
  const unidadesEl = document.getElementById('kpi-lab-unidades');
  const examenesEl = document.getElementById('kpi-lab-examenes');
  const pacAsocEl = document.getElementById('kpi-lab-pacientes-asoc');

  if (totalOrdEl) totalOrdEl.textContent = kpis.totalOrdenesLab || store.laboratorios.length;
  if (unidadesEl) unidadesEl.textContent = kpis.totalUnidadesLab || store.unidadesLaboratorio.length;
  if (examenesEl) examenesEl.textContent = kpis.totalTiposExamenes || store.tiposExamenes.length;
  if (pacAsocEl) pacAsocEl.textContent = pacientesAsoc.length;
}

export function poblarSelectsLaboratorio() {
  const filtroSelect = document.getElementById('lab-filtro-unidad-select');
  if (filtroSelect) {
    const valorActual = filtroSelect.value;
    filtroSelect.innerHTML = `
      <option value="todos">Todos los Laboratorios</option>
      ${store.unidadesLaboratorio.map(u => `
        <option value="${u.id}" ${valorActual === u.id ? 'selected' : ''}>${u.nombre} (${u.codigo})</option>
      `).join('')}
    `;
  }

  const formLabSelect = document.getElementById('ex-inp-laboratorio');
  if (formLabSelect) {
    const valorActual = formLabSelect.value;
    formLabSelect.innerHTML = `
      <option value="">-- Seleccionar Laboratorio Emisor --</option>
      ${store.unidadesLaboratorio.map(u => `
        <option value="${u.id}" ${valorActual === u.id ? 'selected' : ''}>${u.nombre} (${u.codigo})</option>
      `).join('')}
    `;
  }
}

export function renderLaboratorioTable(containerId = 'laboratorio-table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const ordenes = store.getLaboratoriosFiltrados();

  if (ordenes.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 40px; text-align: center;">
        <p style="color: var(--text-muted); font-size: 1rem;">No se encontraron órdenes de laboratorio con los filtros aplicados.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = ordenes.map(lab => {
    const esCompletado = lab.estado === 'Completado';
    const estadoBg = esCompletado ? '#ecfdf5' : '#fef3c7';
    const estadoColor = esCompletado ? '#047857' : '#d97706';
    const dotClass = esCompletado ? 'active' : 'warning';

    const fechaOrdenStr = new Date(lab.fechaOrden).toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const labNombre = lab.laboratorioNombre || 'Laboratorio Central';

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
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary); background: #e0f2fe; padding: 2px 8px; border-radius: 6px; display: inline-block; margin-bottom: 3px;">
            🏥 ${labNombre}
          </span>
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--text-main);">
            ${lab.tipoExamen}
          </div>
        </td>
        <td>
          <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600; background-color: ${estadoBg}; color: ${estadoColor};">
            <span class="status-dot ${dotClass}"></span>
            ${lab.estado}
          </span>
          ${lab.prioridad && lab.prioridad !== 'Normal' ? `
            <div style="font-size: 0.72rem; font-weight: 700; color: #b91c1c; margin-top: 2px;">⚡ ${lab.prioridad}</div>
          ` : ''}
        </td>
        <td>
          <div style="font-size: 0.85rem; font-weight: 500; color: var(--text-main);">${lab.resultadoResumen || 'Muestra recolectada'}</div>
          <div style="font-size: 0.75rem; color: var(--text-light);">${(lab.valores || []).length} parámetros evaluados</div>
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
              <th>Laboratorio / Examen</th>
              <th>Estado & Prioridad</th>
              <th>Hallazgo Clínico</th>
              <th>Médico / Fecha</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div>Total órdenes mostradas: <strong>${ordenes.length}</strong></div>
      </div>
    </div>
  `;

  container.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.getAttribute('data-lab-id');
      if (window.abrirDetalleLaboratorio) window.abrirDetalleLaboratorio(id);
    });
  });
}

export function renderPacientesAsociadosTable(containerId = 'laboratorio-pacientes-asociados-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const grupos = store.getPacientesPorLaboratorio();

  if (grupos.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 40px; text-align: center;">
        <p style="color: var(--text-muted); font-size: 1rem;">No hay pacientes con órdenes de laboratorio registradas.</p>
      </div>
    `;
    return;
  }

  const cardsHtml = grupos.map(p => {
    const labsBadges = p.listaLaboratorios.map(l => `
      <div style="background: white; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <strong style="color: var(--primary); font-size: 0.85rem;">🏥 ${l.nombre}</strong>
          <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; color: #475569;">
            ${l.totalExamenes} examen(es)
          </span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-main); margin-top: 4px;">
          ${l.examenes.join(' · ')}
        </div>
      </div>
    `).join('');

    return `
      <div class="card" style="padding: 16px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main);">
              👤 ${p.pacienteNombre}
            </h4>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
              ${p.expediente} · Ubicación: <strong>${p.ubicacion}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="background: #e0f2fe; color: #0284c7; font-weight: 700; font-size: 0.8rem; padding: 4px 10px; border-radius: 12px;">
              ${p.totalLaboratoriosAsociados} Laboratorio(s) Vinculado(s)
            </span>
          </div>
        </div>

        <div>
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-light); text-transform: uppercase; margin-bottom: 6px;">
            Laboratorios y Estudios Solicitados:
          </div>
          ${labsBadges}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div>
      <div style="margin-bottom: 14px;">
        <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin: 0;">Pacientes Canalizados a Laboratorio</h3>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin: 2px 0 0 0;">Relación directa de pacientes atendidos y laboratorios asignados</p>
      </div>
      <div>${cardsHtml}</div>
    </div>
  `;
}

export function renderUnidadesLaboratorio(containerId = 'unidades-laboratorio-cards-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const unidades = store.getUnidadesLaboratorioFiltradas();

  if (unidades.length === 0) {
    container.innerHTML = `
      <div style="padding: 24px; text-align: center; background: white; border-radius: 8px; border: 1px solid var(--border-color);">
        <p style="color: var(--text-muted); margin: 0;">No se encontraron unidades de laboratorio con el filtro aplicado.</p>
      </div>
    `;
    return;
  }

  const cardsHtml = unidades.map(u => {
    const totalExamenesOfrecidos = store.tiposExamenes.filter(ex =>
      ex.laboratorioId === u.id || ex.laboratorioCodigo === u.codigo || ex.laboratorioNombre === u.nombre
    ).length;

    const totalOrdenesAtendidas = store.laboratorios.filter(o =>
      o.laboratorioId === u.id || o.laboratorioNombre === u.nombre
    ).length;

    return `
      <div class="card" style="padding: 16px; background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge-exp" style="background: #e0f2fe; color: #0369a1; font-weight: 800;">${u.codigo}</span>
              <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main);">${u.nombre}</h4>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">
              Área: <strong>${u.tipo}</strong> · Ubicación: <strong>${u.ubicacion}</strong>
            </div>
          </div>
          <span style="background: #ecfdf5; color: #047857; font-size: 0.75rem; font-weight: 700; padding: 4px 8px; border-radius: 12px;">
            ● ${u.estado.toUpperCase()}
          </span>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-main); margin-bottom: 10px; background: var(--bg-subtle); padding: 8px 10px; border-radius: 6px;">
          ${u.descripcion || 'Servicio de diagnóstico clínico y toma de muestras.'}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.78rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
          <div>👨‍🔬 <strong>Jefe:</strong> ${u.responsable}</div>
          <div>📞 <strong>Tel:</strong> ${u.telefono}</div>
          <div>⏰ <strong>Horario:</strong> ${u.horario}</div>
          <div>🔬 <strong>Catálogo:</strong> ${totalExamenesOfrecidos} examen(es) | <strong>Órdenes:</strong> ${totalOrdenesAtendidas}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHtml;
}

export function renderCatalogoExamenes(containerId = 'catalogo-examenes-table-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const examenes = store.getTiposExamenesFiltrados();

  if (examenes.length === 0) {
    container.innerHTML = `
      <div class="table-card" style="padding: 30px; text-align: center;">
        <p style="color: var(--text-muted); margin: 0;">No se encontraron tipos de exámenes con el filtro seleccionado.</p>
      </div>
    `;
    return;
  }

  const rowsHtml = examenes.map(ex => `
    <tr>
      <td>
        <span class="badge-exp" style="background-color: #f5f3ff; color: #7c3aed; font-weight: 800;">${ex.codigoExamen}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: var(--text-main);">${ex.nombre}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Muestra: ${ex.tipoMuestra}</div>
      </td>
      <td>
        <span style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">
          ${ex.laboratorioNombre}
        </span>
      </td>
      <td>
        <span class="badge-tag" style="background-color: #f1f5f9; color: #334155;">
          ${ex.tiempoEstimadoHoras} hrs
        </span>
      </td>
      <td>
        <div style="font-size: 0.78rem; color: var(--text-main);">
          ${(ex.parametrosBase || []).slice(0, 3).join(', ')}${(ex.parametrosBase || []).length > 3 ? '...' : ''}
        </div>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="table-card">
      <div class="table-responsive">
        <table class="clinical-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Análisis Clínico</th>
              <th>Laboratorio</th>
              <th>Tiempo</th>
              <th>Parámetros Base</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div class="table-footer">
        <div>Total tipos de exámenes: <strong>${examenes.length}</strong></div>
      </div>
    </div>
  `;
}

export function inicializarVistaLaboratorio() {
  actualizarMetricasLaboratorio();
  poblarSelectsLaboratorio();
  renderLaboratorioTable('laboratorio-table-container');
  renderPacientesAsociadosTable('laboratorio-pacientes-asociados-container');
  renderUnidadesLaboratorio('unidades-laboratorio-cards-container');
  renderCatalogoExamenes('catalogo-examenes-table-container');

  // 1. Manejo de Pestañas Secundarias
  const btnSubOrdenes = document.getElementById('subtab-btn-ordenes');
  const btnSubUnidades = document.getElementById('subtab-btn-unidades');
  const btnSubCatalogo = document.getElementById('subtab-btn-catalogo');

  const subviewOrdenes = document.getElementById('subview-ordenes');
  const subviewUnidades = document.getElementById('subview-unidades');
  const subviewCatalogo = document.getElementById('subview-catalogo');

  const activarSubtab = (tab) => {
    store.setFiltroLabSubtab(tab);

    [btnSubOrdenes, btnSubUnidades, btnSubCatalogo].forEach(b => {
      if (b) {
        b.style.background = 'transparent';
        b.style.color = 'var(--text-main)';
        b.classList.add('btn-outline');
      }
    });

    [subviewOrdenes, subviewUnidades, subviewCatalogo].forEach(v => {
      if (v) v.style.display = 'none';
    });

    if (tab === 'ordenes') {
      if (btnSubOrdenes) {
        btnSubOrdenes.style.background = 'var(--primary)';
        btnSubOrdenes.style.color = 'white';
        btnSubOrdenes.classList.remove('btn-outline');
      }
      if (subviewOrdenes) subviewOrdenes.style.display = 'block';
      renderLaboratorioTable('laboratorio-table-container');
    } else if (tab === 'unidades') {
      if (btnSubUnidades) {
        btnSubUnidades.style.background = 'var(--primary)';
        btnSubUnidades.style.color = 'white';
        btnSubUnidades.classList.remove('btn-outline');
      }
      if (subviewUnidades) subviewUnidades.style.display = 'block';
      renderUnidadesLaboratorio('unidades-laboratorio-cards-container');
    } else if (tab === 'catalogo') {
      if (btnSubCatalogo) {
        btnSubCatalogo.style.background = 'var(--primary)';
        btnSubCatalogo.style.color = 'white';
        btnSubCatalogo.classList.remove('btn-outline');
      }
      if (subviewCatalogo) subviewCatalogo.style.display = 'block';
      renderCatalogoExamenes('catalogo-examenes-table-container');
    }
  };

  if (btnSubOrdenes) btnSubOrdenes.addEventListener('click', () => activarSubtab('ordenes'));
  if (btnSubUnidades) btnSubUnidades.addEventListener('click', () => activarSubtab('unidades'));
  if (btnSubCatalogo) btnSubCatalogo.addEventListener('click', () => activarSubtab('catalogo'));

  // 2. Buscadores y Filtros
  const searchInput = document.getElementById('lab-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      store.setFiltroLabTexto(e.target.value);
      renderLaboratorioTable('laboratorio-table-container');
    });
  }

  const filtroUnidadSelect = document.getElementById('lab-filtro-unidad-select');
  if (filtroUnidadSelect) {
    filtroUnidadSelect.addEventListener('change', (e) => {
      store.setFiltroLabUnidad(e.target.value);
      renderLaboratorioTable('laboratorio-table-container');
    });
  }

  const searchUnidadesInp = document.getElementById('search-unidades-input');
  if (searchUnidadesInp) {
    searchUnidadesInp.addEventListener('input', (e) => {
      store.setFiltroLabUnidadTexto(e.target.value);
      renderUnidadesLaboratorio('unidades-laboratorio-cards-container');
    });
  }

  const searchCatInp = document.getElementById('search-catalogo-input');
  if (searchCatInp) {
    searchCatInp.addEventListener('input', (e) => {
      store.setFiltroLabExamenTexto(e.target.value);
      renderCatalogoExamenes('catalogo-examenes-table-container');
    });
  }

  // 3. Toggle de Modo de Vista (Órdenes vs. Pacientes Asociados)
  const btnToggleVista = document.getElementById('btn-toggle-modo-vista');
  const tableContainer = document.getElementById('laboratorio-table-container');
  const pacientesAsocContainer = document.getElementById('laboratorio-pacientes-asociados-container');

  if (btnToggleVista) {
    btnToggleVista.addEventListener('click', () => {
      if (modoVistaOrdenes === 'ordenes') {
        modoVistaOrdenes = 'pacientes';
        btnToggleVista.textContent = '📄 Ver Tabla de Órdenes';
        if (tableContainer) tableContainer.style.display = 'none';
        if (pacientesAsocContainer) pacientesAsocContainer.style.display = 'block';
        renderPacientesAsociadosTable('laboratorio-pacientes-asociados-container');
      } else {
        modoVistaOrdenes = 'ordenes';
        btnToggleVista.textContent = '👥 Ver Pacientes Asociados';
        if (tableContainer) tableContainer.style.display = 'block';
        if (pacientesAsocContainer) pacientesAsocContainer.style.display = 'none';
        renderLaboratorioTable('laboratorio-table-container');
      }
    });
  }

  // 4. Modal para Generar Nueva Orden de Examen
  const btnNuevaOrden = document.getElementById('btn-nueva-orden-lab');
  if (btnNuevaOrden) {
    btnNuevaOrden.addEventListener('click', () => {
      const pacientesActivos = store.pacientes.filter(p => p.estadoArchivo === 'activo');
      if (pacientesActivos.length === 0) {
        mostrarAlertaPersonalizada({
          titulo: 'Sin Pacientes Activos',
          mensaje: 'No hay pacientes activos disponibles para emitir órdenes de laboratorio.',
          tipo: 'warning'
        });
        return;
      }

      mostrarModalNuevaOrdenLab(
        pacientesActivos,
        async ({ pacienteId, laboratorioId, laboratorioNombre, tipo, prioridad, solicitante, observaciones }) => {
          const paciente = store.pacientes.find(p => p.id === pacienteId);
          if (!paciente) return;

          const nuevaOrden = {
            id: `lab-${Date.now()}`,
            codigoOrden: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
            pacienteId: paciente.id,
            expediente: paciente.expediente,
            pacienteNombre: `${paciente.nombre} ${paciente.apellidos}`,
            laboratorioId,
            laboratorioNombre,
            tipoExamen: tipo,
            prioridad: prioridad || 'Normal',
            fechaOrden: new Date().toISOString(),
            fechaResultado: null,
            solicitante: solicitante || 'Dr. Rodrigo Palma',
            estado: 'En proceso',
            resultadoResumen: 'Muestra recolectada y canalizada a procesamiento',
            valores: [],
            observacionesTecnicas: observaciones || 'Toma de muestra según protocolo institucional.'
          };

          try { await store.agregarOrdenLaboratorio(nuevaOrden); } catch (error) { return mostrarToast({ titulo: 'No se pudo guardar', mensaje: error.message, tipo: 'error' }); }
          renderLaboratorioTable('laboratorio-table-container');
          renderPacientesAsociadosTable('laboratorio-pacientes-asociados-container');
          actualizarMetricasLaboratorio();

          mostrarToast({
            titulo: 'Orden Emitida Exitosamente',
            mensaje: `Orden ${nuevaOrden.codigoOrden} generada para ${nuevaOrden.pacienteNombre} en ${nuevaOrden.laboratorioNombre}.`,
            tipo: 'success'
          });
        },
        {
          unidadesLab: store.unidadesLaboratorio,
          tiposExamenes: store.tiposExamenes,
          doctoresActivos: store.doctores
        }
      );
    });
  }

  // 5. Formulario de Creación de Unidad de Laboratorio
  const formLab = document.getElementById('form-nuevo-laboratorio');
  if (formLab) {
    const codInp = document.getElementById('lab-inp-codigo');
    if (codInp) {
      codInp.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
      });
    }

    const telInp = document.getElementById('lab-inp-telefono');
    if (telInp) {
      telInp.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
      });
    }

    formLab.addEventListener('submit', async (e) => {
      e.preventDefault();

      const codigo = (document.getElementById('lab-inp-codigo').value || '').trim().toUpperCase();
      const tipo = document.getElementById('lab-inp-tipo').value;
      const nombre = (document.getElementById('lab-inp-nombre').value || '').trim();
      const responsable = (document.getElementById('lab-inp-responsable').value || '').trim();
      const ubicacion = (document.getElementById('lab-inp-ubicacion').value || '').trim();
      const tel = (document.getElementById('lab-inp-telefono').value || '').trim();
      const correo = (document.getElementById('lab-inp-correo').value || '').trim();
      const horario = (document.getElementById('lab-inp-horario').value || '').trim();
      const descripcion = (document.getElementById('lab-inp-descripcion').value || '').trim();

      if (!/^\d{8}$/.test(tel)) {
        mostrarAlertaPersonalizada({
          titulo: 'Teléfono Inválido',
          mensaje: 'El teléfono del laboratorio debe contener exactamente 8 dígitos numéricos enteros.',
          tipo: 'warning'
        });
        return;
      }

      const nuevoLab = {
        id: `lab-uni-${Date.now()}`,
        codigo,
        nombre,
        tipo,
        responsable,
        ubicacion,
        telefono: tel,
        correo: correo || 'lab@hospitalgeneral.gob.gt',
        horario: horario || '24 Horas',
        descripcion,
        estado: 'activo'
      };

      try { await store.agregarUnidadLaboratorio(nuevoLab); } catch (error) { return mostrarToast({ titulo: 'No se pudo guardar', mensaje: error.message, tipo: 'error' }); }
      formLab.reset();
      poblarSelectsLaboratorio();
      renderUnidadesLaboratorio('unidades-laboratorio-cards-container');
      actualizarMetricasLaboratorio();

      mostrarToast({
        titulo: 'Laboratorio Registrado',
        mensaje: `La unidad ${nuevoLab.nombre} (${nuevoLab.codigo}) ha sido creada en MongoDB Atlas.`,
        tipo: 'success'
      });
    });
  }

  // 6. Formulario de Creación de Tipo de Examen
  const formEx = document.getElementById('form-nuevo-tipo-examen');
  if (formEx) {
    const codExInp = document.getElementById('ex-inp-codigo');
    if (codExInp) {
      codExInp.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
      });
    }

    const tiempoInp = document.getElementById('ex-inp-tiempo');
    if (tiempoInp) {
      tiempoInp.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }

    formEx.addEventListener('submit', async (e) => {
      e.preventDefault();

      const labId = document.getElementById('ex-inp-laboratorio').value;
      const codigoExamen = (document.getElementById('ex-inp-codigo').value || '').trim().toUpperCase();
      const categoria = (document.getElementById('ex-inp-categoria').value || '').trim();
      const nombre = (document.getElementById('ex-inp-nombre').value || '').trim();
      const tipoMuestra = (document.getElementById('ex-inp-muestra').value || '').trim();
      const tiempoEstimadoHoras = Number(document.getElementById('ex-inp-tiempo').value) || 4;
      const parametrosStr = document.getElementById('ex-inp-parametros').value || '';
      const indicaciones = (document.getElementById('ex-inp-indicaciones').value || '').trim();

      const labObj = store.unidadesLaboratorio.find(u => u.id === labId || u.codigo === labId);

      const nuevoExamen = {
        id: `tipo-ex-${Date.now()}`,
        codigoExamen,
        laboratorioId: labId,
        laboratorioCodigo: labObj ? labObj.codigo : '',
        laboratorioNombre: labObj ? labObj.nombre : 'Laboratorio General',
        nombre,
        categoria,
        tipoMuestra,
        tiempoEstimadoHoras,
        parametrosBase: parametrosStr ? parametrosStr.split(',').map(s => s.trim()).filter(Boolean) : [],
        indicacionesPaciente: indicaciones,
        estado: 'activo'
      };

      try { await store.agregarTipoExamen(nuevoExamen); } catch (error) { return mostrarToast({ titulo: 'No se pudo guardar', mensaje: error.message, tipo: 'error' }); }
      formEx.reset();
      renderCatalogoExamenes('catalogo-examenes-table-container');
      actualizarMetricasLaboratorio();

      mostrarToast({
        titulo: 'Examen Agregado al Catálogo',
        mensaje: `El análisis ${nuevoExamen.nombre} se asoció al laboratorio ${nuevoExamen.laboratorioNombre}.`,
        tipo: 'success'
      });
    });
  }
}
