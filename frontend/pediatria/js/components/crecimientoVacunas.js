import { store, ESQUEMA_NACIONAL_VACUNAS } from '../state.js';
import { mostrarErrorHttp, mostrarNotificacionExito } from '../../../shared/js/components/mensajesError.js';
import { puedeEjecutarAccion, obtenerConfiguracionRol } from '../../../shared/js/components/navegacionRol.js';

export function inicializarSelectorCrecimiento() {
  const select = document.getElementById('sel-paciente-crecimiento');
  if (!select) return;

  const pacientes = store.pacientes.filter(p => p.historial?.estado === 'activo');
  select.innerHTML = pacientes.map(p => `
    <option value="${p.id}" ${p.id === store.pacienteSeleccionadoId ? 'selected' : ''}>
      ${p.nombre} ${p.apellidos} (${p.expediente})
    </option>
  `).join('');

  select.addEventListener('change', (e) => {
    store.setPacienteSeleccionado(e.target.value);
  });

  const btnAntropo = document.getElementById('btn-nuevo-control-antropo');
  if (btnAntropo) {
    btnAntropo.addEventListener('click', () => abrirDialogoControl());
  }

  const btnVacuna = document.getElementById('btn-nueva-vacuna-aplicada');
  if (btnVacuna) {
    btnVacuna.addEventListener('click', () => abrirDialogoVacuna());
  }
}

export function renderCrecimientoVacunas(containerId = 'crecimiento-vacunas-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const paciente = store.getPacienteSeleccionado();
  if (!paciente) {
    container.innerHTML = `<p style="padding: 24px; color: var(--text-muted);">No hay paciente pediátrico seleccionado.</p>`;
    return;
  }

  const tutor = paciente.detallesInstitucion?.tutorPrincipal;
  const controles = paciente.detallesInstitucion?.controlesCrecimiento || [];
  const vacunasAplicadas = paciente.detallesInstitucion?.vacunasAplicadas || [];
  const alergias = paciente.detallesInstitucion?.alergias || [];
  const ultimo = controles[0];

  container.innerHTML = `
    <!-- Ficha Rápida del Menor -->
    <div class="kpi-card" style="margin-bottom: 24px; padding: 22px; background: linear-gradient(to right, #ffffff, var(--primary-light));">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 50px; height: 50px; border-radius: var(--radius-lg); background-color: var(--color-pacific); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800;">
            ${paciente.nombre[0]}${paciente.apellidos[0]}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <h2 style="font-size: 1.3rem; font-weight: 800; color: var(--color-pacific); margin: 0;">${paciente.nombre} ${paciente.apellidos}</h2>
              <span class="badge badge-tutor" style="font-family: monospace;">${paciente.expediente}</span>
              <span class="badge badge-stable">${paciente.genero}</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
              Fecha de Nacimiento: <strong>${paciente.fechaNacimiento}</strong> · Tipo de Sangre: <strong>${paciente.detallesInstitucion?.tipoSangre || 'N/R'}</strong> · Tutor: <strong>${tutor?.nombre} (${tutor?.parentesco})</strong>
            </p>
          </div>
        </div>

        <div>
          ${alergias.length > 0 ? `
            <div style="background-color: var(--color-bubblegum); border: 1px solid #f8aba0; padding: 8px 14px; border-radius: var(--radius-md); display: flex; align-items: center; gap: 8px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a2428" stroke-width="2.2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span style="font-size: 0.8rem; font-weight: 800; color: #8a2428;">Alergia Crítica:</span>
              <span style="font-size: 0.8rem; font-weight: 700; color: #7a1f22;">${alergias.map(a => `${a.alergeno} (${a.severidad})`).join(', ')}</span>
            </div>
          ` : `
            <span class="badge badge-stable">Sin alergias medicamentosas conocidas</span>
          `}
        </div>
      </div>
    </div>

    <!-- Módulo 1: Control de Crecimiento Antropométrico -->
    <div class="section-block">
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-direction: row;">
        <div>
          <h2 class="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            <span>Mediciones Antropométricas y Percentiles</span>
          </h2>
          <p class="section-desc">Evolución de peso, talla y perímetro cefálico del paciente.</p>
        </div>
      </div>

      <!-- Resumen Antropométrico Actual -->
      <div class="antropo-grid" style="margin-bottom: 20px;">
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.pesoKg} kg` : '--'}</div>
          <div class="antropo-lbl">Peso Corporal</div>
        </div>
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.tallaCm} cm` : '--'}</div>
          <div class="antropo-lbl">Estatura / Talla</div>
        </div>
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.perimetroCefalicoCm} cm` : '--'}</div>
          <div class="antropo-lbl">Perímetro Cefálico</div>
        </div>
        <div class="antropo-box">
          <div class="antropo-val">${ultimo ? `${ultimo.imc}` : '--'}</div>
          <div class="antropo-lbl">Índice Masa Corporal</div>
        </div>
      </div>

      <!-- Tabla Histórica de Crecimiento -->
      <div class="table-container">
        <div class="table-scroll">
          <table class="pediatria-table">
            <thead>
              <tr>
                <th>Fecha de Medición</th>
                <th>Edad (Meses)</th>
                <th>Peso (kg)</th>
                <th>Talla (cm)</th>
                <th>Perímetro Cefálico (cm)</th>
                <th>IMC</th>
                <th>Observaciones del Desarrollo</th>
              </tr>
            </thead>
            <tbody>
              ${controles.map(c => `
                <tr>
                  <td><strong>${c.fecha}</strong></td>
                  <td>${c.edadMeses} m</td>
                  <td><span style="color: var(--color-pacific); font-weight: 700;">${c.pesoKg} kg</span></td>
                  <td>${c.tallaCm} cm</td>
                  <td>${c.perimetroCefalicoCm} cm</td>
                  <td><strong>${c.imc}</strong></td>
                  <td style="font-size: 0.78rem; color: var(--text-muted);">${c.observaciones}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Módulo 2: Carnet de Vacunación -->
    <div class="section-block" style="margin-top: 36px;">
      <div class="section-header">
        <h2 class="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Carnet Oficial de Vacunación (Esquema Nacional vs Vacunas Aplicadas)</span>
        </h2>
        <p class="section-desc">Comparativa entre dosis programadas por edad y vacunas recibidas con su número de lote.</p>
      </div>

      <div class="vacunas-grid">
        ${ESQUEMA_NACIONAL_VACUNAS.map(item => {
          const aplicada = vacunasAplicadas.find(
            v => v.nombreVacuna.toLowerCase().includes(item.nombreVacuna.split(' ')[0].toLowerCase()) && v.dosis === item.dosis
          );

          return `
            <div class="vacuna-card ${aplicada ? 'aplicada' : 'pendiente'}">
              <div class="vacuna-header">
                <div>
                  <h4 class="vacuna-title">${item.nombreVacuna}</h4>
                  <span class="vacuna-meta">Dosis ${item.dosis} · Edad recomendada: <strong>${item.edadRecomendada}</strong></span>
                </div>
                ${aplicada ? `
                  <span class="badge badge-vacuna-ok">Aplicada</span>
                ` : `
                  <span class="badge badge-vacuna-pend">Pendiente</span>
                `}
              </div>

              ${aplicada ? `
                <div style="font-size: 0.74rem; color: var(--text-muted); background-color: var(--bg-subtle); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                  <div>Fecha: <strong style="color: var(--color-pacific);">${aplicada.fechaAplicacion}</strong></div>
                  <div>Lote: <code>${aplicada.lote}</code> · ${aplicada.responsable}</div>
                </div>
              ` : `
                <div style="font-size: 0.74rem; color: #8a2428;">
                  Pendiente de administración según calendario de salud infantil.
                </div>
              `}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function abrirDialogoControl() {
  if (!puedeEjecutarAccion('registrar_crecimiento')) {
    const cfg = obtenerConfiguracionRol();
    mostrarErrorHttp({
      status: 403,
      error: {
        codigo: 'ACCESO_DENEGADO',
        mensaje: `El rol ${cfg.etiqueta} no tiene permisos para registrar controles antropométricos.`
      }
    });
    return;
  }

  const paciente = store.getPacienteSeleccionado();
  if (!paciente) return;

  if (paciente.historial?.estado === 'archivado') {
    mostrarErrorHttp({
      status: 409,
      error: {
        codigo: 'PACIENTE_ARCHIVADO',
        mensaje: 'No se puede registrar un control de crecimiento en un expediente archivado.'
      }
    });
    return;
  }

  const existente = document.getElementById('modal-control-crecimiento');
  if (existente) existente.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-control-crecimiento';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(27,61,80,0.45);backdrop-filter:blur(2px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';

  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-control" style="background:#ffffff;border-radius:16px;max-width:480px;width:100%;padding:26px;box-shadow:0 16px 40px rgba(46,105,135,0.22);border:1px solid #dbe7ec;">
      <h3 id="titulo-modal-control" style="margin:0 0 6px 0;font-size:1.1rem;font-weight:800;color:var(--color-pacific);">Registrar Control de Crecimiento</h3>
      <p style="margin:0 0 16px 0;font-size:0.8rem;color:var(--text-muted);">Paciente: <strong>${paciente.nombre} ${paciente.apellidos}</strong> (${paciente.expediente})</p>

      <form id="form-nuevo-control-modal" style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="m-inp-peso">Peso (kg) *</label>
            <input type="number" id="m-inp-peso" class="form-control" step="0.1" min="0.5" max="120" value="14.2" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="m-inp-talla">Talla (cm) *</label>
            <input type="number" id="m-inp-talla" class="form-control" step="0.1" min="25" max="200" value="94.0" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="m-inp-pc">Perímetro Cefálico (cm) *</label>
            <input type="number" id="m-inp-pc" class="form-control" step="0.1" min="20" max="70" value="49.5" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="m-inp-edad-m">Edad (Meses) *</label>
            <input type="number" id="m-inp-edad-m" class="form-control" min="0" max="216" value="32" required />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="m-inp-obs">Observaciones del Desarrollo</label>
          <input type="text" id="m-inp-obs" class="form-control" value="Desarrollo psicomotor y nutricional óptimo." required />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;">
          <button type="button" id="btn-cerrar-modal-control" class="btn btn-outline btn-sm">Cancelar</button>
          <button type="submit" class="btn btn-cta btn-sm">Guardar Control</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  const cerrar = () => overlay.remove();
  overlay.querySelector('#btn-cerrar-modal-control').addEventListener('click', cerrar);

  overlay.querySelector('#form-nuevo-control-modal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const peso = parseFloat(overlay.querySelector('#m-inp-peso').value);
    const talla = parseFloat(overlay.querySelector('#m-inp-talla').value);
    const pc = parseFloat(overlay.querySelector('#m-inp-pc').value);
    const edadMeses = parseInt(overlay.querySelector('#m-inp-edad-m').value, 10);
    const obs = overlay.querySelector('#m-inp-obs').value.trim();

    if (isNaN(peso) || peso <= 0 || isNaN(talla) || talla <= 0 || isNaN(pc) || pc <= 0) {
      mostrarErrorHttp({
        status: 400,
        error: {
          codigo: 'VALIDACION_FALLIDA',
          mensaje: 'Peso, talla y perímetro cefálico deben ser valores positivos mayores a cero.'
        }
      });
      return;
    }

    const imc = parseFloat((peso / Math.pow(talla / 100, 2)).toFixed(1));
    const nuevoControl = {
      id: `cc-${Date.now()}`,
      fecha: new Date().toISOString().split('T')[0],
      edadMeses: isNaN(edadMeses) ? 24 : edadMeses,
      pesoKg: peso,
      tallaCm: talla,
      perimetroCefalicoCm: pc,
      imc,
      observaciones: obs || 'Control registrado en consultorio.'
    };
    try { await store.agregarControlCrecimiento(paciente.id, nuevoControl); } catch (error) { return mostrarErrorHttp(error); }
    cerrar();
    mostrarNotificacionExito('Control antropométrico registrado', `${peso} kg · ${talla} cm (IMC ${imc}) guardado para ${paciente.nombre}.`);
  });
}

function abrirDialogoVacuna() {
  if (!puedeEjecutarAccion('registrar_vacuna')) {
    const cfg = obtenerConfiguracionRol();
    mostrarErrorHttp({
      status: 403,
      error: {
        codigo: 'ACCESO_DENEGADO',
        mensaje: `El rol ${cfg.etiqueta} no tiene permisos para registrar aplicación de vacunas.`
      }
    });
    return;
  }

  const paciente = store.getPacienteSeleccionado();
  if (!paciente) return;

  if (paciente.historial?.estado === 'archivado') {
    mostrarErrorHttp({
      status: 409,
      error: {
        codigo: 'PACIENTE_ARCHIVADO',
        mensaje: 'No se puede registrar vacunación en un expediente archivado.'
      }
    });
    return;
  }

  const existente = document.getElementById('modal-vacuna-aplicada');
  if (existente) existente.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-vacuna-aplicada';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(27,61,80,0.45);backdrop-filter:blur(2px);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;';

  overlay.innerHTML = `
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-vacuna" style="background:#ffffff;border-radius:16px;max-width:480px;width:100%;padding:26px;box-shadow:0 16px 40px rgba(46,105,135,0.22);border:1px solid #dbe7ec;">
      <h3 id="titulo-modal-vacuna" style="margin:0 0 6px 0;font-size:1.1rem;font-weight:800;color:var(--color-pacific);">Registrar Dosis de Vacuna</h3>
      <p style="margin:0 0 16px 0;font-size:0.8rem;color:var(--text-muted);">Paciente: <strong>${paciente.nombre} ${paciente.apellidos}</strong> (${paciente.expediente})</p>

      <form id="form-nueva-vacuna-modal" style="display:flex;flex-direction:column;gap:12px;">
        <div class="form-group">
          <label class="form-label" for="m-sel-vacuna">Vacuna y Dosis del Esquema Nacional *</label>
          <select id="m-sel-vacuna" class="form-control" required>
            ${ESQUEMA_NACIONAL_VACUNAS.map((v, idx) => `<option value="${idx}">${v.nombreVacuna} — Dosis ${v.dosis} (${v.edadRecomendada})</option>`).join('')}
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="m-inp-lote">Número de Lote Biológico *</label>
            <input type="text" id="m-inp-lote" class="form-control" value="L-${Math.floor(1000 + Math.random() * 9000)}" required />
          </div>
          <div class="form-group">
            <label class="form-label" for="m-inp-resp">Personal Responsable *</label>
            <input type="text" id="m-inp-resp" class="form-control" value="Enf. Rosa Elena" required />
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;">
          <button type="button" id="btn-cerrar-modal-vacuna" class="btn btn-outline btn-sm">Cancelar</button>
          <button type="submit" class="btn btn-secondary btn-sm">Registrar Dosis</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  const cerrar = () => overlay.remove();
  overlay.querySelector('#btn-cerrar-modal-vacuna').addEventListener('click', cerrar);

  overlay.querySelector('#form-nueva-vacuna-modal').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(overlay.querySelector('#m-sel-vacuna').value, 10);
    const seleccionada = ESQUEMA_NACIONAL_VACUNAS[idx];
    const lote = overlay.querySelector('#m-inp-lote').value.trim();
    const responsable = overlay.querySelector('#m-inp-resp').value.trim();

    if (!seleccionada || !lote) return;

    const nuevaVacuna = {
      vacunaId: seleccionada.vacunaId,
      nombreVacuna: seleccionada.nombreVacuna,
      dosis: seleccionada.dosis,
      fechaAplicacion: new Date().toISOString().split('T')[0],
      lote,
      responsable: responsable || 'Enf. Rosa Elena'
    };
    try { await store.registrarVacuna(paciente.id, nuevaVacuna); } catch (error) { return mostrarErrorHttp(error); }
    cerrar();
    mostrarNotificacionExito('Vacuna registrada en el carnet', `${seleccionada.nombreVacuna} (Dosis ${seleccionada.dosis}, lote ${lote}).`);
  });
}
