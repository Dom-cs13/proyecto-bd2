import { store } from '../state.js';
import { mostrarErrorHttp, mostrarNotificacionExito } from '../../../shared/js/components/mensajesError.js';
import { puedeEjecutarAccion, obtenerConfiguracionRol } from '../../../shared/js/components/navegacionRol.js';

let pacienteDrawerId = null;
let pacienteSoloLectura = null;
let institucionSoloLectura = null;
let pestanaActiva = 'consultas'; // 'consultas' | 'nueva-consulta' | 'crecimiento' | 'tutor'

export function renderModalDrawer(containerId = 'drawer-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const esSoloLectura = Boolean(pacienteSoloLectura);

  container.innerHTML = `
    <div id="drawer-backdrop" class="drawer-backdrop"></div>
    <div id="modal-drawer-pediatrico" class="modal-drawer">
      <div class="drawer-header">
        <div class="drawer-title-group">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h3 id="drawer-paciente-nombre" class="drawer-title">Expediente Pediátrico</h3>
            <span id="drawer-paciente-exp" class="badge badge-tutor" style="font-family: monospace;">PED-0000</span>
            ${esSoloLectura ? `<span class="badge" style="background-color:var(--color-bubblegum);color:#8a2428;">SOLO LECTURA · ${institucionSoloLectura}</span>` : ''}
          </div>
          <span id="drawer-paciente-sub" class="drawer-subtitle">Cargando datos clínicos...</span>
        </div>
        <button id="btn-cerrar-drawer" class="drawer-close-btn" type="button" aria-label="Cerrar expediente">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="drawer-tabs">
        <button class="drawer-tab ${pestanaActiva === 'consultas' ? 'active' : ''}" data-tab="consultas" type="button">Historial Consultas</button>
        ${!esSoloLectura ? `<button class="drawer-tab ${pestanaActiva === 'nueva-consulta' ? 'active' : ''}" data-tab="nueva-consulta" type="button">Nueva Atención</button>` : ''}
        <button class="drawer-tab ${pestanaActiva === 'crecimiento' ? 'active' : ''}" data-tab="crecimiento" type="button">Crecimiento y Vacunas</button>
        <button class="drawer-tab ${pestanaActiva === 'tutor' ? 'active' : ''}" data-tab="tutor" type="button">Tutor y Datos</button>
      </div>

      <div id="drawer-content-body" class="drawer-body"></div>
    </div>
  `;

  // Listeners de cierre
  const backdrop = container.querySelector('#drawer-backdrop');
  const btnCerrar = container.querySelector('#btn-cerrar-drawer');
  if (backdrop) backdrop.addEventListener('click', cerrarDrawer);
  if (btnCerrar) btnCerrar.addEventListener('click', cerrarDrawer);

  // Tabs
  container.querySelectorAll('.drawer-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      pestanaActiva = tabBtn.getAttribute('data-tab');
      renderModalDrawer(containerId);
      actualizarCuerpoDrawer();
      const drawerEl = document.getElementById('modal-drawer-pediatrico');
      const backdropEl = document.getElementById('drawer-backdrop');
      if (drawerEl && backdropEl) {
        drawerEl.classList.add('active');
        backdropEl.classList.add('active');
      }
    });
  });

  window.abrirDrawerExpediente = (id) => {
    pacienteSoloLectura = null;
    institucionSoloLectura = null;
    pacienteDrawerId = id;
    pestanaActiva = 'consultas';
    renderModalDrawer(containerId);
    actualizarCuerpoDrawer();

    const drawerEl = document.getElementById('modal-drawer-pediatrico');
    const backdropEl = document.getElementById('drawer-backdrop');
    if (drawerEl && backdropEl) {
      drawerEl.classList.add('active');
      backdropEl.classList.add('active');
    }
  };

  window.abrirDrawerSoloLectura = (pacienteRemoto, nombreInstitucion) => {
    pacienteSoloLectura = pacienteRemoto;
    institucionSoloLectura = nombreInstitucion;
    pacienteDrawerId = pacienteRemoto?.id || null;
    pestanaActiva = 'consultas';
    renderModalDrawer(containerId);
    actualizarCuerpoDrawer();

    const drawerEl = document.getElementById('modal-drawer-pediatrico');
    const backdropEl = document.getElementById('drawer-backdrop');
    if (drawerEl && backdropEl) {
      drawerEl.classList.add('active');
      backdropEl.classList.add('active');
    }
  };
}

function cerrarDrawer() {
  const drawerEl = document.getElementById('modal-drawer-pediatrico');
  const backdropEl = document.getElementById('drawer-backdrop');
  if (drawerEl && backdropEl) {
    drawerEl.classList.remove('active');
    backdropEl.classList.remove('active');
  }
}

function obtenerPacienteActivoDrawer() {
  if (pacienteSoloLectura) return pacienteSoloLectura;
  return store.pacientes.find(p => p.id === pacienteDrawerId);
}

function actualizarCuerpoDrawer() {
  const body = document.getElementById('drawer-content-body');
  if (!body) return;

  const paciente = obtenerPacienteActivoDrawer();
  if (!paciente) {
    body.innerHTML = `<p style="color: var(--text-muted);">Paciente no encontrado.</p>`;
    return;
  }

  // Header update
  const titleEl = document.getElementById('drawer-paciente-nombre');
  const expEl = document.getElementById('drawer-paciente-exp');
  const subEl = document.getElementById('drawer-paciente-sub');
  if (titleEl) titleEl.textContent = `${paciente.nombre} ${paciente.apellidos}`;
  if (expEl) expEl.textContent = paciente.expediente || paciente.id;
  if (subEl) {
    const estadoTxt = paciente.historial?.estado === 'archivado' ? 'ARCHIVADO' : 'ACTIVO';
    subEl.textContent = `Nacimiento: ${paciente.fechaNacimiento} · Estado: ${estadoTxt} · Tutor: ${paciente.detallesInstitucion?.tutorPrincipal?.nombre || 'N/R'}`;
  }

  if (pestanaActiva === 'consultas') {
    const consultas = paciente.historial?.consultas || [];
    const avisoArchivado = paciente.historial?.estado === 'archivado' ? `
      <div style="background-color:var(--color-bubblegum);border:1px solid #f8aba0;border-radius:var(--radius-md);padding:12px 14px;font-size:0.78rem;color:#7a1f22;">
        <strong>Expediente Archivado (${paciente.historial?.motivoArchivo?.tipo || 'cerrado'}):</strong>
        ${paciente.historial?.motivoArchivo?.detalle || 'Conservación legal activa.'}
      </div>
    ` : '';

    if (consultas.length === 0) {
      body.innerHTML = `
        ${avisoArchivado}
        <div style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
          <p style="font-weight: 700; color: var(--color-pacific); margin-bottom: 4px;">Sin consultas previas registradas</p>
          <p style="font-size: 0.8rem;">Utiliza la pestaña "+ Nueva Atención" para registrar diagnóstico, tratamiento y receta.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      ${avisoArchivado}
      ${consultas.map(con => `
        <div style="background-color: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; box-shadow: var(--shadow-sm); display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
            <div>
              <strong style="color: var(--color-pacific); font-size: 0.9rem;">${con.motivo}</strong>
              <p style="font-size: 0.74rem; color: var(--text-muted);">${con.medico} · ${new Date(con.fecha).toLocaleString()}</p>
            </div>
            <span class="badge badge-stable">Consulta Finalizada</span>
          </div>

          <!-- Diagnósticos -->
          <div>
            <span style="font-size: 0.74rem; font-weight: 800; color: var(--color-pacific); text-transform: uppercase;">Diagnósticos Clínicos:</span>
            <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
              ${(con.diagnosticos || []).map(d => `
                <div style="background-color: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--color-treehouse); font-size: 0.8rem;">
                  <strong>${d.codigo ? `[${d.codigo}] ` : ''}${d.descripcion}</strong>
                  ${(d.tratamientos || []).map(t => `
                    <div style="margin-top: 4px; font-size: 0.74rem; color: #2e6987; display: flex; align-items: center; gap: 5px;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
                      <span>Tratamiento: <em>${t.descripcion}</em> (${t.dias} días)</span>
                    </div>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recetas (Cero emojis, 100% SVG) -->
          ${(con.recetas || []).length > 0 ? `
            <div>
              <span style="font-size: 0.74rem; font-weight: 800; color: var(--color-pacific); text-transform: uppercase;">Prescripción Farmacológica:</span>
              <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                ${con.recetas.flatMap(r => r.medicamentos || []).map(m => `
                  <div style="font-size: 0.76rem; color: var(--text-dark); background-color: #f7fafb; padding: 6px 8px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 6px;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-treehouse)" stroke-width="2" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/><line x1="9" y1="15" x2="12" y2="15"/></svg>
                    <span><strong>${m.nombre}</strong> — ${m.dosis} (${m.frecuencia}, ${m.duracion})</span>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    `;
  } else if (pestanaActiva === 'nueva-consulta') {
    if (paciente.historial?.estado === 'archivado') {
      body.innerHTML = `
        <div style="background-color: var(--color-bubblegum); border: 1px solid #f8aba0; border-radius: var(--radius-md); padding: 20px; color: #7a1f22;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8a2428" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <strong style="font-size:0.9rem;">409 · PACIENTE_ARCHIVADO</strong>
          </div>
          <p style="font-size:0.82rem;margin:0;line-height:1.45;">
            El expediente de <strong>${paciente.nombre} ${paciente.apellidos}</strong> se encuentra en estado <code>archivado</code>. Conforme al contrato del dominio, no se permite registrar nuevas consultas médicas sobre un historial archivado.
          </p>
        </div>
      `;
      return;
    }

    body.innerHTML = `
      <form id="form-drawer-nueva-consulta" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group">
          <label class="form-label" for="c-inp-motivo">Motivo de Consulta Pediátrica *</label>
          <input type="text" id="c-inp-motivo" class="form-control" required placeholder="Ej. Cuadro febril de 48h y otalgia izquierda" />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="c-inp-dx-codigo">Código CIE-10 (Opcional)</label>
            <input type="text" id="c-inp-dx-codigo" class="form-control" placeholder="Ej. H66.0" />
          </div>
          <div class="form-group">
            <label class="form-label" for="c-inp-dx-desc">Diagnóstico Pediátrico *</label>
            <input type="text" id="c-inp-dx-desc" class="form-control" required placeholder="Ej. Otitis media aguda no supurada" />
          </div>
        </div>

        <!-- Tratamiento Dependiente del Diagnóstico (Regla 3.4) -->
        <div style="background-color: var(--secondary-light); padding: 12px; border-radius: var(--radius-sm); border: 1px solid #c2e2dc;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #1e524a; margin-bottom: 6px;">
            Tratamiento Clínico (Asociado al Diagnóstico):
          </div>
          <div class="form-row">
            <div class="form-group" style="flex: 2;">
              <label class="form-label" for="c-inp-tx-desc" style="color: #1e524a;">Plan de Tratamiento</label>
              <input type="text" id="c-inp-tx-desc" class="form-control" required placeholder="Ej. Analgesia oral y gotas óticas antiinflamatorias" />
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="c-inp-tx-dias" style="color: #1e524a;">Duración (Días)</label>
              <input type="number" id="c-inp-tx-dias" class="form-control" required min="1" value="7" />
            </div>
          </div>
        </div>

        <!-- Receta de Medicamentos -->
        <div class="form-group">
          <label class="form-label" for="c-inp-receta">Prescripción Pediátrica (Dosis por kg / Frecuencia)</label>
          <textarea id="c-inp-receta" class="form-control" rows="3" placeholder="Ej. Paracetamol jarabe 120mg/5ml: 5ml cada 6 horas por 3 días si hay fiebre."></textarea>
        </div>

        <button type="submit" class="btn btn-cta" style="margin-top: 10px;">
          <span>Registrar Consulta Pediátrica</span>
        </button>
      </form>
    `;

    const form = document.getElementById('form-drawer-nueva-consulta');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!puedeEjecutarAccion('registrar_consulta')) {
          const cfg = obtenerConfiguracionRol();
          mostrarErrorHttp({
            status: 403,
            error: {
              codigo: 'ACCESO_DENEGADO',
              mensaje: `El rol ${cfg.etiqueta} no tiene autorización para emitir consultas médicas.`
            }
          });
          return;
        }

        const motivo = document.getElementById('c-inp-motivo').value;
        const codigo = document.getElementById('c-inp-dx-codigo').value;
        const diagnostico = document.getElementById('c-inp-dx-desc').value;
        const txDesc = document.getElementById('c-inp-tx-desc').value;
        const txDias = parseInt(document.getElementById('c-inp-tx-dias').value, 10);
        const recetaTxt = document.getElementById('c-inp-receta').value;

        const nuevaConsulta = {
          id: `con-${Date.now()}`,
          fecha: new Date().toISOString(),
          medico: "Dra. Sofía Mendoza",
          motivo,
          diagnosticos: [
            {
              id: `dx-${Date.now()}`,
              codigo: codigo || "Z00.1",
              descripcion: diagnostico,
              tratamientos: [
                { id: `tx-${Date.now()}`, descripcion: txDesc, dias: txDias }
              ]
            }
          ],
          recetas: recetaTxt ? [
            {
              id: `rx-${Date.now()}`,
              medicamentos: [
                { nombre: recetaTxt, dosis: "Según prescripción", frecuencia: "Indicada", duracion: `${txDias} días` }
              ]
            }
          ] : []
        };

        store.agregarConsulta(paciente.id, nuevaConsulta);
        mostrarNotificacionExito('Consulta pediátrica registrada', `Diagnóstico y tratamiento agregados al expediente de ${paciente.nombre}.`);
        pestanaActiva = 'consultas';
        renderModalDrawer('drawer-container');
        actualizarCuerpoDrawer();
        const drawerEl = document.getElementById('modal-drawer-pediatrico');
        const backdropEl = document.getElementById('drawer-backdrop');
        if (drawerEl && backdropEl) {
          drawerEl.classList.add('active');
          backdropEl.classList.add('active');
        }
      });
    }
  } else if (pestanaActiva === 'crecimiento') {
    const controles = paciente.detallesInstitucion?.controlesCrecimiento || [];
    const vacunas = paciente.detallesInstitucion?.vacunasAplicadas || [];
    const ultimo = controles[0];

    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="kpi-card" style="padding:16px;background-color:var(--color-daydream);border-color:#95c8cb;">
          <h4 style="font-size:0.85rem;font-weight:800;color:var(--color-pacific);margin-bottom:8px;">Última Medición Antropométrica</h4>
          ${ultimo ? `
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:0.8rem;color:var(--text-dark);">
              <div>Peso: <strong>${ultimo.pesoKg} kg</strong></div>
              <div>Talla: <strong>${ultimo.tallaCm} cm</strong></div>
              <div>Perímetro Cefálico: <strong>${ultimo.perimetroCefalicoCm} cm</strong></div>
              <div>IMC: <strong>${ultimo.imc}</strong> (${ultimo.fecha})</div>
            </div>
            <p style="font-size:0.75rem;color:var(--color-pacific);margin-top:8px;">${ultimo.observaciones}</p>
          ` : `<p style="font-size:0.8rem;color:var(--text-muted);">Sin controles de crecimiento registrados.</p>`}
        </div>

        <div class="kpi-card" style="padding:16px;">
          <h4 style="font-size:0.85rem;font-weight:800;color:var(--color-pacific);margin-bottom:8px;">Vacunas Aplicadas (${vacunas.length} dosis)</h4>
          ${vacunas.length > 0 ? `
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${vacunas.map(v => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--bg-subtle);border-radius:var(--radius-sm);font-size:0.78rem;">
                  <div>
                    <strong style="color:var(--color-pacific);">${v.nombreVacuna}</strong>
                    <span style="color:var(--text-muted);"> · Dosis ${v.dosis}</span>
                  </div>
                  <span class="badge badge-vacuna-ok">${v.fechaAplicacion}</span>
                </div>
              `).join('')}
            </div>
          ` : `<p style="font-size:0.8rem;color:var(--text-muted);">Sin dosis registradas.</p>`}
        </div>
      </div>
    `;
  } else if (pestanaActiva === 'tutor') {
    const tutor = paciente.detallesInstitucion?.tutorPrincipal;
    const alergias = paciente.detallesInstitucion?.alergias || [];

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div class="kpi-card" style="padding: 16px; background-color: var(--color-daydream); border-color: #95c8cb;">
          <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--color-pacific); margin-bottom: 8px;">Tutor Principal Único (Responsable Legal)</h4>
          <div style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 4px; color: var(--text-dark);">
            <div>Nombre: <strong>${tutor?.nombre || 'No registrado'}</strong></div>
            <div>Parentesco: <strong>${tutor?.parentesco || 'Tutor Legal'}</strong></div>
            <div>Documento / Cédula: <code>${tutor?.documento || 'N/R'}</code></div>
            <div>Teléfono de Contacto: <strong>${tutor?.telefono || 'N/R'}</strong></div>
            <div>Correo Electrónico: ${tutor?.correo || 'N/R'}</div>
          </div>
        </div>

        <div class="kpi-card" style="padding: 16px;">
          <h4 style="font-size: 0.85rem; font-weight: 800; color: var(--color-pacific); margin-bottom: 8px;">Filiación y Domicilio</h4>
          <div style="font-size: 0.82rem; display: flex; flex-direction: column; gap: 4px; color: var(--text-muted);">
            <div>CUI / Identificación del Menor: <code>${paciente.documentoIdentidad}</code></div>
            <div>Sexo Biológico: <strong>${paciente.genero}</strong></div>
            <div>Tipo de Sangre: <strong>${paciente.detallesInstitucion?.tipoSangre || 'N/R'}</strong></div>
            <div>Dirección Residencial: <strong>${paciente.direccion}</strong></div>
          </div>
        </div>

        <div class="kpi-card alert-card" style="padding: 16px;">
          <h4 style="font-size: 0.85rem; font-weight: 800; color: #8a2428; margin-bottom: 6px;">Alergias y Alertas Pediátricas</h4>
          <div style="font-size: 0.8rem; color: #7a1f22; display: flex; flex-direction: column; gap: 6px;">
            ${alergias.length > 0 ? alergias.map(a => `
              <div style="display: flex; align-items: center; gap: 6px;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8a2428" stroke-width="2.2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span><strong>${a.alergeno}</strong> (Severidad: ${a.severidad})</span>
              </div>
            `).join('') : 'Sin alergias medicamentosas o alimentarias registradas.'}
          </div>
        </div>
      </div>
    `;
  }
}
