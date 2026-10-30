import {
  GENEROS, TIPOS_SANGRE, ESTADOS, MOTIVOS_BAJA, TIPOS,
  pacientes, examenes,
  cargarEstado, guardarEstado, reiniciarDemo, generarIdOrden,
} from './datos.js';
import { fetchPlantillaHtml } from '../../shared/js/api/client.js';

/* ---------- Utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const fmt = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const hoy = () => new Date().toISOString().slice(0, 10);
const paciente = (cui) => pacientes.find((p) => p.cui === cui);
const nombreDe = (cui) => { const p = paciente(cui); return p ? `${p.nombre} ${p.apellidos}` : cui; };
const badge = (e) => `<span class="badge ${esc(e)}">${esc(ESTADOS[e] ?? e)}</span>`;
const debounce = (fn, ms = 180) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const tipoDe = (clave) => TIPOS[clave] || { icono: '❓', nombre: clave, campos: [] };

function toast(msg, tipo = 'ok') {
  const t = $('#toast');
  t.textContent = msg;
  t.dataset.tipo = tipo;
  t.classList.add('ver');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('ver'), 2400);
}

function emptyState(msg, icon = '📭') {
  return `<div class="tabla-wrap"><div class="empty-state"><span class="icon">${icon}</span><p>${esc(msg)}</p></div></div>`;
}

/* ---------- Modal ---------- */
function abrirModal(titulo, html) {
  const m = $('#modal');
  if (m.open) m.close();
  m.innerHTML = `<div class="dialog-cab"><h2>${titulo}</h2><button class="cerrar" type="button" aria-label="Cerrar">✕</button></div>${html}`;
  $('.cerrar', m).onclick = () => m.close();
  m.showModal();
  return m;
}

const modalEl = $('#modal');
modalEl.addEventListener('click', (e) => {
  if (e.target !== modalEl) return;
  const r = modalEl.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) modalEl.close();
});

/* Refresca la vista activa sin re-fetch */
let refreshView = () => {};

/* ---------- Tablas ---------- */
function tablaExamenes(lista) {
  if (!lista.length) return emptyState('Sin exámenes registrados.', '🔬');
  return `<div class="tabla-wrap"><table>
    <thead><tr><th>Orden</th><th>Paciente</th><th>Examen</th><th>Médico</th><th>Solicitud</th><th>Estado</th><th></th></tr></thead>
    <tbody>${lista.map((e) => {
      const t = tipoDe(e.tipo);
      const editable = e.estado !== 'completado';
      return `<tr data-id="${esc(e.id)}">
        <td><b>#${esc(e.id)}</b></td>
        <td>${esc(nombreDe(e.pacienteCui))}<small>${esc(e.pacienteCui)}</small></td>
        <td>${t.icono} ${esc(t.nombre)}</td>
        <td>${esc(e.medicoSolicitante)}</td>
        <td>${fmt(e.fechaSolicitud)}</td>
        <td>${badge(e.estado)}</td>
        <td class="acciones-cell">${editable ? `<button type="button" class="btn btn-ghost btn-small" data-editar="${esc(e.id)}">✏️ Editar</button>` : ''}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

function tablaPacientes(lista) {
  if (!lista.length) return emptyState('Sin pacientes que coincidan.', '👥');
  return `<div class="tabla-wrap"><table>
    <thead><tr><th>CUI</th><th>Paciente</th><th>Género</th><th>Sangre</th><th>Alergias</th><th>Exámenes</th><th>Estado</th></tr></thead>
    <tbody>${lista.map((p) => `
      <tr data-cui="${esc(p.cui)}">
        <td>${esc(p.cui)}</td>
        <td><b>${esc(p.nombre)} ${esc(p.apellidos)}</b><small>${fmt(p.fechaNacimiento)}</small></td>
        <td>${esc(p.genero)}</td>
        <td>${esc(p.tipoSangre)}</td>
        <td>${p.alergias.length ? esc(p.alergias.join(', ')) : '—'}</td>
        <td>${examenes.filter((e) => e.pacienteCui === p.cui).length}</td>
        <td>${p.activo ? '<span class="badge completado">Activo</span>' : '<span class="badge archivado">Archivado</span>'}</td>
      </tr>`).join('')}</tbody>
  </table></div>`;
}

/* ---------- Detalles ---------- */
function detalleExamen(id) {
  const e = examenes.find((x) => x.id === id);
  if (!e) return;
  const t = tipoDe(e.tipo);
  const items = t.campos
    .filter(([k]) => e.resultados[k] !== undefined)
    .map(([k, l, u]) => {
      const v = e.resultados[k];
      return `<div class="res-item"><span>${esc(l)}</span><b>${esc(Array.isArray(v) ? (v.join(', ') || 'Ninguno') : v)}${u ? ` <small style="display:inline">${esc(u)}</small>` : ''}</b></div>`;
    }).join('');

  const m = abrirModal(`${t.icono} ${esc(t.nombre)} · #${esc(e.id)}`, `
    <p class="section-desc" style="margin:0 0 14px">${esc(nombreDe(e.pacienteCui))} · ${esc(e.medicoSolicitante)} · ${badge(e.estado)} · Resultado: ${fmt(e.fechaResultado)}</p>
    ${items ? `<div class="res-grid">${items}</div>` : '<p class="vacio">Aún sin resultados registrados.</p>'}
    <pre class="json">${esc(JSON.stringify({ tipo: e.tipo, resultados: e.resultados }, null, 2))}</pre>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      ${e.estado !== 'completado' ? '<button type="button" class="btn btn-primary" id="btn-edit-orden">✏️ Completar / Actualizar</button>' : ''}
    </div>`);

  const btn = m.querySelector('#btn-edit-orden');
  if (btn) btn.onclick = () => { m.close(); formOrden(() => refreshView(), e); };
}

function detallePaciente(cui) {
  const p = paciente(cui);
  if (!p) return;
  const lista = examenes.filter((e) => e.pacienteCui === cui);
  const m = abrirModal(`${esc(p.nombre)} ${esc(p.apellidos)}`, `
    <p class="section-desc" style="margin:0 0 14px">
      CUI ${esc(p.cui)} · ${esc(p.genero)} · ${esc(p.tipoSangre)} · Tel. ${esc(p.telefono || '—')} · ${esc(p.direccion || '—')}<br>
      Alergias: ${p.alergias.length ? esc(p.alergias.join(', ')) : 'ninguna registrada'}
      ${p.activo ? '' : `<br><b>Archivado:</b> ${esc(p.motivoBaja)} (${fmt(p.fechaBaja)})`}
    </p>
    <h3 class="section-title" style="margin-bottom:10px">Historial de exámenes</h3>${tablaExamenes(lista)}
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      ${p.activo ? '<button type="button" class="btn btn-ghost" id="btn-nueva-orden-pac">🔬 Nueva orden</button>' : ''}
    </div>`);

  const b = m.querySelector('#btn-nueva-orden-pac');
  if (b) b.onclick = () => { m.close(); formOrden(() => refreshView(), null, p.cui); };
}

/* ---------- Formulario de orden (crear/editar) ---------- */
function campoHTML([k, l, u, tipo, op], valor) {
  const lab = `<label class="form-label">${esc(l)}${u ? ` (${esc(u)})` : ''}</label>`;
  if (tipo === 'select') {
    const v = valor == null ? '' : String(valor);
    return `<div class="form-group">${lab}<select class="form-control" data-k="${esc(k)}">
      <option value="">—</option>
      ${op.map((o) => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
    </select></div>`;
  }
  if (tipo === 'multi') {
    const arr = Array.isArray(valor) ? valor.map(String) : [];
    return `<div class="form-group" style="grid-column:1/-1">${lab}<div class="checks">
      ${op.map((o) => `<label><input type="checkbox" data-k="${esc(k)}" value="${esc(o)}" ${arr.includes(o) ? 'checked' : ''}> ${esc(o)}</label>`).join('')}
    </div></div>`;
  }
  const v = valor == null ? '' : String(valor);
  return `<div class="form-group">${lab}<input class="form-control" data-k="${esc(k)}" type="${tipo}" ${tipo === 'number' ? 'step="any"' : ''} value="${esc(v)}"></div>`;
}

function leerResultados(form, tipo) {
  const out = {};
  (TIPOS[tipo]?.campos || []).forEach(([k, , , t]) => {
    if (t === 'multi') {
      const v = [...form.querySelectorAll(`[data-k="${k}"]:checked`)].map((c) => c.value);
      if (v.length) out[k] = v;
      return;
    }
    const el = form.querySelector(`[data-k="${k}"]`);
    if (!el) return;
    const v = el.value.trim();
    if (v !== '') out[k] = t === 'number' ? Number(v) : v;
  });
  return out;
}

function formOrden(onGuardar, existente = null, preseCui = null) {
  const esEdicion = !!existente;

  if (!esEdicion && !pacientes.some((p) => p.activo)) {
    return toast('No hay pacientes activos para asignar la orden.', 'error');
  }

  const selCui = existente?.pacienteCui || preseCui;
  const pacientesOpts = pacientes.filter((p) => p.activo).map((p) =>
    `<option value="${esc(p.cui)}" ${selCui === p.cui ? 'selected' : ''}>${esc(p.nombre)} ${esc(p.apellidos)} · ${esc(p.cui)}</option>`
  ).join('');

  const tiposOpts = Object.entries(TIPOS).map(([k, t]) =>
    `<option value="${k}" ${existente?.tipo === k ? 'selected' : ''}>${t.icono} ${esc(t.nombre)}</option>`
  ).join('');

  const m = abrirModal(esEdicion ? `✏️ Editar Orden #${esc(existente.id)}` : '🔬 Generar Orden de Examen', `
    <form id="form-orden" class="form" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Paciente *</label>
          <select name="pacienteCui" class="form-control" required ${esEdicion ? 'disabled' : ''}>${pacientesOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de examen *</label>
          <select name="tipo" class="form-control" ${esEdicion ? 'disabled' : ''}>${tiposOpts}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Médico solicitante *</label>
          <input name="medicoSolicitante" class="form-control" required value="${esc(existente?.medicoSolicitante || '')}" placeholder="Ej. Dra. Elena Ruiz">
        </div>
        <div class="form-group"><label class="form-label">Estado</label>
          <select name="estado" class="form-control">
            ${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${(existente?.estado || 'pendiente') === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Fecha de solicitud</label>
          <input name="fechaSolicitud" type="date" class="form-control" value="${esc(existente?.fechaSolicitud || hoy())}" ${esEdicion ? 'disabled' : ''}>
        </div>
        <div class="form-group"><label class="form-label">Fecha de resultado</label>
          <input name="fechaResultado" type="date" class="form-control" value="${esc(existente?.fechaResultado || '')}">
        </div>
      </div>
      <div>
        <p class="form-label" style="margin-bottom:8px">Resultados <small style="display:inline">(opcional)</small></p>
        <div class="campos-examen" id="campos"></div>
      </div>
      <div>
        <p class="form-label" style="margin-bottom:8px">Vista previa del campo <code>resultados</code></p>
        <pre class="json" id="json-prev"></pre>
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn btn-ghost" id="cancel-orden">Cancelar</button>
        <button type="submit" class="btn btn-primary">💾 ${esEdicion ? 'Actualizar' : 'Guardar'} Orden</button>
      </div>
    </form>
  `);

  const f = $('#form-orden', m);
  const prefill = esEdicion ? existente.resultados : {};

  const pintar = () => {
    const def = TIPOS[f.tipo.value];
    const campos = def?.campos || [];
    $('#campos', m).innerHTML = campos.map((c) => campoHTML(c, prefill[c[0]])).join('');
    prev();
  };
  const prev = () => { $('#json-prev', m).textContent = JSON.stringify(leerResultados(f, f.tipo.value), null, 2); };

  f.tipo.onchange = pintar;
  f.addEventListener('input', prev);
  $('#cancel-orden', m).onclick = () => m.close();

  f.onsubmit = (ev) => {
    ev.preventDefault();
    const tipoKey = f.tipo.value;
    if (!TIPOS[tipoKey]) return toast('Tipo de examen inválido.', 'error');

    const medico = f.medicoSolicitante.value.trim();
    if (!medico) { f.medicoSolicitante.focus(); return toast('Indica el médico solicitante.', 'error'); }

    const resultados = leerResultados(f, tipoKey);
    const estado = f.estado.value;
    let fechaResultado = f.fechaResultado.value || null;
    if (estado === 'completado' && !fechaResultado) fechaResultado = hoy();

    if (esEdicion) {
      Object.assign(existente, { medicoSolicitante: medico, estado, fechaResultado, resultados });
      toast('Orden actualizada');
    } else {
      examenes.unshift({
        id: generarIdOrden(),
        pacienteCui: f.pacienteCui.value,
        tipo: tipoKey,
        fechaSolicitud: f.fechaSolicitud.value || hoy(),
        fechaResultado,
        medicoSolicitante: medico,
        estado,
        resultados,
      });
      toast('Orden registrada');
    }

    guardarEstado();           // ← persistencia
    m.close();
    onGuardar?.();
  };

  pintar();
}

/* ---------- Vistas ---------- */
const vistas = {
  principal() {
    const render = () => {
      const n = (s) => examenes.filter((x) => x.estado === s).length;
      const kpis = [
        { ico: '⏳', label: 'Pendientes',        val: n('pendiente'),  bg: '#fef3c7', color: '#a16207' },
        { ico: '🧪', label: 'En proceso',        val: n('en_proceso'), bg: 'var(--primary-light)', color: 'var(--primary)' },
        { ico: '✅', label: 'Completados',       val: n('completado'), bg: '#dcfce7', color: '#15803d' },
        { ico: '👥', label: 'Pacientes activos', val: pacientes.filter((p) => p.activo).length, bg: 'var(--primary-light)', color: 'var(--primary)' },
      ];
      $('#inicio-kpi-container').innerHTML = `<div class="kpi-grid">${kpis.map((k) => `
        <div class="kpi-card kpi-row">
          <div class="kpi-icon-wrap" style="background:${k.bg};color:${k.color}">${k.ico}</div>
          <div><div class="kpi-num" style="color:${k.color}">${k.val}</div><div class="kpi-label">${k.label}</div></div>
        </div>`).join('')}</div>`;

      const pend = examenes.filter((e) => e.estado !== 'completado').sort((a, b) => a.fechaSolicitud.localeCompare(b.fechaSolicitud));
      $('#inicio-pendientes-container').innerHTML = tablaExamenes(pend);
    };
    render();
    refreshView = render;
  },

    expedientes() {
    let filtro = 'activos';
    const pintar = () => {
      const q = norm($('#exp-buscar').value);
      const lista = pacientes.filter((p) =>
        (filtro === 'todos' || (filtro === 'activos') === !!p.activo) &&
        norm([p.cui, p.nombre, p.apellidos, ...p.alergias].join(' ')).includes(q)
      );
      $('#table-container').innerHTML = tablaPacientes(lista);
      
      // Actualizar el texto informativo de la tabla
      const info = $('#table-info');
      if (info) {
        const filtroStr = filtro === 'activos' ? 'activos' : filtro === 'archivados' ? 'archivados' : 'totales';
        info.textContent = `${lista.length} de ${pacientes.length} resultados · Mostrando registros ${filtroStr}${q ? ` para "${q}"` : ' (sin términos restrictivos)'}`;
      }
    };

    // Calcular KPIs y llenarlos
    const total = pacientes.length;
    const activos = pacientes.filter(p => p.activo).length;
    const archivados = pacientes.filter(p => !p.activo).length;
    const completados = examenes.filter(e => e.estado === 'completado').length;
    const enProceso = examenes.filter(e => e.estado === 'en_proceso').length;
    const pendientes = examenes.filter(e => e.estado === 'pendiente').length;

    if ($('#kpi-total-pacientes')) $('#kpi-total-pacientes').innerHTML = `${total} <span>expedientes</span>`;
    if ($('#kpi-completados')) $('#kpi-completados').innerHTML = `${completados} <span>órdenes</span>`;
    if ($('#kpi-en-proceso')) $('#kpi-en-proceso').innerHTML = `${enProceso} <span>en curso</span>`;
    if ($('#kpi-pendientes')) $('#kpi-pendientes').innerHTML = `${pendientes} <span>en cola</span>`;

    if ($('#count-activos')) $('#count-activos').textContent = activos;
    if ($('#count-archivados')) $('#count-archivados').textContent = archivados;

    $('#exp-buscar').oninput = debounce(pintar);
    $('#exp-chips').onclick = (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      filtro = b.dataset.f;
      document.querySelectorAll('#exp-chips .chip').forEach((c) => c.classList.toggle('activo', c === b));
      pintar();
    };
    pintar();
    refreshView = pintar;
  },

  pacientes() {
    $('#sel-genero').innerHTML = GENEROS.map((g) => `<option>${esc(g)}</option>`).join('');
    $('#sel-sangre').innerHTML = TIPOS_SANGRE.map((s) => `<option>${esc(s)}</option>`).join('');

    const renderArchivar = () => {
      const act = pacientes.filter((p) => p.activo);
      $('#lista-archivar').innerHTML = act.length ? act.map((p) => `
        <div class="archivar-item">
          <div><b>${esc(p.nombre)} ${esc(p.apellidos)}</b><small>${esc(p.cui)}</small></div>
          <select class="form-control">${MOTIVOS_BAJA.map((m) => `<option>${esc(m)}</option>`).join('')}</select>
          <button type="button" class="btn btn-danger" data-archivar="${esc(p.cui)}">Archivar</button>
        </div>`).join('') : '<p class="vacio">No hay pacientes activos.</p>';
    };

    $('#lista-archivar').onclick = (e) => {
      const b = e.target.closest('[data-archivar]');
      if (!b) return;
      const p = paciente(b.dataset.archivar);
      if (!p) return;
      const motivo = b.previousElementSibling.value;
      if (!confirm(`¿Archivar el expediente de ${p.nombre} ${p.apellidos}?\nMotivo: ${motivo}`)) return;
      p.activo = false;
      p.motivoBaja = motivo;
      p.fechaBaja = hoy();
      guardarEstado();           // ← persistencia
      toast('Expediente archivado');
      renderArchivar();
    };

    $('#form-paciente').onsubmit = (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target));
      const cui = String(d.cui || '').trim();
      if (!/^\d{13}$/.test(cui)) return toast('El CUI debe tener 13 dígitos numéricos.', 'error');
      if (paciente(cui)) return toast('Ya existe un paciente con ese CUI.', 'error');

      pacientes.push({
        cui,
        nombre: String(d.nombre).trim(),
        apellidos: String(d.apellidos).trim(),
        fechaNacimiento: d.fechaNacimiento,
        genero: d.genero,
        tipoSangre: d.tipoSangre,
        telefono: String(d.telefono || '').trim(),
        direccion: String(d.direccion || '').trim(),
        alergias: String(d.alergias || '').split(',').map((a) => a.trim()).filter(Boolean),
        activo: true,
      });
      guardarEstado();           // ← persistencia
      e.target.reset();
      toast('Paciente registrado');
      renderArchivar();
    };

    renderArchivar();
    refreshView = renderArchivar;
  },

  examenes() {
    let filtro = 'todos';
    const pintar = () => {
      const q = norm($('#lab-buscar').value);
      const lista = examenes.filter((e) =>
        (filtro === 'todos' || e.estado === filtro) &&
        norm([e.id, nombreDe(e.pacienteCui), e.pacienteCui, tipoDe(e.tipo).nombre, e.medicoSolicitante].join(' ')).includes(q)
      );
      $('#laboratorio-table-container').innerHTML = tablaExamenes(lista);
    };
    $('#lab-buscar').oninput = debounce(pintar);
    $('#lab-chips').onclick = (e) => {
      const b = e.target.closest('.chip');
      if (!b) return;
      filtro = b.dataset.f;
      document.querySelectorAll('#lab-chips .chip').forEach((c) => c.classList.toggle('activo', c === b));
      pintar();
    };
    $('#btn-nueva-orden').onclick = () => formOrden(pintar);
    pintar();
    refreshView = pintar;
  },
};

/* ---------- Delegación global ---------- */
document.addEventListener('click', (e) => {
  const editBtn = e.target.closest('[data-editar]');
  if (editBtn) {
    const orden = examenes.find((x) => x.id === editBtn.dataset.editar);
    if (orden) formOrden(() => refreshView(), orden);
    return;
  }
  if (e.target.closest('button')) return;
  const fe = e.target.closest('tr[data-id]');
  if (fe) return detalleExamen(fe.dataset.id);
  const fp = e.target.closest('tr[data-cui]');
  if (fp) return detallePaciente(fp.dataset.cui);
});

/* ---------- Reiniciar demo ---------- */
function wireReset() {
  const btn = document.getElementById('btn-reset');
  if (!btn) return;
  btn.onclick = (e) => {
    e.preventDefault();
    if (!confirm('¿Borrar los cambios guardados y restaurar los datos de demostración?')) return;
    reiniciarDemo();
    guardarEstado();
    toast('Datos de demostración restaurados');
    refreshView();
  };
}

/* ---------- Router ---------- */
async function navegar() {
  const nombre = vistas[location.hash.slice(1)] ? location.hash.slice(1) : 'principal';
  
  // Resaltar en el Sidebar
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('activo', a.hash === `#${nombre}`));
  // Resaltar en el Topbar
  document.querySelectorAll('.topbar-tab').forEach((a) => a.classList.toggle('active', a.hash === `#${nombre}`));

  // Actualizar Badges del Sidebar
  const badgePac = document.getElementById('badge-pacientes');
  if (badgePac) badgePac.textContent = pacientes.length;
  const badgeOrd = document.getElementById('badge-ordenes');
  if (badgeOrd) badgeOrd.textContent = examenes.length;

  try {
    $('#vista').innerHTML = await fetchPlantillaHtml(`./vistas/${nombre}.html`);
    vistas[nombre]();
    window.__labboot = true;
  } catch (err) {
    $('#vista').innerHTML = `<div class="empty-state"><span class="icon">⚠️</span><p>No se pudo cargar la vista «${esc(nombre)}».</p></div>`;
    console.error(err);
  }
}

function wireTopAction() {
  const btn = document.getElementById('btn-top-action');
  if (!btn) return;
  btn.onclick = () => {
    if (location.hash === '#examenes') {
      // Si estamos en exámenes, abre el modal de nueva orden
      document.getElementById('btn-nueva-orden')?.click();
    } else {
      // Si no, manda a la vista de registro de pacientes
      window.location.hash = '#pacientes';
    }
  };
}

/* ---------- Bootstrap ---------- */
cargarEstado();                   // ← pobla los arrays (storage o semilla)
wireReset();
wireTopAction();
window.addEventListener('hashchange', navegar);
navegar();