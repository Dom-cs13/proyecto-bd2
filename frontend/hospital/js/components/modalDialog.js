/**
 * Sistema Universal de Ventanas Flotantes Modales y Notificaciones (Alba Suite)
 * Reemplaza completamente los popups nativos del navegador (alert, prompt, confirm).
 */

let modalActivoCleanup = null;

function obtenerContenedorModal() {
  let cont = document.getElementById('modal-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'modal-container';
    document.body.appendChild(cont);
  }
  return cont;
}

function obtenerContenedorToast() {
  let cont = document.getElementById('toast-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toast-container';
    cont.className = 'toast-container';
    document.body.appendChild(cont);
  }
  return cont;
}

export function cerrarModalActivo() {
  if (modalActivoCleanup) {
    modalActivoCleanup();
    modalActivoCleanup = null;
  }
}

/**
 * Notificación Toast Flotante
 */
export function mostrarToast({ titulo, mensaje = '', tipo = 'success', duracion = 4200 }) {
  const container = obtenerContenedorToast();

  const toast = document.createElement('div');
  toast.className = `custom-toast custom-toast-${tipo}`;

  let icono = '✓';
  if (tipo === 'error') icono = '⚠️';
  if (tipo === 'warning') icono = '🔔';
  if (tipo === 'info') icono = 'ℹ️';

  toast.innerHTML = `
    <div class="custom-toast-icon">${icono}</div>
    <div class="custom-toast-content">
      <div class="custom-toast-title">${titulo}</div>
      ${mensaje ? `<div class="custom-toast-msg">${mensaje}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  // Trigger animación
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  const timer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duracion);

  toast.addEventListener('click', () => {
    clearTimeout(timer);
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 250);
  });
}

/**
 * Modal Genérico de Alerta (Reemplazo estilizado de window.alert)
 */
export function mostrarAlertaPersonalizada({ titulo, subtitulo = '', mensaje, tipo = 'info', textoBoton = 'Entendido' }) {
  return new Promise((resolve) => {
    cerrarModalActivo();
    const container = obtenerContenedorModal();

    let icono = 'ℹ️';
    let iconClass = 'custom-modal-icon-primary';
    if (tipo === 'error' || tipo === 'danger') {
      icono = '⚠️';
      iconClass = 'custom-modal-icon-danger';
    } else if (tipo === 'success') {
      icono = '✓';
      iconClass = 'custom-modal-icon-success';
    } else if (tipo === 'warning') {
      icono = '🔔';
      iconClass = 'custom-modal-icon-warning';
    }

    container.innerHTML = `
      <div class="custom-modal-backdrop" id="custom-modal-backdrop">
        <div class="custom-modal-card">
          <div class="custom-modal-header">
            <div class="custom-modal-icon-wrap ${iconClass}">${icono}</div>
            <div class="custom-modal-header-text">
              <h3 class="custom-modal-title">${titulo}</h3>
              ${subtitulo ? `<p class="custom-modal-subtitle">${subtitulo}</p>` : ''}
            </div>
            <button class="custom-modal-close-btn" id="modal-btn-close">&times;</button>
          </div>
          <div class="custom-modal-body">
            <p style="line-height: 1.5; color: var(--text-main);">${mensaje}</p>
          </div>
          <div class="custom-modal-footer">
            <button class="btn btn-primary" id="modal-btn-ok">${textoBoton}</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = document.getElementById('custom-modal-backdrop');
    requestAnimationFrame(() => backdrop.classList.add('open'));

    const cerrar = () => {
      backdrop.classList.remove('open');
      setTimeout(() => {
        container.innerHTML = '';
        resolve();
      }, 250);
    };

    modalActivoCleanup = cerrar;
    document.getElementById('modal-btn-close').addEventListener('click', cerrar);
    document.getElementById('modal-btn-ok').addEventListener('click', cerrar);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cerrar();
    });
  });
}

/**
 * Modal Flotante Específico para el Archivado Clínico Justificado
 */
export function mostrarModalArchivarPaciente(paciente, onConfirmar) {
  cerrarModalActivo();
  const container = obtenerContenedorModal();

  container.innerHTML = `
    <div class="custom-modal-backdrop" id="custom-modal-backdrop">
      <div class="custom-modal-card" style="max-width: 560px;">
        <div class="custom-modal-header">
          <div class="custom-modal-icon-wrap custom-modal-icon-danger">🗂️</div>
          <div class="custom-modal-header-text">
            <h3 class="custom-modal-title" style="color: #dc2626;">Archivado Clínico Justificado</h3>
            <p class="custom-modal-subtitle">Hospital General · Desactivación legal de expediente</p>
          </div>
          <button class="custom-modal-close-btn" id="modal-btn-close">&times;</button>
        </div>

        <form id="form-modal-archivar">
          <div class="custom-modal-body">
            <!-- Ficha del Paciente -->
            <div style="background-color: var(--bg-subtle); border-radius: var(--radius-md); padding: 14px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main);">${paciente.nombre} ${paciente.apellidos}</div>
                <div style="font-size: 0.78rem; color: var(--text-muted);">${paciente.curp} · Tel: ${paciente.telefono}</div>
              </div>
              <span class="badge-exp">${paciente.expediente}</span>
            </div>

            <!-- Advertencia Médica / Legal -->
            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: var(--radius-md); padding: 12px 14px;">
              <h5 style="font-size: 0.82rem; font-weight: 700; color: #991b1b; margin-bottom: 3px;">Regla de Integridad Histórica</h5>
              <p style="font-size: 0.78rem; color: #7f1d1d; line-height: 1.4;">
                El expediente no se elimina físicamente de MongoDB Atlas. Se marcará como inactivo/archivado y se mantendrán todas sus consultas, recetas y diagnósticos para fines legales.
              </p>
            </div>

            <!-- Formulario de Motivo -->
            <div class="form-group">
              <label class="form-label">Tipo de Motivo Legal *</label>
              <select id="modal-inp-motivo-tipo" class="form-control" required>
                <option value="administrativo">Baja médica / Término de tratamiento</option>
                <option value="traslado">Traslado formal a otra institución</option>
                <option value="fallecimiento">Fallecimiento del paciente</option>
                <option value="otro">Otro motivo justificado</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Detalle y Justificación Clínica *</label>
              <textarea
                id="modal-inp-motivo-detalle"
                class="form-control"
                rows="3"
                required
                style="resize: vertical; font-family: inherit;"
                placeholder="Describe la razón médica, clínica o legal del archivado..."
              >Baja médica por término de tratamiento hospitalario y alta clínica.</textarea>
            </div>
          </div>

          <div class="custom-modal-footer">
            <button type="button" class="btn btn-outline" id="modal-btn-cancelar">Cancelar</button>
            <button type="submit" class="btn btn-danger" id="modal-btn-confirmar-archivar">
              <span>🗂️</span> Confirmar Archivado
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const backdrop = document.getElementById('custom-modal-backdrop');
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const selTipo = document.getElementById('modal-inp-motivo-tipo');
  const txtDetalle = document.getElementById('modal-inp-motivo-detalle');

  // Ajustar texto por defecto según el motivo seleccionado
  selTipo.addEventListener('change', () => {
    const val = selTipo.value;
    if (val === 'administrativo') {
      txtDetalle.value = 'Baja médica por término de tratamiento hospitalario y alta clínica.';
    } else if (val === 'traslado') {
      txtDetalle.value = 'Traslado formal a otra institución médica para atención de tercer nivel.';
    } else if (val === 'fallecimiento') {
      txtDetalle.value = 'Fallecimiento registrado con certificado de defunción hospitalario emitido.';
    } else {
      txtDetalle.value = '';
    }
  });

  const cerrar = () => {
    backdrop.classList.remove('open');
    setTimeout(() => {
      container.innerHTML = '';
    }, 250);
  };

  modalActivoCleanup = cerrar;
  document.getElementById('modal-btn-close').addEventListener('click', cerrar);
  document.getElementById('modal-btn-cancelar').addEventListener('click', cerrar);

  const form = document.getElementById('form-modal-archivar');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const motivoTipo = selTipo.value;
    const detalle = txtDetalle.value.trim();

    cerrar();
    if (typeof onConfirmar === 'function') {
      onConfirmar({ tipo: motivoTipo, detalle });
    }
  });
}

/**
 * Modal Flotante Específico para Generar Órdenes de Laboratorio
 */
export function mostrarModalNuevaOrdenLab(pacientesActivos, onConfirmar) {
  cerrarModalActivo();
  const container = obtenerContenedorModal();

  container.innerHTML = `
    <div class="custom-modal-backdrop" id="custom-modal-backdrop">
      <div class="custom-modal-card" style="max-width: 540px;">
        <div class="custom-modal-header">
          <div class="custom-modal-icon-wrap custom-modal-icon-primary">🔬</div>
          <div class="custom-modal-header-text">
            <h3 class="custom-modal-title">Generar Orden de Examen Clínico</h3>
            <p class="custom-modal-subtitle">Hospital General · Unidad de Procesamiento Bioquímico</p>
          </div>
          <button class="custom-modal-close-btn" id="modal-btn-close">&times;</button>
        </div>

        <form id="form-modal-orden-lab">
          <div class="custom-modal-body">
            <div class="form-group">
              <label class="form-label">Paciente Destino *</label>
              <select id="lab-modal-paciente-select" class="form-control" required>
                ${pacientesActivos.map(p => `
                  <option value="${p.id}">${p.nombre} ${p.apellidos} (${p.expediente}) · ${p.ubicacion}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Tipo de Análisis Clínico *</label>
              <select id="lab-modal-tipo-select" class="form-control" required>
                <option value="Química Sanguínea (Glucosa & Perfil Renal)">Química Sanguínea (Glucosa & Perfil Renal)</option>
                <option value="Hematología Completa">Hematología Completa</option>
                <option value="Tiempos de Coagulación (TP y TTP)">Tiempos de Coagulación (TP y TTP)</option>
                <option value="Examen General de Orina (EGO)">Examen General de Orina (EGO)</option>
                <option value="Perfil Lipídico Completo">Perfil Lipídico Completo</option>
                <option value="Gasometría Arterial">Gasometría Arterial</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Médico Solicitante *</label>
              <input type="text" id="lab-modal-medico" class="form-control" required value="Dr. Rodrigo Palma" />
            </div>

            <div class="form-group">
              <label class="form-label">Observaciones Clínicas o Preparación de la Muestra</label>
              <textarea
                id="lab-modal-observaciones"
                class="form-control"
                rows="2"
                style="resize: vertical; font-family: inherit;"
                placeholder="Ej. Paciente en ayunas estricto de 8 horas. Muestra urgente..."
              >Toma de muestra en ayunas matutina.</textarea>
            </div>
          </div>

          <div class="custom-modal-footer">
            <button type="button" class="btn btn-outline" id="modal-btn-cancelar">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="modal-btn-submit-lab">
              <span>🔬</span> Emitir Orden de Laboratorio
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  const backdrop = document.getElementById('custom-modal-backdrop');
  requestAnimationFrame(() => backdrop.classList.add('open'));

  const cerrar = () => {
    backdrop.classList.remove('open');
    setTimeout(() => {
      container.innerHTML = '';
    }, 250);
  };

  modalActivoCleanup = cerrar;
  document.getElementById('modal-btn-close').addEventListener('click', cerrar);
  document.getElementById('modal-btn-cancelar').addEventListener('click', cerrar);

  const form = document.getElementById('form-modal-orden-lab');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const pacienteId = document.getElementById('lab-modal-paciente-select').value;
    const tipo = document.getElementById('lab-modal-tipo-select').value;
    const solicitante = document.getElementById('lab-modal-medico').value.trim();
    const observaciones = document.getElementById('lab-modal-observaciones').value.trim();

    cerrar();
    if (typeof onConfirmar === 'function') {
      onConfirmar({ pacienteId, tipo, solicitante, observaciones });
    }
  });
}

