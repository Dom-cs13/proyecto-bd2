/* ============================================================
   formularios.js · Formularios Dinámicos para los 8 Laboratorios
   ============================================================ */

import { $, esc, fmt, hoy, abrirModal, toast } from './modal.js';
import {
  TIPOS_LABORATORIO,
  ESTADOS_ORDEN,
  TIPOS_MUESTRA,
  CONDICIONES_MUESTRA,
  ANTIBIOTICOS,
} from '../catalogo.js';
import {
  pacientes,
  examenes,
  muestras,
  guardarEstado,
  generarIdOrden,
  generarCodigoBarras,
  obtenerMuestrasDeOrden,
  buscarPaciente,
  nombreDeCui,
  crearOrdenApi,
} from '../datos.js';
import { tablaExamenes, badgeEstado, badgeAnormalidad } from './tablas.js';
import { renderResultadosEspecializados } from './visualizadores.js';
import {
  validarCamposObligatorios,
  obtenerRangoReferencia,
  calcularFlagAnormalidad,
  puedeValidarConMuestra,
} from '../reglas.js';

export function campoHTML([k, l, u, tipo, op, obligatorio], valor) {
  const reqStr = obligatorio ? ' *' : '';
  const lab = `<label class="form-label">${esc(l)}${u ? ` (${esc(u)})` : ''}${reqStr ? `<span style="color:#dc2626">${reqStr}</span>` : ''}</label>`;

  if (tipo === 'select') {
    const v = valor == null ? '' : String(valor);
    return `<div class="form-group">${lab}<select class="form-control" data-k="${esc(k)}" ${obligatorio ? 'required' : ''}>
      <option value="">— Seleccionar —</option>
      ${op.map((o) => `<option value="${esc(o)}" ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}
    </select></div>`;
  }

  const v = valor == null ? '' : String(valor);
  return `<div class="form-group">${lab}<input class="form-control" data-k="${esc(k)}" type="${tipo}" ${
    tipo === 'number' ? 'step="any"' : ''
  } value="${esc(v)}" ${obligatorio ? 'required' : ''}></div>`;
}

export function leerResultados(form, tipoLab) {
  const out = {};
  const def = TIPOS_LABORATORIO[tipoLab];
  if (!def) return out;

  (def.campos || []).forEach(([k, , , t]) => {
    const el = form.querySelector(`[data-k="${k}"]`);
    if (!el) return;
    const v = el.value.trim();
    if (v !== '') {
      out[k] = t === 'number' ? Number(v) : v;
    }
  });

  // Si es microbiología, leer antibiograma dinámico
  if (tipoLab === 'microbiologia') {
    const filasAnti = form.querySelectorAll('.fila-antibiograma');
    if (filasAnti.length > 0) {
      out.antibiograma = [...filasAnti]
        .map((f) => {
          const ant = f.querySelector('.sel-anti')?.value;
          const sens = f.querySelector('.sel-sens')?.value;
          const cmi = Number(f.querySelector('.inp-cmi')?.value) || null;
          return ant ? { antibiotico_nombre: ant, antibiotico_sensibilidad: sens || 'sensible', antibiotico_cmi: cmi } : null;
        })
        .filter(Boolean);
    }
  }

  return out;
}

/**
 * Modal detallado de un examen y sus muestras
 */
export function detalleExamen(id, onRefresh) {
  const e = examenes.find((x) => x.id === id);
  if (!e) return;
  const t = TIPOS_LABORATORIO[e.tipo || e.tipoLaboratorio] || { icono: '🔬', nombre: e.tipo, campos: [] };
  const ms = obtenerMuestrasDeOrden(e.id);

  const m = abrirModal(
    `${t.icono} ${esc(t.nombre)} · #${esc(e.id)}`,
    `
    <div style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
      <div>
        <p class="section-desc" style="margin:0 0 6px">
          <b>Paciente:</b> ${esc(nombreDeCui(e.pacienteCui))} (${esc(e.pacienteCui)})<br>
          <b>Médico:</b> ${esc(e.medicoSolicitante)} · Solicitud: ${fmt(e.fechaSolicitud)} · Resultado: ${fmt(e.fechaResultado)}
        </p>
      </div>
      <div>
        ${badgeEstado(e.estado)} ${badgeAnormalidad(e.flagAnormalidad)}
        <span class="badge" style="background:#f3f4f6; color:#374151;">${esc(e.prioridad === 'urgente' ? '⚡ Urgente' : 'Rutina')}</span>
      </div>
    </div>

    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-bottom:14px;">
      <h4 style="font-size:0.85rem; margin:0 0 6px; color:#475569;">🧪 Muestras vinculadas:</h4>
      ${
        ms.length
          ? ms
              .map(
                (mue) => `
          <div style="font-size:0.82rem; margin-bottom:4px; display:flex; gap:12px; align-items:center;">
            <code>${esc(mue.codigoBarras)}</code>
            <span>Tipo: <b>${esc(mue.tipoMuestra)}</b></span>
            <span>Condición: <b>${esc(mue.condicionMuestra)}</b></span>
            <span>Estado: <b>${esc(mue.estadoMuestra)}</b></span>
          </div>`
              )
              .join('')
          : '<p style="font-size:0.8rem; color:#94a3b8; margin:0;">No hay muestra física asignada todavía.</p>'
      }
    </div>

    <h4 style="font-size:0.85rem; margin:14px 0 8px; color:#475569;">📊 Resultados Especializados del Estudio:</h4>
    ${renderResultadosEspecializados(e, buscarPaciente(e.pacienteCui))}

    <h4 style="font-size:0.85rem; margin:12px 0 6px; color:#475569;">🧾 JSON estructurado de salida (LSP):</h4>
    <pre class="json">${esc(
      JSON.stringify(
        {
          id: e.id,
          pacienteCui: e.pacienteCui,
          tipoLaboratorio: e.tipo || e.tipoLaboratorio,
          flagAnormalidad: e.flagAnormalidad,
          estado: e.estado,
          tecnicoValido: e.tecnicoValido || null,
          fechaValidacion: e.fechaValidacion || null,
          resultados: e.resultados,
        },
        null,
        2
      )
    )}</pre>

    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      ${
        e.estado !== 'completado'
          ? '<button type="button" class="btn btn-primary" id="btn-edit-orden">✏️ Ingresar Resultados / Validar</button>'
          : ''
      }
    </div>`
  );

  const btn = m.querySelector('#btn-edit-orden');
  if (btn) {
    btn.onclick = () => {
      m.close();
      formOrden(onRefresh, e);
    };
  }
}

/**
 * Modal detallado del paciente con su historial completo
 */
export function detallePaciente(cui, onRefresh) {
  const p = buscarPaciente(cui);
  if (!p) return;
  const lista = examenes.filter((e) => e.pacienteCui === cui);
  const m = abrirModal(
    `👤 ${esc(p.nombre)} ${esc(p.apellidos)}`,
    `
    <p class="section-desc" style="margin:0 0 14px">
      <b>CUI / Documento:</b> ${esc(p.cui || p.documentoIdentidad)} · <b>Género:</b> ${esc(p.genero)} · <b>Sangre:</b> ${esc(p.tipoSangre || 'O+')}<br>
      <b>Teléfono:</b> ${esc(p.telefono || '—')} · <b>Dirección:</b> ${esc(p.direccion || '—')}<br>
      <b>Alergias:</b> ${p.alergias && p.alergias.length ? esc(p.alergias.join(', ')) : 'ninguna registrada'}<br>
      ${p.activo ? '<b>Estado:</b> <span class="badge completado">Activo</span>' : `<b>Archivado:</b> ${esc(p.motivoBaja)} (${fmt(p.fechaBaja)})`}
    </p>
    <h3 class="section-title" style="margin-bottom:10px">Historial de órdenes y estudios</h3>${tablaExamenes(lista)}
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
      ${p.activo ? '<button type="button" class="btn btn-ghost" id="btn-nueva-orden-pac">🔬 Nueva orden de laboratorio</button>' : ''}
    </div>`
  );

  const b = m.querySelector('#btn-nueva-orden-pac');
  if (b) {
    b.onclick = () => {
      m.close();
      formOrden(onRefresh, null, p.cui);
    };
  }
}

/**
 * Modal y formulario principal para crear o completar una orden
 */
export function formOrden(onGuardar, existente = null, preseCui = null, preseTipo = null) {
  const esEdicion = !!existente;

  if (!esEdicion && !pacientes.some((p) => p.activo)) {
    return toast('No hay pacientes activos para asignar la orden.', 'error');
  }

  const selCui = existente?.pacienteCui || preseCui;
  const pacientesOpts = pacientes
    .filter((p) => p.activo)
    .map(
      (p) =>
        `<option value="${esc(p.cui || p.documentoIdentidad)}" ${selCui === (p.cui || p.documentoIdentidad) ? 'selected' : ''}>${esc(
          p.nombre
        )} ${esc(p.apellidos)} · ${esc(p.cui || p.documentoIdentidad)}</option>`
    )
    .join('');

  const tipoSeleccionado = existente?.tipo || existente?.tipoLaboratorio || preseTipo || 'hematologia';
  const tiposOpts = Object.entries(TIPOS_LABORATORIO)
    .map(
      ([k, t]) =>
        `<option value="${k}" ${tipoSeleccionado === k ? 'selected' : ''}>${t.icono} ${esc(t.nombre)}</option>`
    )
    .join('');

  const ordenId = existente?.id || generarIdOrden();
  const msExistente = obtenerMuestrasDeOrden(ordenId);
  const muestraActual = msExistente[0] || null;

  const m = abrirModal(
    esEdicion ? `✏️ Orden #${esc(ordenId)} · Completar Resultados` : `🔬 Generar Orden de Laboratorio #${esc(ordenId)}`,
    `
    <form id="form-orden" class="form" novalidate>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Paciente *</label>
          <select name="pacienteCui" class="form-control" required ${esEdicion ? 'disabled' : ''}>${pacientesOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Tipo de Laboratorio *</label>
          <select name="tipo" class="form-control" ${esEdicion ? 'disabled' : ''}>${tiposOpts}</select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">Médico solicitante *</label>
          <input name="medicoSolicitante" class="form-control" required value="${esc(
            existente?.medicoSolicitante || ''
          )}" placeholder="Ej. Dr. Rodrigo Palma">
        </div>
        <div class="form-group"><label class="form-label">Prioridad</label>
          <select name="prioridad" class="form-control">
            <option value="rutina" ${(existente?.prioridad || 'rutina') === 'rutina' ? 'selected' : ''}>Rutina</option>
            <option value="urgente" ${existente?.prioridad === 'urgente' ? 'selected' : ''}>⚡ Urgente</option>
          </select>
        </div>
      </div>

      <!-- SECCIÓN MUESTRA VINCULADA -->
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:0.85rem; margin:0; color:#334155;">🧪 Datos de la Muestra (Regla 2 & 9)</h4>
          <span style="font-size:0.75rem; font-family:monospace; background:#e0e7ff; color:#3730a3; padding:2px 8px; border-radius:4px;">
            Código: <b id="lbl-codigo-barras">${esc(muestraActual?.codigoBarras || generarCodigoBarras(ordenId, tipoSeleccionado))}</b>
          </span>
        </div>
        <div class="form-row" style="margin-bottom:0;">
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Tipo de Muestra</label>
            <select name="tipoMuestra" class="form-control" id="sel-tipo-muestra">
              ${TIPOS_MUESTRA.map(
                (tm) => `<option value="${tm}" ${(muestraActual?.tipoMuestra || 'sangre_venosa') === tm ? 'selected' : ''}>${tm}</option>`
              ).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:0;">
            <label class="form-label">Condición de Muestra</label>
            <select name="condicionMuestra" class="form-control" id="sel-cond-muestra">
              ${CONDICIONES_MUESTRA.map(
                (cm) => `<option value="${cm}" ${(muestraActual?.condicionMuestra || 'optima') === cm ? 'selected' : ''}>${cm}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group"><label class="form-label">Fecha de solicitud</label>
          <input name="fechaSolicitud" type="date" class="form-control" value="${esc(
            existente?.fechaSolicitud || hoy()
          )}" ${esEdicion ? 'disabled' : ''}>
        </div>
        <div class="form-group"><label class="form-label">Estado de la Orden</label>
          <select name="estado" class="form-control" id="sel-estado-orden">
            ${Object.entries(ESTADOS_ORDEN)
              .map(([k, v]) => `<option value="${k}" ${(existente?.estado || 'pendiente') === k ? 'selected' : ''}>${v}</option>`)
              .join('')}
          </select>
        </div>
      </div>

      <div class="form-row" id="fila-validacion" style="display:${(existente?.estado || 'pendiente') === 'completado' ? 'grid' : 'none'};">
        <div class="form-group"><label class="form-label">Técnico Validador (Regla 7) *</label>
          <input name="tecnicoValido" class="form-control" value="${esc(existente?.tecnicoValido || 'Lic. Andrés Mazariegos')}" placeholder="Firma técnica">
        </div>
        <div class="form-group"><label class="form-label">Fecha de Validación</label>
          <input name="fechaResultado" type="date" class="form-control" value="${esc(existente?.fechaResultado || hoy())}">
        </div>
      </div>

      <div>
        <p class="form-label" style="margin-bottom:8px"><b>Resultados Específicos del Tipo de Laboratorio</b></p>
        <div class="campos-examen" id="campos"></div>
      </div>

      <div id="antibiograma-wrap" style="display:none; margin-top:10px; background:#faf5ff; border:1px solid #d8b4fe; border-radius:8px; padding:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:0.85rem; margin:0; color:#6b21a8;">🦠 Antibiograma (Regla 6)</h4>
          <button type="button" class="btn btn-ghost btn-small" id="btn-add-anti">➕ Agregar Antibiótico</button>
        </div>
        <div id="lista-antibiograma"></div>
      </div>

      <div id="alerta-critica-box" style="display:none; margin:12px 0; background:#fee2e2; border:1px solid #ef4444; border-radius:8px; padding:10px; color:#991b1b; font-weight:700;">
        🚨 ALERTA CRÍTICA: Se detectó un valor en umbral de alarma médica inmediata (Regla 5).
      </div>

      <div>
        <p class="form-label" style="margin-bottom:8px">Vista previa estructurada</p>
        <pre class="json" id="json-prev"></pre>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn btn-ghost" id="cancel-orden">Cancelar</button>
        <button type="submit" class="btn btn-primary">💾 ${esEdicion ? 'Actualizar' : 'Guardar'} Orden</button>
      </div>
    </form>
  `
  );

  const f = $('#form-orden', m);
  const prefill = esEdicion ? existente.resultados || {} : {};

  // Control de estado de orden y visualización de validación
  $('#sel-estado-orden', m).onchange = (ev) => {
    $('#fila-validacion', m).style.display = ev.target.value === 'completado' ? 'grid' : 'none';
  };

  const pintar = () => {
    const tipo = f.tipo.value;
    const def = TIPOS_LABORATORIO[tipo];
    const campos = def?.campos || [];
    $('#campos', m).innerHTML = campos.map((c) => campoHTML(c, prefill[c[0]])).join('');

    // Ajustar opciones de tipo de muestra según compatibilidad
    if (def?.muestrasCompatibles) {
      $('#sel-tipo-muestra', m).innerHTML = def.muestrasCompatibles
        .map((tm) => `<option value="${tm}">${tm}</option>`)
        .join('');
    }

    // Antibiograma visible en microbiología
    const wrapAnti = $('#antibiograma-wrap', m);
    if (tipo === 'microbiologia') {
      wrapAnti.style.display = 'block';
    } else {
      wrapAnti.style.display = 'none';
    }

    prev();
  };

  const prev = () => {
    const vals = leerResultados(f, f.tipo.value);
    const tipo = f.tipo.value;
    const pac = buscarPaciente(f.pacienteCui.value);

    // Calcular flag de anormalidad automático (Regla 4)
    let flag = 'normal';
    if (tipo === 'hematologia' && vals.hemoglobina) {
      const rango = obtenerRangoReferencia('hemoglobina', pac);
      flag = calcularFlagAnormalidad(vals.hemoglobina, rango);
    } else if (tipo === 'quimica' && vals.valor_numerico && vals.rango_referencia_min && vals.rango_referencia_max) {
      flag = calcularFlagAnormalidad(vals.valor_numerico, {
        min: vals.rango_referencia_min,
        max: vals.rango_referencia_max,
      });
    }

    // Regla 5: Alerta crítica
    const alertaBox = $('#alerta-critica-box', m);
    if (alertaBox) {
      alertaBox.style.display = flag.startsWith('critico') ? 'block' : 'none';
    }

    $('#json-prev', m).textContent = JSON.stringify(
      {
        id: ordenId,
        pacienteCui: f.pacienteCui.value,
        tipoLaboratorio: tipo,
        flagAnormalidad: flag,
        resultados: vals,
      },
      null,
      2
    );
  };

  // Manejo de antibiograma dinámico
  const addAntiRow = (nombre = '', sens = 'sensible', cmi = '') => {
    const div = document.createElement('div');
    div.className = 'fila-antibiograma';
    div.style = 'display:flex; gap:8px; margin-bottom:6px; align-items:center;';
    div.innerHTML = `
      <select class="form-control sel-anti" style="flex:2">
        <option value="">— Antibiótico —</option>
        ${ANTIBIOTICOS.map((a) => `<option value="${a}" ${nombre === a ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
      <select class="form-control sel-sens" style="flex:1">
        <option value="sensible" ${sens === 'sensible' ? 'selected' : ''}>Sensible</option>
        <option value="intermedio" ${sens === 'intermedio' ? 'selected' : ''}>Intermedio</option>
        <option value="resistente" ${sens === 'resistente' ? 'selected' : ''}>Resistente</option>
      </select>
      <input type="number" step="any" class="form-control inp-cmi" style="flex:1" placeholder="CMI µg/mL" value="${cmi}">
      <button type="button" class="btn btn-ghost btn-small" style="color:#ef4444">✕</button>
    `;
    div.querySelector('button').onclick = () => {
      div.remove();
      prev();
    };
    $('#lista-antibiograma', m).appendChild(div);
  };

  const btnAddAnti = $('#btn-add-anti', m);
  if (btnAddAnti) {
    btnAddAnti.onclick = () => addAntiRow();
  }

  // Si había antibiograma previo
  if (prefill.antibiograma && Array.isArray(prefill.antibiograma)) {
    prefill.antibiograma.forEach((a) => addAntiRow(a.antibiotico_nombre, a.antibiotico_sensibilidad, a.antibiotico_cmi));
  }

  f.tipo.onchange = pintar;
  f.addEventListener('input', prev);
  $('#cancel-orden', m).onclick = () => m.close();

  f.onsubmit = (ev) => {
    ev.preventDefault();
    const tipoKey = f.tipo.value;
    const def = TIPOS_LABORATORIO[tipoKey];
    if (!def) return toast('Tipo de laboratorio inválido.', 'error');

    const medico = f.medicoSolicitante.value.trim();
    if (!medico) {
      f.medicoSolicitante.focus();
      return toast('Indica el médico solicitante.', 'error');
    }

    const estado = f.estado.value;
    const condMuestra = $('#sel-cond-muestra', m).value;
    const tipoMuestra = $('#sel-tipo-muestra', m).value;

    // Regla 3: Si se quiere completar/validar, la muestra no debe estar rechazada o insuficiente
    if (estado === 'completado') {
      const checkMuestra = puedeValidarConMuestra({ condicionMuestra: condMuestra, estadoMuestra: estado });
      if (!checkMuestra.ok) {
        return toast(checkMuestra.error, 'error');
      }
    }

    const resultados = leerResultados(f, tipoKey);

    // Regla 10: Si se completa, validar campos obligatorios
    if (estado === 'completado') {
      const checkCampos = validarCamposObligatorios(tipoKey, resultados);
      if (!checkCampos.ok) {
        return toast(checkCampos.error, 'error');
      }
    }

    // Regla 4: Calcular flag automático
    const pac = buscarPaciente(f.pacienteCui.value);
    let flagAnormalidad = 'normal';
    if (tipoKey === 'hematologia' && resultados.hemoglobina) {
      flagAnormalidad = calcularFlagAnormalidad(resultados.hemoglobina, obtenerRangoReferencia('hemoglobina', pac));
    } else if (tipoKey === 'quimica' && resultados.valor_numerico) {
      flagAnormalidad = calcularFlagAnormalidad(resultados.valor_numerico, {
        min: resultados.rango_referencia_min,
        max: resultados.rango_referencia_max,
      });
    }

    let fechaResultado = f.fechaResultado ? f.fechaResultado.value : null;
    if (estado === 'completado' && !fechaResultado) fechaResultado = hoy();

    const tecnicoValido = f.tecnicoValido ? f.tecnicoValido.value.trim() : null;

    // Guardar o actualizar muestra vinculada (Regla 2)
    const codigoBarras = muestraActual?.codigoBarras || generarCodigoBarras(ordenId, tipoKey);
    const idMuestra = muestraActual?.id || `MUE-${ordenId.replace('ORD-', '')}`;

    if (muestraActual) {
      Object.assign(muestraActual, {
        tipoMuestra,
        condicionMuestra: condMuestra,
        estadoMuestra: estado === 'completado' ? 'completada' : 'en_proceso',
      });
    } else {
      muestras.push({
        id: idMuestra,
        ordenId,
        codigoBarras,
        tipoMuestra,
        condicionMuestra: condMuestra,
        estadoMuestra: estado === 'completado' ? 'completada' : 'en_proceso',
        fechaToma: new Date().toISOString(),
      });
    }

    if (esEdicion) {
      Object.assign(existente, {
        medicoSolicitante: medico,
        prioridad: f.prioridad.value,
        estado,
        fechaResultado,
        tecnicoValido: estado === 'completado' ? tecnicoValido : null,
        fechaValidacion: estado === 'completado' ? new Date().toISOString() : null,
        flagAnormalidad,
        resultados,
      });
      toast('Orden de laboratorio actualizada');
    } else {
      examenes.unshift({
        id: ordenId,
        pacienteCui: f.pacienteCui.value,
        tipo: tipoKey,
        tipoLaboratorio: tipoKey,
        fechaSolicitud: f.fechaSolicitud.value || hoy(),
        fechaResultado,
        medicoSolicitante: medico,
        prioridad: f.prioridad.value,
        estado,
        flagAnormalidad,
        tecnicoValido: estado === 'completado' ? tecnicoValido : null,
        fechaValidacion: estado === 'completado' ? new Date().toISOString() : null,
        resultados,
      });
      toast('Orden de examen registrada con éxito');
      crearOrdenApi({
        id: ordenId,
        numeroOrden: ordenId,
        pacienteId: f.pacienteCui.value,
        tipoLaboratorio: tipoKey,
        fechaSolicitud: f.fechaSolicitud.value || hoy(),
        medicoSolicitante: medico,
        prioridad: f.prioridad.value,
        estadoOrden: estado,
        examenesSolicitados: [{ codigo: tipoKey.toUpperCase(), nombre: `Examen de ${tipoKey}`, tipoLaboratorio: tipoKey }],
      });
    }

    guardarEstado();
    m.close();
    onGuardar?.();
  };

  pintar();
}
