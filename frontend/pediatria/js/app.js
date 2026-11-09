import { store } from './state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderKpiCards, renderInicioObservacion } from './components/kpiCards.js';
import { renderSearchBar, renderPatientTable } from './components/patientTable.js';
import { renderCrecimientoVacunas, inicializarSelectorCrecimiento } from './components/crecimientoVacunas.js';
import { renderListaArchivar } from './components/listaArchivar.js';
import { renderModalDrawer } from './components/modalDrawer.js';
import { fetchPlantillaHtml, apiClient } from '../../shared/js/api/client.js';
import { exigirSesion, cerrarSesion } from '../../shared/js/api/auth.js';
import { mostrarErrorHttp, mostrarNotificacionExito } from '../../shared/js/components/mensajesError.js';
import {
  obtenerRolActivo,
  establecerRolDemo,
  obtenerConfiguracionRol,
  puedeAccederVista,
  puedeEjecutarAccion
} from '../../shared/js/components/navegacionRol.js';

const sesionActual = exigirSesion('pediatria');

let vistaActual = 'principal'; // 'principal' | 'buscador' | 'crecimiento' | 'gestion' | 'consulta-red'
const plantillasCargadas = {};

const MAPA_ARCHIVOS_VISTAS = {
  principal: 'principal',
  buscador: 'buscador',
  crecimiento: 'crecimiento-vacunas',
  gestion: 'gestion-pacientes',
  'consulta-red': 'consulta-red'
};

const MAPA_TITULOS_VISTAS = {
  principal: 'Panel Principal',
  buscador: 'Búsqueda y Menores',
  crecimiento: 'Crecimiento y Vacunación',
  gestion: 'Alta de Paciente y Archivado',
  'consulta-red': 'Consulta Federada en Red'
};

async function cargarVista(nombreVista) {
  if (!puedeAccederVista(nombreVista)) {
    const cfg = obtenerConfiguracionRol();
    mostrarErrorHttp({
      status: 403,
      error: {
        codigo: 'ACCESO_DENEGADO',
        mensaje: `El rol ${cfg.etiqueta} no tiene autorización para abrir la vista "${MAPA_TITULOS_VISTAS[nombreVista] || nombreVista}".`
      }
    });
    return;
  }

  vistaActual = nombreVista;
  const viewport = document.getElementById('main-viewport');
  if (!viewport) return;

  // Actualizar indicador de sección en topbar
  const seccionActualEl = document.getElementById('seccion-actual');
  if (seccionActualEl) {
    seccionActualEl.textContent = MAPA_TITULOS_VISTAS[nombreVista] || nombreVista;
  }

  // Actualizar sidebar con la vista activa
  renderSidebar('sidebar-container', vistaActual);

  try {
    const nombreArchivo = MAPA_ARCHIVOS_VISTAS[nombreVista] || nombreVista;

    if (!plantillasCargadas[nombreVista]) {
      plantillasCargadas[nombreVista] = await fetchPlantillaHtml(`./pages/${nombreArchivo}.html`);
    }

    viewport.innerHTML = plantillasCargadas[nombreVista];

    // Inicializar controladores específicos
    if (nombreVista === 'principal') {
      renderKpiCards('inicio-kpi-container');
      renderInicioObservacion('inicio-observacion-container');
    } else if (nombreVista === 'buscador') {
      renderSearchBar('search-container');
      renderPatientTable('table-container');

      const btnIrCrear = document.getElementById('btn-ir-crear-desde-buscador');
      if (btnIrCrear) {
        btnIrCrear.addEventListener('click', () => cargarVista('gestion'));
      }
    } else if (nombreVista === 'crecimiento') {
      inicializarSelectorCrecimiento();
      renderCrecimientoVacunas('crecimiento-vacunas-container');
    } else if (nombreVista === 'gestion') {
      inicializarFormularioGestion();
      renderListaArchivar('lista-archivar-pacientes-container');
    } else if (nombreVista === 'consulta-red') {
      inicializarConsultaRed();
      cargarEstadoPanelTecnico();
    }
  } catch (err) {
    console.error(err);
    viewport.innerHTML = `
      <div style="padding: 32px; color: var(--color-sunkissed); background-color: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
        <h3 style="font-size: 1.25rem; font-weight: 800; margin-bottom: 8px;">Error al cargar la vista pediátrica</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted);">${err.message}</p>
      </div>
    `;
  }
}

function inicializarFormularioGestion() {
  const form = document.getElementById('form-gestion-nuevo-paciente');
  if (!form) return;
  for (const id of ['g-inp-estado', 'g-inp-alergias']) {
    const campo = document.getElementById(id);
    if (campo) { campo.disabled = true; campo.title = 'No disponible mediante el contrato actual'; }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!puedeEjecutarAccion('crear_paciente')) {
      const cfg = obtenerConfiguracionRol();
      mostrarErrorHttp({
        status: 403,
        error: {
          codigo: 'ACCESO_DENEGADO',
          mensaje: `El rol ${cfg.etiqueta} no tiene permisos para dar de alta nuevos pacientes.`
        }
      });
      return;
    }

    const nombre = document.getElementById('g-inp-nombre').value.trim();
    const apellidos = document.getElementById('g-inp-apellidos').value.trim();
    const fecha = document.getElementById('g-inp-fecha').value;
    const genero = document.getElementById('g-inp-genero').value;
    const curp = document.getElementById('g-inp-curp').value.trim();
    const sangre = document.getElementById('g-inp-sangre').value;

    const tutorNombre = document.getElementById('g-inp-tutor-nombre').value.trim();
    const tutorParentesco = document.getElementById('g-inp-tutor-parentesco').value;
    const tutorDoc = document.getElementById('g-inp-tutor-doc').value.trim();
    const tutorTel = document.getElementById('g-inp-tutor-tel').value.trim();
    const direccion = document.getElementById('g-inp-direccion').value.trim();

    if (store.pacientes.some(p => p.documentoIdentidad === curp)) {
      mostrarErrorHttp({
        status: 409,
        error: {
          codigo: 'DOCUMENTO_DUPLICADO',
          mensaje: `Ya existe un paciente registrado con el documento ${curp} en el Centro Pediátrico.`
        }
      });
      return;
    }

    const nuevo = { nombre, apellidos, fechaNacimiento: fecha, genero, documentoIdentidad: curp,
      telefono: tutorTel, direccion, detallesInstitucion: { tipoSangre: sangre,
        tutorPrincipal: { nombre: tutorNombre, parentesco: tutorParentesco, documento: tutorDoc, telefono: tutorTel } } };
    try { await store.agregarPaciente(nuevo); }
    catch (error) { return mostrarErrorHttp(error); }
    form.reset();
    mostrarNotificacionExito(
      `Paciente ${nuevo.nombre} ${nuevo.apellidos} registrado`,
      `Expediente ${store.pacientes[0]?.expediente} vinculado a Tutor Principal: ${tutorNombre}.`
    );
    renderListaArchivar('lista-archivar-pacientes-container');
  });
}

function inicializarConsultaRed() {
  const btn = document.getElementById('btn-ejecutar-consulta-red');
  const input = document.getElementById('inp-buscar-red');
  const btnStatus = document.getElementById('btn-refrescar-system-status');
  if (btnStatus) {
    btnStatus.addEventListener('click', () => cargarEstadoPanelTecnico());
  }
  if (!btn || !input) return;
  const simulacion = document.getElementById('chk-simular-caida-red');
  if (simulacion) { simulacion.disabled = true; simulacion.title = 'Simulacion no disponible en el portal conectado'; }

  const ejecutarBusqueda = async () => {
    const doc = input.value.trim();
    if (!doc) {
      mostrarErrorHttp({
        status: 400,
        error: {
          codigo: 'VALIDACION_FALLIDA',
          mensaje: 'Ingresa un documento de identidad para consultar en las 4 instituciones de la red.'
        }
      });
      return;
    }

    let respuestaRed;
    try {
      const resp = await apiClient(`/red/pacientes?documento=${encodeURIComponent(doc)}`);
      const datos = await resp.json();
      if (!resp.ok) throw new Error(datos.error?.mensaje || 'Consulta de red no disponible');
      respuestaRed = datos;
    } catch (error) {
      renderizarResultadosRed(['hospital', 'odontologia', 'laboratorio', 'pediatria'].map(institucion => ({ institucion, estado: 'no_disponible' })));
      mostrarErrorHttp(error);
      return;
    }

    renderizarResultadosRed(respuestaRed.resultados);
  };

  btn.addEventListener('click', ejecutarBusqueda);
  ejecutarBusqueda();
}

function renderizarResultadosRed(resultados = []) {
  const mapaContenedores = {
    hospital: { id: 'red-res-i1', nombre: 'Hospital General', color: '#00595d' },
    odontologia: { id: 'red-res-i2', nombre: 'Clínica Odontológica', color: '#1e5a8a' },
    laboratorio: { id: 'red-res-i3', nombre: 'Laboratorio Clínico', color: '#5b4a9e' },
    pediatria: { id: 'red-res-i4', nombre: 'Centro Pediátrico', color: 'var(--color-pacific)' }
  };

  resultados.forEach(r => {
    const meta = mapaContenedores[r.institucion];
    if (!meta) return;
    const el = document.getElementById(meta.id);
    if (!el) return;

    if (r.estado === 'no_disponible') {
      el.innerHTML = `
        <div style="background-color:var(--color-bubblegum);border:1px solid #f8aba0;border-radius:var(--radius-sm);padding:10px;color:#7a1f22;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <strong>Estado: no_disponible</strong>
            <code style="font-size:0.7rem;">503 Aislado</code>
          </div>
          <p style="font-size:0.75rem;margin:0;">La institución no responde en este momento. Las demás instituciones siguen operativas.</p>
        </div>
      `;
      return;
    }

    if (!r.items || r.items.length === 0) {
      el.innerHTML = `
        <div style="color: var(--text-muted); padding: 6px 0;">
          <span class="badge badge-stable" style="margin-bottom:6px;display:inline-block;">estado: ok (0 coincidencias)</span>
          <p style="margin:0;font-size:0.78rem;">Sin expediente registrado para este documento en ${meta.nombre}.</p>
        </div>
      `;
      return;
    }

    const pac = r.items[0];
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;color:var(--text-dark);">
        <div>
          <strong style="color:${meta.color};font-size:0.86rem;">${pac.nombre} ${pac.apellidos}</strong>
          <span style="font-family:monospace;font-size:0.72rem;color:var(--text-muted);display:block;">${pac.expediente || pac.id} · Estado: ${pac.historial?.estado || 'activo'}</span>
        </div>
        <button type="button" class="btn btn-outline btn-sm btn-ver-historial-red" style="width:100%;justify-content:center;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>Abrir Historial (Solo lectura)</span>
        </button>
      </div>
    `;

    const btnVer = el.querySelector('.btn-ver-historial-red');
    if (btnVer) {
      btnVer.addEventListener('click', async () => {
        try {
          const resp = await apiClient(`/red/${r.institucion}/pacientes/${encodeURIComponent(pac.id)}/historial`);
          const datos = await resp.json();
          if (!resp.ok) throw new Error(datos.error?.mensaje || 'Historial no disponible');
          window.abrirDrawerSoloLectura?.({ ...datos.paciente, historial: { ...datos.historial, consultas: datos.consultas } }, meta.nombre);
        } catch (error) { mostrarErrorHttp(error); }
      });
    }
  });
}

async function cargarEstadoPanelTecnico() {
  const container = document.getElementById('panel-tecnico-status-container');
  if (!container) return;

  let statusData = null;
  try {
    const resp = await apiClient('/system/status');
    if (resp.ok) {
      statusData = await resp.json();
    }
  } catch {
    // Fallback demostrativo cuando el servidor backend no está levantado
  }

  const motorPediatria = statusData?.pediatria?.motor || 'MariaDB 11.4 (Docker Local)';
  const estadoPediatria = statusData?.pediatria?.estado || 'no_disponible';
  const fuente = statusData ? 'Respuesta en vivo de GET /system/status' : 'Estado no verificado: API no disponible';

  container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="pill-dot"></div>
          <strong style="color: var(--color-pacific); font-size: 0.95rem;">Motor asignado a I4: ${motorPediatria}</strong>
        </div>
        <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
          Fuente: <code>${fuente}</code> · Estado reportado: <code>${estadoPediatria}</code> · Puerto de dominio: <code>HistorialRepository</code>
        </p>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <span class="badge badge-stable">Contrato LSP</span>
        <span class="badge badge-stable">503 por institución</span>
      </div>
    </div>
  `;
}

// Navegación global
window.navegarA = (nombreVista) => {
  if (location.hash !== `#${nombreVista}`) {
    location.hash = `#${nombreVista}`;
  }
  cargarVista(nombreVista);
};

window.cerrarSesionApp = () => {
  cerrarSesion();
  location.replace('../index.html');
};

document.addEventListener('DOMContentLoaded', async () => {
  if (!sesionActual) return;
  try { await store.sincronizarConBackend(); } catch (error) { mostrarErrorHttp(error); }
  renderModalDrawer('drawer-container');

  // Inicializar selector de rol en Topbar
  const selectorRol = document.getElementById('selector-rol-demo');
  if (selectorRol) {
    selectorRol.disabled = true;
    selectorRol.title = 'El rol proviene de la sesión autenticada';
    selectorRol.value = obtenerRolActivo();
    selectorRol.addEventListener('change', (e) => {
      const nuevoRol = establecerRolDemo(e.target.value);
      const cfg = obtenerConfiguracionRol(nuevoRol);
      mostrarNotificacionExito('Rol actualizado', `Sesión activa como: ${cfg.etiqueta}`);
      if (!puedeAccederVista(vistaActual, nuevoRol)) {
        cargarVista('principal');
      } else {
        renderSidebar('sidebar-container', vistaActual);
      }
    });
  }

  const sincronizarVistaPorHash = () => {
    const [ruta] = (location.hash.slice(1) || 'principal').split('?');
    const [seccion] = ruta.split('/');
    if (['buscador', 'pacientes'].includes(seccion)) {
      cargarVista('buscador');
    } else if (['crecimiento', 'crecimiento-vacunas', 'vacunas'].includes(seccion)) {
      cargarVista('crecimiento');
    } else if (['gestion', 'registro'].includes(seccion)) {
      cargarVista('gestion');
    } else if (seccion === 'consulta-red') {
      cargarVista('consulta-red');
    } else {
      cargarVista('principal');
    }
  };

  window.addEventListener('hashchange', sincronizarVistaPorHash);

  if (location.hash && location.hash !== '#') {
    sincronizarVistaPorHash();
  } else {
    cargarVista('principal');
  }

  // Reactividad con el store
  store.subscribe(() => {
    if (vistaActual === 'principal') {
      renderKpiCards('inicio-kpi-container');
      renderInicioObservacion('inicio-observacion-container');
    } else if (vistaActual === 'buscador') {
      renderPatientTable('table-container');
    } else if (vistaActual === 'crecimiento') {
      renderCrecimientoVacunas('crecimiento-vacunas-container');
    } else if (vistaActual === 'gestion') {
      renderListaArchivar('lista-archivar-pacientes-container');
    }

    const kpis = store.getKPIs();
    const totalBadge = document.getElementById('sidebar-total-badge');
    if (totalBadge) totalBadge.textContent = kpis.totalPacientes;
  });

  // Botones de Topbar
  const topNavPrincipal = document.getElementById('topnav-btn-principal');
  if (topNavPrincipal) topNavPrincipal.addEventListener('click', () => { location.hash = '#principal'; cargarVista('principal'); });

  const topNavBuscador = document.getElementById('topnav-btn-buscador');
  if (topNavBuscador) topNavBuscador.addEventListener('click', () => { location.hash = '#buscador'; cargarVista('buscador'); });

  const topNavNuevo = document.getElementById('topnav-btn-nuevo');
  if (topNavNuevo) topNavNuevo.addEventListener('click', () => { location.hash = '#gestion'; cargarVista('gestion'); });
});
