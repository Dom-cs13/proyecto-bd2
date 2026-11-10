/* ============================================================
   vistas.js · Controladores de Vistas para Laboratorio Clínico
   ============================================================ */

import { $, norm, debounce, toast, abrirModal } from './modal.js';
import { consultarRed } from '../../../shared/js/components/consultaRed.js';
import { GENEROS, TIPOS_SANGRE, MOTIVOS_BAJA } from '../catalogo.js';
import {
  pacientes,
  examenes,
  buscarPaciente,
  crearPacienteApi,
  archivarPacienteApi,
} from '../datos.js';
import { tablaExamenes, tablaPacientes } from './tablas.js';
import { formOrden } from './formularios.js';

export const vistas = {
  /* ---------- 1. Vista de Inicio / Resumen de Carga ---------- */
  principal(onRefreshView) {
    const render = () => {
      const nPend = examenes.filter((x) => x.estado === 'pendiente').length;
      const nProc = examenes.filter((x) => x.estado === 'en_proceso').length;
      const nComp = examenes.filter((x) => x.estado === 'completado').length;

      // KPIs de inicio
      const contKpis = $('#inicio-kpi-container') || $('#kpis');
      if (contKpis) {
        contKpis.innerHTML = `
          <div class="kpi-dashboard-grid">
            <div class="kpi-card-light">
              <div class="kpi-top"><div class="kpi-icon-wrap">📋</div><span class="kpi-badge">Total</span></div>
              <div class="kpi-label">Órdenes Registradas</div>
              <div class="kpi-value">${examenes.length} <span>estudios</span></div>
            </div>
            <div class="kpi-card-light">
              <div class="kpi-top"><div class="kpi-icon-wrap">⏳</div><span class="kpi-badge">En Cola</span></div>
              <div class="kpi-label">Pendientes de Muestra</div>
              <div class="kpi-value">${nPend} <span>órdenes</span></div>
            </div>
            <div class="kpi-card-light">
              <div class="kpi-top"><div class="kpi-icon-wrap">🔬</div><span class="kpi-badge">Analizador</span></div>
              <div class="kpi-label">En Procesamiento</div>
              <div class="kpi-value">${nProc} <span>en curso</span></div>
            </div>
            <div class="kpi-card-light">
              <div class="kpi-top"><div class="kpi-icon-wrap">✅</div><span class="kpi-badge">Finalizados</span></div>
              <div class="kpi-label">Resultados Validados</div>
              <div class="kpi-value">${nComp} <span>completados</span></div>
            </div>
          </div>
        `;
      }

      // Tabla de órdenes pendientes y en proceso
      const contPend = $('#inicio-pendientes-container') || $('#ultimos-examenes');
      if (contPend) {
        const pendientes = examenes.filter((x) => x.estado === 'pendiente' || x.estado === 'en_proceso');
        contPend.innerHTML = tablaExamenes(pendientes.length ? pendientes : examenes.slice(0, 5));
      }
    };

    // Botones de acción de inicio
    const btnNuevo = $('#btn-nuevo-estudio-inicio');
    if (btnNuevo) btnNuevo.onclick = () => formOrden(render);

    const btnAgregar = $('#btn-agregar-estudio-general');
    if (btnAgregar) btnAgregar.onclick = () => formOrden(render);

    // Botones rápidos por especialidad
    document.querySelectorAll('[data-nuevo-tipo]').forEach((btn) => {
      btn.onclick = () => formOrden(render, null, null, btn.dataset.nuevoTipo);
    });

    render();
    onRefreshView(render);
  },

  /* ---------- 2. Base de Datos Clínica · Expedientes de Pacientes ---------- */
  expedientes(onRefreshView) {
    let q = '';
    let fEstado = 'activos'; // 'activos' | 'archivados'

    const render = () => {
      // Actualizar contadores de KPI
      const nComp = examenes.filter((x) => x.estado === 'completado').length;
      const nProc = examenes.filter((x) => x.estado === 'en_proceso').length;
      const nPend = examenes.filter((x) => x.estado === 'pendiente').length;
      const nAct = pacientes.filter((p) => p.activo).length;
      const nArch = pacientes.filter((p) => !p.activo).length;

      const elTotal = $('#kpi-total-pacientes');
      if (elTotal) elTotal.innerHTML = `${pacientes.length} <span>expedientes</span>`;
      const elComp = $('#kpi-completados');
      if (elComp) elComp.innerHTML = `${nComp} <span>órdenes</span>`;
      const elProc = $('#kpi-en-proceso');
      if (elProc) elProc.innerHTML = `${nProc} <span>en curso</span>`;
      const elPend = $('#kpi-pendientes');
      if (elPend) elPend.innerHTML = `${nPend} <span>en cola</span>`;

      const elCntAct = $('#count-activos');
      if (elCntAct) elCntAct.textContent = nAct;
      const elCntArch = $('#count-archivados');
      if (elCntArch) elCntArch.textContent = nArch;

      // Filtrado
      const qN = norm(q);
      const filtrados = pacientes.filter((p) => {
        if (fEstado === 'activos' && !p.activo) return false;
        if (fEstado === 'archivados' && p.activo) return false;
        if (!qN) return true;
        const nombreCompleto = norm(`${p.nombre || ''} ${p.apellidos || ''}`);
        const cui = norm(p.cui || p.documentoIdentidad || '');
        const tel = norm(p.telefono || '');
        const dir = norm(p.direccion || '');
        const alergias = norm((p.alergias || []).join(' '));
        return nombreCompleto.includes(qN) || cui.includes(qN) || tel.includes(qN) || dir.includes(qN) || alergias.includes(qN);
      });

      const tableInfo = $('#table-info');
      if (tableInfo) {
        tableInfo.textContent = `Mostrando ${filtrados.length} de ${pacientes.length} pacientes registrados`;
      }

      const cont = $('#table-container') || $('#tabla-expedientes');
      if (cont) cont.innerHTML = tablaPacientes(filtrados);
    };

    // Búsqueda en vivo con debounce
    const inputBuscar = $('#exp-buscar') || $('#filtro-expedientes-q');
    if (inputBuscar) {
      inputBuscar.placeholder = 'Buscar localmente; Enter para consultar la red';
      inputBuscar.onkeydown = (evento) => {
        if (evento.key !== 'Enter' || !inputBuscar.value.trim()) return;
        evento.preventDefault();
        const modal = abrirModal('Consulta en red · solo lectura', '<div id="resultados-red"></div>');
        if (modal) consultarRed(inputBuscar.value, modal.querySelector('#resultados-red'));
      };
      inputBuscar.oninput = debounce((e) => {
        q = e.target.value;
        render();
      }, 250);
    }

    // Chips de filtrado activos / archivados
    const chipsCont = $('#exp-chips');
    if (chipsCont) {
      chipsCont.querySelectorAll('.chip').forEach((ch) => {
        ch.onclick = () => {
          chipsCont.querySelectorAll('.chip').forEach((c) => c.classList.remove('activo'));
          ch.classList.add('activo');
          fEstado = ch.dataset.f;
          render();
        };
      });
    }

    render();
    onRefreshView(render);
  },

  /* ---------- 3. Registro y Archivado de Pacientes ---------- */
  pacientes(onRefreshView) {
    // Llenar selectores
    const selGen = $('#sel-genero') || $('#form-paciente-genero');
    if (selGen) selGen.innerHTML = GENEROS.map((g) => `<option value="${g}">${g}</option>`).join('');

    const selSan = $('#sel-sangre') || $('#form-paciente-sangre');
    if (selSan) selSan.innerHTML = TIPOS_SANGRE.map((s) => `<option value="${s}">${s}</option>`).join('');

    const renderArchivar = () => {
      const cont = $('#lista-archivar');
      if (!cont) return;
      const activos = pacientes.filter((p) => p.activo);
      cont.innerHTML = activos.length
        ? activos
            .map(
              (p) => `
          <div class="archivar-item">
            <div>
              <strong>${p.nombre} ${p.apellidos}</strong>
              <div class="meta" style="font-size:0.75rem; color:#64748b;">CUI: ${p.cui || p.documentoIdentidad} · ${p.genero} · ${p.tipoSangre}</div>
            </div>
            <div class="archivar-accion" style="display:flex; gap:8px; align-items:center;">
              <select class="form-control" style="font-size:0.8rem; padding:6px 8px; width:auto;">
                ${MOTIVOS_BAJA.map((m) => `<option value="${m}">${m}</option>`).join('')}
              </select>
              <button class="btn btn-outline btn-small" data-archivar="${p.cui || p.documentoIdentidad}" style="color:#b91c1c; border-color:#fca5a5;">Archivar</button>
            </div>
          </div>
        `
            )
            .join('')
        : '<p class="vacio" style="font-size:0.85rem; color:#94a3b8; padding:12px 0;">No hay pacientes activos para archivar.</p>';

      const contTabla = $('#tabla-pacientes');
      if (contTabla) contTabla.innerHTML = tablaPacientes(pacientes);
    };

    const listaArchivar = $('#lista-archivar');
    if (listaArchivar) {
      listaArchivar.onclick = async (e) => {
        const b = e.target.closest('[data-archivar]');
        if (!b) return;
        const cui = b.dataset.archivar;
        const p = buscarPaciente(cui);
        if (!p) return;
        const motivo = b.previousElementSibling.value;
        if (!confirm(`¿Archivar el expediente de ${p.nombre} ${p.apellidos}?\nMotivo formal: ${motivo}`)) return;
        try { await archivarPacienteApi(cui, motivo); }
        catch (error) { return toast(error.message, 'error'); }
        toast('Expediente archivado con justificación formal');
        renderArchivar();
      };
    }

    const formPac = $('#form-paciente');
    if (formPac) {
      formPac.onsubmit = async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.target));
        const cui = String(d.cui || '').trim();
        if (!/^\d{13}$/.test(cui)) return toast('El CUI debe tener 13 dígitos numéricos.', 'error');
        if (buscarPaciente(cui)) return toast('Ya existe un paciente con ese CUI/Documento.', 'error');

        const nuevo = {
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
        };

        try { await crearPacienteApi(nuevo); }
        catch (error) { return toast(error.message, 'error'); }
        e.target.reset();
        toast('Paciente registrado en el Laboratorio');
        renderArchivar();
      };
    }

    renderArchivar();
    onRefreshView(renderArchivar);
  },

  /* ---------- 4. Órdenes y Resultados de Exámenes ---------- */
  examenes(onRefreshView) {
    let fEstado = 'todos';
    let q = '';

    const render = () => {
      const qN = norm(q);
      const filtrados = examenes.filter((x) => {
        if (fEstado !== 'todos' && x.estado !== fEstado) return false;
        if (!qN) return true;
        const p = buscarPaciente(x.pacienteCui);
        const nom = p ? norm(`${p.nombre} ${p.apellidos}`) : '';
        return (
          norm(x.id).includes(qN) ||
          norm(x.pacienteCui).includes(qN) ||
          nom.includes(qN) ||
          norm(x.medicoSolicitante || '').includes(qN) ||
          norm(x.tipo || x.tipoLaboratorio || '').includes(qN)
        );
      });

      const cont = $('#laboratorio-table-container') || $('#grid-ordenes');
      if (cont) cont.innerHTML = tablaExamenes(filtrados);
    };

    // Búsqueda
    const inputBuscar = $('#lab-buscar');
    if (inputBuscar) {
      inputBuscar.oninput = debounce((e) => {
        q = e.target.value;
        render();
      }, 250);
    }

    // Chips de estado
    const chipsCont = $('#lab-chips');
    if (chipsCont) {
      chipsCont.querySelectorAll('.chip').forEach((ch) => {
        ch.onclick = () => {
          chipsCont.querySelectorAll('.chip').forEach((c) => c.classList.remove('activo'));
          ch.classList.add('activo');
          fEstado = ch.dataset.f;
          render();
        };
      });
    }

    // Botón nueva orden
    const btnNueva = $('#btn-nueva-orden');
    if (btnNueva) {
      btnNueva.onclick = () => formOrden(render);
    }

    render();
    onRefreshView(render);
  },
};
