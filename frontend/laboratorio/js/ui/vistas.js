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
  crearPacienteApi,
  archivarPacienteApi,
} from '../datos.js';
import { tablaExamenes, tablaPacientes } from './tablas.js';
import { formOrden } from './formularios.js';

export const vistas = {
  principal(onRefreshView) {
    const render = () => {
      const n = (s) => examenes.filter((x) => x.estado === s).length;
      const kpis = [
        { label: 'Total Órdenes', valor: examenes.length, icon: '📋' },
        { label: 'Pendientes', valor: n('pendiente'), icon: '⏳' },
        { label: 'En Proceso', valor: n('en_proceso'), icon: '🔬' },
        { label: 'Completados', valor: n('completado'), icon: '✅' },
      ];

      const contKpis = $('#kpis');
      if (contKpis) {
        contKpis.innerHTML = kpis
          .map(
            (k) => `
            <div class="kpi-card">
              <span class="kpi-icon">${k.icon}</span>
              <div class="kpi-info">
                <span class="kpi-label">${k.label}</span>
                <span class="kpi-val">${k.valor}</span>
              </div>
            </div>`
          )
          .join('');
      }

      const ultimos = $('#ultimos-examenes');
      if (ultimos) {
        ultimos.innerHTML = tablaExamenes(examenes.slice(0, 5), { conPaciente: true, compacto: true });
      }
    };

    render();
    onRefreshView(render);
  },

  expedientes(onRefreshView) {
    let q = '';
    let fEstado = 'todos';
    let fTipo = 'todos';
    let pagina = 1;
    const porPagina = 8;

    const render = () => {
      const qN = norm(q);
      const filtrados = examenes.filter((x) => {
        if (fEstado !== 'todos' && x.estado !== fEstado) return false;
        if (fTipo !== 'todos' && x.tipo !== fTipo) return false;
        if (!qN) return true;
        const p = buscarPaciente(x.pacienteCui);
        const nom = p ? norm(`${p.nombre} ${p.apellidos}`) : '';
        return (
          norm(x.id).includes(qN) ||
          norm(x.pacienteCui).includes(qN) ||
          nom.includes(qN) ||
          norm(x.medicoSolicitante || '').includes(qN)
        );
      });

      const total = filtrados.length;
      const paginas = Math.ceil(total / porPagina) || 1;
      if (pagina > paginas) pagina = paginas;
      const slice = filtrados.slice((pagina - 1) * porPagina, pagina * porPagina);

      const cont = $('#tabla-expedientes');
      if (cont) cont.innerHTML = tablaExamenes(slice, { conPaciente: true, acciones: true });

      const pag = $('#paginacion-expedientes');
      if (pag) {
        pag.innerHTML = `
          <span>Mostrando ${slice.length} de ${total} registros (Página ${pagina} de ${paginas})</span>
          <div class="pag-btns">
            <button class="btn btn-outline" ${pagina <= 1 ? 'disabled' : ''} data-pag="${pagina - 1}">◀ Anterior</button>
            <button class="btn btn-outline" ${pagina >= paginas ? 'disabled' : ''} data-pag="${pagina + 1}">Siguiente ▶</button>
          </div>
        `;
        pag.onclick = (e) => {
          const b = e.target.closest('button[data-pag]');
          if (b && !b.disabled) {
            pagina = parseInt(b.dataset.pag, 10);
            render();
          }
        };
      }
    };

    const inputQ = $('#filtro-expedientes-q');
    if (inputQ) {
      inputQ.oninput = debounce((e) => {
        q = e.target.value;
        pagina = 1;
        render();
      }, 250);
    }

    const selEstado = $('#filtro-expedientes-estado');
    if (selEstado) {
      selEstado.onchange = (e) => {
        fEstado = e.target.value;
        pagina = 1;
        render();
      };
    }

    const selTipo = $('#filtro-expedientes-tipo');
    if (selTipo) {
      selTipo.onchange = (e) => {
        fTipo = e.target.value;
        pagina = 1;
        render();
      };
    }

    render();
    onRefreshView(render);
  },

  pacientes(onRefreshView) {
    const selGen = $('#form-paciente-genero');
    if (selGen) selGen.innerHTML = GENEROS.map((g) => `<option value="${g}">${g}</option>`).join('');

    const selSan = $('#form-paciente-sangre');
    if (selSan) selSan.innerHTML = TIPOS_SANGRE.map((s) => `<option value="${s}">${s}</option>`).join('');

    const renderArchivar = () => {
      const cont = $('#lista-archivar');
      if (!cont) return;
      const activos = pacientes.filter((p) => p.activo);
      cont.innerHTML = activos
        .map(
          (p) => `
          <div class="archivar-item">
            <div>
              <strong>${p.nombre} ${p.apellidos}</strong>
              <div class="meta">CUI: ${p.cui} · ${p.genero} · ${p.tipoSangre}</div>
            </div>
            <div class="archivar-accion">
              <select class="input input-sm">
                ${MOTIVOS_BAJA.map((m) => `<option value="${m}">${m}</option>`).join('')}
              </select>
              <button class="btn btn-danger btn-sm" data-archivar="${p.cui}">Archivar</button>
            </div>
          </div>
        `
        )
        .join('');

      const contTabla = $('#tabla-pacientes');
      if (contTabla) contTabla.innerHTML = tablaPacientes(pacientes);
    };

    const listaArchivar = $('#lista-archivar');
    if (listaArchivar) {
      listaArchivar.onclick = async (e) => {
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
        archivarPacienteApi(p.cui, motivo);
        toast('Expediente archivado con justificación');
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

        pacientes.push(nuevo);
        guardarEstado();
        crearPacienteApi(nuevo);
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

    const render = () => {
      const filtrados = filtro === 'todos' ? examenes : examenes.filter((x) => x.tipo === filtro);
      const cont = $('#grid-ordenes');
      if (cont) cont.innerHTML = tablaExamenes(filtrados, { conPaciente: true, acciones: true });
    };

    const btnNueva = $('#btn-nueva-orden');
    if (btnNueva) {
      btnNueva.onclick = () => formOrden(render);
    }

    const tabs = document.querySelectorAll('.tipo-tab');
    tabs.forEach((t) => {
      t.onclick = () => {
        tabs.forEach((x) => x.classList.remove('active'));
        t.classList.add('active');
        filtro = t.dataset.tipo;
        render();
      };
    });

    render();
    onRefreshView(render);
  },
};
