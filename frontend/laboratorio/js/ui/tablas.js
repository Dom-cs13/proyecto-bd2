/* ============================================================
   tablas.js · Renderizado de Tablas para Laboratorio Clínico
   ============================================================ */

import { esc, fmt } from './modal.js';
import { TIPOS_LABORATORIO, ESTADOS_ORDEN, FLAGS_ANORMALIDAD } from '../catalogo.js';
import { examenes, nombreDeCui, obtenerMuestrasDeOrden } from '../datos.js';

export function emptyState(msg, icon = '📭') {
  return `<div class="tabla-wrap"><div class="empty-state"><span class="icon">${icon}</span><p>${esc(msg)}</p></div></div>`;
}

export function badgeEstado(estado) {
  const lbl = ESTADOS_ORDEN[estado] ?? estado;
  return `<span class="badge ${esc(estado)}">${esc(lbl)}</span>`;
}

export function badgeAnormalidad(flag) {
  if (!flag || flag === 'normal') return '';
  const info = FLAGS_ANORMALIDAD[flag] || { label: flag, color: '#6b7280', bg: '#f3f4f6' };
  return `<span class="badge" style="background:${info.bg}; color:${info.color}; font-weight:700; margin-left:4px;">${esc(info.label)}</span>`;
}

export function tablaExamenes(lista) {
  if (!lista.length) return emptyState('Sin exámenes registrados.', '🔬');

  return `<div class="tabla-wrap"><table>
    <thead>
      <tr>
        <th>Orden</th>
        <th>Paciente</th>
        <th>Especialidad / Tipo</th>
        <th>Médico Solicitante</th>
        <th>Solicitud</th>
        <th>Prioridad</th>
        <th>Muestra / Código</th>
        <th>Estado</th>
        <th></th>
      </tr>
    </thead>
    <tbody>${lista
      .map((e) => {
        const t = TIPOS_LABORATORIO[e.tipo || e.tipoLaboratorio] || { icono: '🔬', nombre: e.tipo || 'General' };
        const editable = e.estado !== 'completado';
        const ms = obtenerMuestrasDeOrden(e.id);
        const muestraBadge = ms.length
          ? `<span style="font-family:monospace;font-size:0.75rem;background:#f3f4f6;padding:2px 6px;border-radius:4px;">${esc(ms[0].codigoBarras)}</span>`
          : '<small style="color:#9ca3af">Sin muestra</small>';

        const esUrgente = e.prioridad === 'urgente';

        return `<tr data-id="${esc(e.id)}">
        <td><b>#${esc(e.id)}</b></td>
        <td><b>${esc(nombreDeCui(e.pacienteCui))}</b><small>${esc(e.pacienteCui)}</small></td>
        <td>${t.icono} ${esc(t.nombre)}</td>
        <td>${esc(e.medicoSolicitante)}</td>
        <td>${fmt(e.fechaSolicitud)}</td>
        <td><span style="font-size:0.75rem; font-weight:700; color:${esUrgente ? '#dc2626' : '#4b5563'};">${esUrgente ? '⚡ URGENTE' : 'Rutina'}</span></td>
        <td>${muestraBadge}</td>
        <td>${badgeEstado(e.estado)} ${badgeAnormalidad(e.flagAnormalidad)}</td>
        <td class="acciones-cell">
          ${editable ? `<button type="button" class="btn btn-ghost btn-small" data-editar="${esc(e.id)}">✏️ Completar</button>` : `<button type="button" class="btn btn-ghost btn-small" data-ver="${esc(e.id)}">👁️ Ver</button>`}
        </td>
      </tr>`;
      })
      .join('')}</tbody>
  </table></div>`;
}

export function tablaPacientes(lista) {
  if (!lista.length) return emptyState('Sin pacientes que coincidan.', '👥');

  return `<div class="tabla-wrap"><table>
    <thead>
      <tr>
        <th>CUI / Documento</th>
        <th>Paciente</th>
        <th>Género</th>
        <th>Sangre</th>
        <th>Alergias</th>
        <th>Órdenes</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>${lista
      .map(
        (p) => `
      <tr data-cui="${esc(p.cui || p.documentoIdentidad)}">
        <td><code>${esc(p.cui || p.documentoIdentidad)}</code></td>
        <td><b>${esc(p.nombre)} ${esc(p.apellidos)}</b><small>Nac: ${fmt(p.fechaNacimiento)}</small></td>
        <td>${esc(p.genero)}</td>
        <td><span class="badge" style="background:#fce7f3; color:#9d174d;">${esc(p.tipoSangre || 'O+')}</span></td>
        <td>${p.alergias && p.alergias.length ? esc(p.alergias.join(', ')) : '<span style="color:#9ca3af">—</span>'}</td>
        <td><b>${examenes.filter((e) => e.pacienteCui === (p.cui || p.documentoIdentidad)).length}</b></td>
        <td>${p.activo ? '<span class="badge completado">Activo</span>' : '<span class="badge archivado">Archivado</span>'}</td>
      </tr>`
      )
      .join('')}</tbody>
  </table></div>`;
}
