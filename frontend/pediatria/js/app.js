import { store } from './state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderKpiCards, renderInicioObservacion } from './components/kpiCards.js';
import { renderSearchBar, renderPatientTable } from './components/patientTable.js';
import { renderCrecimientoVacunas, inicializarSelectorCrecimiento } from './components/crecimientoVacunas.js';
import { renderListaArchivar } from './components/listaArchivar.js';
import { renderModalDrawer } from './components/modalDrawer.js';
import { fetchPlantillaHtml } from '../../shared/js/api/client.js';
import { exigirSesion, obtenerSesion, cerrarSesion } from '../../shared/js/api/auth.js';

// Verificación de sesión: si estamos en localhost y no hay sesión, permitimos modo demo
const esLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const sesionActual = obtenerSesion();
if (!esLocal || sesionActual) {
  exigirSesion('pediatria');
}

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

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const nombre = document.getElementById('g-inp-nombre').value;
    const apellidos = document.getElementById('g-inp-apellidos').value;
    const fecha = document.getElementById('g-inp-fecha').value;
    const genero = document.getElementById('g-inp-genero').value;
    const curp = document.getElementById('g-inp-curp').value.trim();
    const sangre = document.getElementById('g-inp-sangre').value;
    const estadoClinico = document.getElementById('g-inp-estado').value;
    const alergiasTxt = document.getElementById('g-inp-alergias').value;

    const tutorNombre = document.getElementById('g-inp-tutor-nombre').value;
    const tutorParentesco = document.getElementById('g-inp-tutor-parentesco').value;
    const tutorDoc = document.getElementById('g-inp-tutor-doc').value;
    const tutorTel = document.getElementById('g-inp-tutor-tel').value;
    const direccion = document.getElementById('g-inp-direccion').value;

    const alergiasArr = alergiasTxt ? alergiasTxt.split(',').map(s => s.trim()).filter(Boolean).map(a => ({ alergeno: a, severidad: "media" })) : [];

    const nuevo = {
      id: `ped-${Date.now()}`,
      expediente: `PED-0${Math.floor(100 + Math.random() * 900)}`,
      nombre,
      apellidos,
      fechaNacimiento: fecha,
      genero,
      documentoIdentidad: curp,
      telefono: tutorTel,
      correo: `tutor.${curp}@correo.com`,
      direccion: direccion || "Dirección reportada por tutor",
      estadoClinico,
      estadoArchivo: "activo",
      detallesInstitucion: {
        institucionId: "I4",
        nombreInstitucion: "Centro Pediátrico",
        tipoSangre: sangre,
        tutorPrincipal: {
          nombre: tutorNombre,
          parentesco: tutorParentesco,
          documento: tutorDoc,
          telefono: tutorTel,
          correo: `tutor.${curp}@correo.com`
        },
        alergias: alergiasArr,
        controlesCrecimiento: [
          {
            id: `cc-${Date.now()}`,
            fecha: new Date().toISOString().split('T')[0],
            edadMeses: 24,
            pesoKg: 12.0,
            tallaCm: 86.0,
            perimetroCefalicoCm: 48.0,
            imc: 16.2,
            observaciones: "Control inicial de ingreso al Centro Pediátrico."
          }
        ],
        vacunasAplicadas: [
          { vacunaId: "VAC-01", nombreVacuna: "BCG (Tuberculosis)", dosis: 1, fechaAplicacion: fecha, lote: "L-INIC", responsable: "Enf. Rosa Elena" }
        ]
      },
      historial: {
        estado: "activo",
        consultas: []
      }
    };

    store.agregarPaciente(nuevo);
    form.reset();
    alert(`¡Paciente ${nuevo.nombre} ${nuevo.apellidos} registrado exitosamente con expediente ${nuevo.expediente} y Tutor Principal ${tutorNombre}!`);
    renderListaArchivar('lista-archivar-pacientes-container');
  });
}

function inicializarConsultaRed() {
  const btn = document.getElementById('btn-ejecutar-consulta-red');
  const input = document.getElementById('inp-buscar-red');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const doc = input.value.trim();
    if (!doc) {
      alert("Ingresa un documento para consultar en red.");
      return;
    }

    // Simulación de búsqueda federada en las 4 instituciones (sección 3.5 del plan)
    const resI1 = document.getElementById('red-res-i1');
    const resI2 = document.getElementById('red-res-i2');
    const resI3 = document.getElementById('red-res-i3');
    const resI4 = document.getElementById('red-res-i4');

    if (resI1) {
      resI1.innerHTML = `
        <div style="color: var(--text-dark);">
          <strong style="color: #00595d;">Doc: ${doc}</strong>
          <p style="margin-top: 4px;">Sin registro previo en Hospital General.</p>
        </div>
      `;
    }

    if (resI2) {
      resI2.innerHTML = `
        <div style="color: var(--text-dark);">
          <strong style="color: #1e5a8a;">Doc: ${doc}</strong>
          <p style="margin-top: 4px;">Historial odontológico no encontrado.</p>
        </div>
      `;
    }

    if (resI3) {
      resI3.innerHTML = `
        <div style="color: var(--text-dark);">
          <strong style="color: #5b4a9e;">Doc: ${doc}</strong>
          <p style="margin-top: 4px;">1 orden de laboratorio vinculada (Química Sanguínea).</p>
        </div>
      `;
    }

    if (resI4) {
      const match = store.pacientes.find(p => p.documentoIdentidad === doc);
      if (match) {
        resI4.innerHTML = `
          <div style="color: var(--text-dark);">
            <strong style="color: var(--color-pacific);">${match.nombre} ${match.apellidos} (${match.expediente})</strong>
            <p style="margin-top: 4px;">Expediente Pediátrico Activo. Tutor: ${match.detallesInstitucion?.tutorPrincipal?.nombre || 'N/R'}.</p>
          </div>
        `;
      } else {
        resI4.innerHTML = `
          <div style="color: var(--text-dark);">
            <strong style="color: var(--color-pacific);">Doc: ${doc}</strong>
            <p style="margin-top: 4px;">No registrado en base local de Pediatría.</p>
          </div>
        `;
      }
    }
  });
}

// Navegación global
window.navegarA = (nombreVista) => {
  cargarVista(nombreVista);
};

window.cerrarSesionApp = () => {
  cerrarSesion();
  location.replace('../index.html');
};

document.addEventListener('DOMContentLoaded', () => {
  renderModalDrawer('drawer-container');
  cargarVista('principal');

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
  if (topNavPrincipal) topNavPrincipal.addEventListener('click', () => cargarVista('principal'));

  const topNavBuscador = document.getElementById('topnav-btn-buscador');
  if (topNavBuscador) topNavBuscador.addEventListener('click', () => cargarVista('buscador'));

  const topNavNuevo = document.getElementById('topnav-btn-nuevo');
  if (topNavNuevo) topNavNuevo.addEventListener('click', () => cargarVista('gestion'));
});
