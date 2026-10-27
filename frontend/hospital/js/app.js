import { store } from './state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderKpiCards } from './components/kpiCards.js';
import { renderSearchBar } from './components/searchBar.js';
import { renderPatientTable } from './components/patientTable.js';
import { renderModalDrawer } from './components/modalDrawer.js';
import { renderInicioCriticos } from './components/inicioCriticos.js';
import { renderListaArchivar } from './components/listaArchivar.js';
import { renderLaboratorioTable } from './components/laboratorioTable.js';
import { fetchPlantillaHtml } from '../../shared/js/api/client.js';

let vistaActual = 'principal'; // 'principal' | 'buscador' | 'gestion' | 'laboratorio'
const plantillasCargadas = {};

// Mapeo del identificador de vista al nombre del archivo en /pages/
const MAPA_ARCHIVOS_VISTAS = {
  principal: 'principal',
  buscador: 'buscador',
  gestion: 'gestion-pacientes',
  laboratorio: 'laboratorio'
};

async function cargarVista(nombreVista) {
  vistaActual = nombreVista;
  const viewport = document.getElementById('main-viewport');
  if (!viewport) return;

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
      renderInicioCriticos('inicio-criticos-container');
    } else if (nombreVista === 'buscador') {
      renderSearchBar('search-container');
      renderPatientTable('table-container');
    } else if (nombreVista === 'gestion') {
      inicializarFormularioGestion();
      renderListaArchivar('lista-archivar-pacientes-container');
    } else if (nombreVista === 'laboratorio') {
      renderLaboratorioTable('laboratorio-table-container');
      inicializarBuscadorLaboratorio();
    }
  } catch (err) {
    console.error(err);
    viewport.innerHTML = `
      <div style="padding: 32px; color: #dc2626;">
        <h3 style="font-size: 1.3rem; margin-bottom: 8px;">Error al cargar la página</h3>
        <p style="font-size: 0.95rem;">${err.message}</p>
      </div>
    `;
  }
}

function inicializarBuscadorLaboratorio() {
  const input = document.getElementById('lab-search-input');
  if (input) {
    input.addEventListener('input', (e) => {
      store.setFiltroLabTexto(e.target.value);
      renderLaboratorioTable('laboratorio-table-container');
    });
  }

  const btnNuevaOrden = document.getElementById('btn-nueva-orden-lab');
  if (btnNuevaOrden) {
    btnNuevaOrden.addEventListener('click', () => {
      const paciente = store.pacientes.find(p => p.estadoArchivo === 'activo');
      if (!paciente) {
        alert("No hay pacientes activos disponibles.");
        return;
      }

      const tipo = prompt("Tipo de análisis clínico (ej. Hematología Completa, Química Sanguínea, Examen General de Orina):", "Química Sanguínea (Glucosa)");
      if (!tipo) return;

      const nuevaOrden = {
        id: `lab-${Date.now()}`,
        codigoOrden: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        pacienteId: paciente.id,
        expediente: paciente.expediente,
        pacienteNombre: `${paciente.nombre} ${paciente.apellidos}`,
        tipoExamen: tipo,
        fechaOrden: new Date().toISOString(),
        fechaResultado: null,
        solicitante: "Dr. Rodrigo Palma",
        estado: "En proceso",
        resultadoResumen: "Muestra recolectada y enviada a centrífuga",
        valores: [],
        observacionesTecnicas: "Toma de muestra realizada en ayuno."
      };

      store.agregarOrdenLaboratorio(nuevaOrden);
      alert(`Orden ${nuevaOrden.codigoOrden} generada para ${nuevaOrden.pacienteNombre}.`);
      renderLaboratorioTable('laboratorio-table-container');
    });
  }
}

function inicializarFormularioGestion() {
  const form = document.getElementById('form-gestion-nuevo-paciente');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const antecedentesVal = document.getElementById('g-inp-antecedentes').value;
    const antecedentesArr = antecedentesVal ? antecedentesVal.split(',').map(s => s.trim()).filter(Boolean) : [];
    const expNum = Math.floor(1000 + Math.random() * 9000);

    const aseguradoraVal = document.getElementById('g-inp-aseguradora').value;
    const polizaVal = document.getElementById('g-inp-poliza').value;

    const nuevo = {
      id: `pac-${Date.now()}`,
      expediente: `EXP-0${expNum}`,
      nombre: document.getElementById('g-inp-nombre').value,
      apellidos: document.getElementById('g-inp-apellidos').value,
      fechaNacimiento: document.getElementById('g-inp-fecha').value,
      genero: document.getElementById('g-inp-genero').value,
      curp: document.getElementById('g-inp-curp').value.toUpperCase(),
      telefono: document.getElementById('g-inp-telefono').value,
      correo: document.getElementById('g-inp-correo').value || 'sin-correo@hospital.com',
      direccion: document.getElementById('g-inp-direccion').value || 'Dirección no registrada',
      servicioArea: document.getElementById('g-inp-servicio').value,
      medicoTratante: "Dr. Rodrigo Palma",
      ubicacion: document.getElementById('g-inp-ubicacion').value || "Pendiente de asignación",
      ultimaConsulta: new Date().toISOString(),
      estadoClinico: document.getElementById('g-inp-estado').value,
      estadoArchivo: "activo",
      detallesInstitucion: {
        institucionId: "I1",
        nombreInstitucion: "Hospital General",
        antecedentesCriticos: antecedentesArr,
        tipoSangre: document.getElementById('g-inp-sangre').value,
        seguro: aseguradoraVal ? {
          aseguradora: aseguradoraVal,
          poliza: polizaVal || 'S/N',
          cobertura: 80
        } : null,
        internamiento: {
          enCama: document.getElementById('g-inp-servicio').value === 'Hospitalización',
          pabellon: document.getElementById('g-inp-ubicacion').value
        }
      },
      historial: { consultas: [] }
    };

    store.agregarPaciente(nuevo);
    form.reset();
    alert(`¡Paciente ${nuevo.nombre} ${nuevo.apellidos} registrado exitosamente con expediente ${nuevo.expediente}!`);
    renderListaArchivar('lista-archivar-pacientes-container');
  });
}

// Navegación expuesta al objeto window
window.navegarA = (nombreVista) => {
  cargarVista(nombreVista);
};

document.addEventListener('DOMContentLoaded', () => {
  renderModalDrawer('drawer-container');
  cargarVista('principal');

  store.subscribe(() => {
    if (vistaActual === 'principal') {
      renderKpiCards('inicio-kpi-container');
      renderInicioCriticos('inicio-criticos-container');
    } else if (vistaActual === 'buscador') {
      renderPatientTable('table-container');
    } else if (vistaActual === 'gestion') {
      renderListaArchivar('lista-archivar-pacientes-container');
    } else if (vistaActual === 'laboratorio') {
      renderLaboratorioTable('laboratorio-table-container');
    }

    const kpis = store.getKPIs();
    const totalEl = document.getElementById('sidebar-total-badge');
    const labBadge = document.getElementById('sidebar-lab-badge');
    if (totalEl) totalEl.textContent = kpis.total;
    if (labBadge) labBadge.textContent = kpis.labsPendientes > 0 ? kpis.labsPendientes : 'OK';
  });

  // Botones de acceso en header
  const topNavPrincipal = document.getElementById('topnav-btn-principal');
  if (topNavPrincipal) topNavPrincipal.addEventListener('click', () => cargarVista('principal'));

  const topNavBuscador = document.getElementById('topnav-btn-buscador');
  if (topNavBuscador) topNavBuscador.addEventListener('click', () => cargarVista('buscador'));

  const topNavNuevo = document.getElementById('topnav-btn-nuevo');
  if (topNavNuevo) topNavNuevo.addEventListener('click', () => cargarVista('gestion'));
});
