/* ============================================================
   vistas.js · Controladores de Vistas para Laboratorio Clínico
   ============================================================ */

import { $, norm, debounce, toast, hoy } from './modal.js';
import { GENEROS, TIPOS_SANGRE, MOTIVOS_BAJA } from '../catalogo.js';
import {
  pacientes,
  examenes,
  guardarEstado,
  buscarPaciente,
} from '../datos.js';
import { tablaExamenes, tablaPacientes } from './tablas.js';
import { formOrden } from './formularios.js';

export const vistas = {
  principal(onRefreshView) {
    const render = () => {
      const n = (s) => examenes.filter((x) => x.estado === s).length;
      const kpis = [
        { ico: '⏳', label: 'Pendientes', val: n('pendiente'), bg: '#fef3c7', color: '#a16207' },
        { ico: '🧪', label: 'En proceso', val: n('en_proceso'), bg: 'var(--primary-light)', color: 'var(--primary)' },
        { ico: '✅', label: 'Completados', val: n('completado'), bg: '#dcfce7', color: '#15803d' },
        {
          ico: '👥',
          label: 'Pacientes activos',
          val: pacientes.filter((p) => p.activo).length,
          bg: 'var(--primary-light)',
          color: 'var(--primary)',
        },
      ];

      const kpiContainer = $('#inicio-kpi-container');
      if (kpiContainer) {
        kpiContainer.innerHTML = `<div class="kpi-grid">${kpis
          .map(
            (k) => `
          <div class="kpi-card kpi-row">
            <div class="kpi-icon-wrap" style="background:${k.bg};color:${k.color}">${k.ico}</div>
            <div><div class="kpi-num" style="color:${k.color}">${k.val}</div><div class="kpi-label">${k.label}</div></div>
          </div>`
          )
          .join('')}</div>`;
      }

      const pend = examenes
        .filter((e) => e.estado !== 'completado')
        .sort((a, b) => a.fechaSolicitud.localeCompare(b.fechaSolicitud));
      const pendContainer = $('#inicio-pendientes-container');
      if (pendContainer) {
        pendContainer.innerHTML = tablaExamenes(pend);
      }
    };

    const btnNuevoInicio = $('#btn-nuevo-estudio-inicio');
    if (btnNuevoInicio) btnNuevoInicio.onclick = () => formOrden(render);

    const btnAgregarGeneral = $('#btn-agregar-estudio-general');
    if (btnAgregarGeneral) btnAgregarGeneral.onclick = () => formOrden(render);

    document.querySelectorAll('[data-nuevo-tipo]').forEach((btn) => {
      btn.onclick = () => formOrden(render, null, null, btn.dataset.nuevoTipo);
    });

    render();
    onRefreshView(render);
  },

  expedientes(onRefreshView) {
    let filtro = 'activos';
    const pintar = () => {
      const q = norm($('#exp-buscar')?.value);
      const lista = pacientes.filter(
        (p) =>
          (filtro === 'todos' || (filtro === 'activos') === !!p.activo) &&
          norm([p.cui, p.documentoIdentidad, p.nombre, p.apellidos, ...(p.alergias || [])].join(' ')).includes(q)
      );

      const tableContainer = $('#table-container');
      if (tableContainer) tableContainer.innerHTML = tablaPacientes(lista);

      const info = $('#table-info');
      if (info) {
        const filtroStr = filtro === 'activos' ? 'activos' : filtro === 'archivados' ? 'archivados' : 'totales';
        info.textContent = `${lista.length} de ${pacientes.length} resultados · Mostrando registros ${filtroStr}${
          q ? ` para "${q}"` : ' (sin términos restrictivos)'
        }`;
      }
    };

    const total = pacientes.length;
    const activos = pacientes.filter((p) => p.activo).length;
    const archivados = pacientes.filter((p) => !p.activo).length;
    const completados = examenes.filter((e) => e.estado === 'completado').length;
    const enProceso = examenes.filter((e) => e.estado === 'en_proceso').length;
    const pendientes = examenes.filter((e) => e.estado === 'pendiente').length;

    if ($('#kpi-total-pacientes')) $('#kpi-total-pacientes').innerHTML = `${total} <span>expedientes</span>`;
    if ($('#kpi-completados')) $('#kpi-completados').innerHTML = `${completados} <span>órdenes</span>`;
    if ($('#kpi-en-proceso')) $('#kpi-en-proceso').innerHTML = `${enProceso} <span>en curso</span>`;
    if ($('#kpi-pendientes')) $('#kpi-pendientes').innerHTML = `${pendientes} <span>en cola</span>`;

    if ($('#count-activos')) $('#count-activos').textContent = activos;
    if ($('#count-archivados')) $('#count-archivados').textContent = archivados;

    const inpBuscar = $('#exp-buscar');
    if (inpBuscar) inpBuscar.oninput = debounce(pintar);

    const chips = $('#exp-chips');
    if (chips) {
      chips.onclick = (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        filtro = b.dataset.f;
        document.querySelectorAll('#exp-chips .chip').forEach((c) => c.classList.toggle('activo', c === b));
        pintar();
      };
    }

    pintar();
    onRefreshView(pintar);
  },

  pacientes(onRefreshView) {
    const selGenero = $('#sel-genero');
    if (selGenero) selGenero.innerHTML = GENEROS.map((g) => `<option>${g}</option>`).join('');

    const selSangre = $('#sel-sangre');
    if (selSangre) selSangre.innerHTML = TIPOS_SANGRE.map((s) => `<option>${s}</option>`).join('');

    const renderArchivar = () => {
      const act = pacientes.filter((p) => p.activo);
      const listaArchivar = $('#lista-archivar');
      if (listaArchivar) {
        listaArchivar.innerHTML = act.length
          ? act
              .map(
                (p) => `
          <div class="archivar-item">
            <div><b>${p.nombre} ${p.apellidos}</b><small>${p.cui || p.documentoIdentidad}</small></div>
            <select class="form-control">${MOTIVOS_BAJA.map((m) => `<option>${m}</option>`).join('')}</select>
            <button type="button" class="btn btn-danger" data-archivar="${p.cui || p.documentoIdentidad}">Archivar</button>
          </div>`
              )
              .join('')
          : '<p class="vacio">No hay pacientes activos para archivar.</p>';
      }
    };

    const listaArchivar = $('#lista-archivar');
    if (listaArchivar) {
      listaArchivar.onclick = (e) => {
        const b = e.target.closest('[data-archivar]');
        if (!b) return;
        const p = buscarPaciente(b.dataset.archivar);
        if (!p) return;
        const motivo = b.previousElementSibling.value;
        if (!confirm(`¿Archivar el expediente de ${p.nombre} ${p.apellidos}?\nMotivo formal: ${motivo}`)) return;
        p.activo = false;
        p.motivoBaja = motivo;
        p.fechaBaja = hoy();
        guardarEstado();
        toast('Expediente archivado con justificación');
        renderArchivar();
      };
    }

    const formPac = $('#form-paciente');
    if (formPac) {
      formPac.onsubmit = (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const cui = String(d.cui || '').trim();
        if (!/^\d{13}$/.test(cui)) return toast('El CUI debe tener 13 dígitos numéricos.', 'error');
        if (buscarPaciente(cui)) return toast('Ya existe un paciente con ese CUI/Documento.', 'error');

        pacientes.push({
          cui,
          documentoIdentidad: cui,
          nombre: String(d.nombre).trim(),
          apellidos: String(d.apellidos).trim(),
          fechaNacimiento: d.fechaNacimiento,
          genero: d.genero,
          tipoSangre: d.tipoSangre,
          telefono: String(d.telefono || '').trim(),
          direccion: String(d.direccion || '').trim(),
          alergias: String(d.alergias || '')
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
          activo: true,
          detallesInstitucion: {
            tipoPaciente: 'ambulatorio',
            servicioProcedencia: 'Admisión Laboratorio',
          },
        });

        guardarEstado();
        e.target.reset();
        toast('Paciente registrado en el Laboratorio');
        renderArchivar();
      };
    }

    renderArchivar();
    onRefreshView(renderArchivar);
  },

  examenes(onRefreshView) {
    let filtro = 'todos';
    const pintar = () => {
      const q = norm($('#lab-buscar')?.value);
      const lista = examenes.filter(
        (e) =>
          (filtro === 'todos' || e.estado === filtro) &&
          norm([e.id, e.pacienteCui, e.tipo, e.tipoLaboratorio, e.medicoSolicitante].join(' ')).includes(q)
      );

      const tableContainer = $('#laboratorio-table-container');
      if (tableContainer) tableContainer.innerHTML = tablaExamenes(lista);
    };

    const inpBuscar = $('#lab-buscar');
    if (inpBuscar) inpBuscar.oninput = debounce(pintar);

    const chips = $('#lab-chips');
    if (chips) {
      chips.onclick = (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        filtro = b.dataset.f;
        document.querySelectorAll('#lab-chips .chip').forEach((c) => c.classList.toggle('activo', c === b));
        pintar();
      };
    }

    const btnNueva = $('#btn-nueva-orden');
    if (btnNueva) btnNueva.onclick = () => formOrden(pintar);

    pintar();
    onRefreshView(pintar);
  },
};
