import { store } from './state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderKpiCards } from './components/kpiCards.js';
import { renderSearchBar } from './components/searchBar.js';
import { renderPatientTable } from './components/patientTable.js';
import { renderModalDrawer } from './components/modalDrawer.js';
import { renderInicioCriticos } from './components/inicioCriticos.js';
import { renderListaArchivar } from './components/listaArchivar.js';
import {
  inicializarVistaLaboratorio,
  renderLaboratorioTable,
  actualizarMetricasLaboratorio,
  poblarSelectsLaboratorio,
  renderUnidadesLaboratorio,
  renderCatalogoExamenes,
  renderPacientesAsociadosTable,
} from './components/laboratorioTable.js';
import { inicializarVistaPolizas, renderPolizasTable, actualizarMetricasPolizas, poblarSelectsPolizas } from './components/polizasComponent.js';
import { inicializarVistaDoctores, renderDoctoresTable, actualizarMetricasDoctores } from './components/doctoresComponent.js';
import { mostrarToast, mostrarAlertaPersonalizada } from './components/modalDialog.js';
import { fetchPlantillaHtml } from '../../shared/js/api/client.js';

let vistaActual = 'principal'; // 'principal' | 'buscador' | 'gestion' | 'laboratorio' | 'polizas' | 'doctores'
const plantillasCargadas = {};

// Mapeo del identificador de vista al nombre del archivo en /pages/
const MAPA_ARCHIVOS_VISTAS = {
  principal: 'principal',
  buscador: 'buscador',
  gestion: 'gestion-pacientes',
  laboratorio: 'laboratorio',
  polizas: 'polizas',
  doctores: 'doctores'
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
      inicializarVistaLaboratorio();
    } else if (nombreVista === 'polizas') {
      inicializarVistaPolizas();
    } else if (nombreVista === 'doctores') {
      inicializarVistaDoctores();
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

function poblarSelectDoctoresEnGestion() {
  const sel = document.getElementById('g-inp-medico');
  if (!sel) return;

  const valorActual = sel.value;
  const doctoresDisponibles = store.doctores && store.doctores.length > 0 ? store.doctores : [];

  if (doctoresDisponibles.length === 0) {
    sel.innerHTML = `<option value="">-- No hay doctores registrados en el sistema --</option>`;
    return;
  }

  sel.innerHTML = `
    <option value="">-- Seleccionar Médico Tratante Asignado * --</option>
    ${doctoresDisponibles.map(d => {
      const nombreCompleto = `Dr(a). ${d.nombre} ${d.apellidos}`;
      const isSelected = valorActual === nombreCompleto ? 'selected' : '';
      return `<option value="${nombreCompleto}" ${isSelected}>${nombreCompleto} · ${d.especialidad} (${d.idColegiado})</option>`;
    }).join('')}
  `;
}

function inicializarFormularioGestion() {
  const form = document.getElementById('form-gestion-nuevo-paciente');
  if (!form) return;

  poblarSelectDoctoresEnGestion();

  const curpInput = document.getElementById('g-inp-curp');
  if (curpInput) {
    curpInput.addEventListener('input', (e) => {
      // Filtrar a números enteros y restringir a 13 dígitos
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 13);
    });
  }

  const telInput = document.getElementById('g-inp-telefono');
  if (telInput) {
    telInput.addEventListener('input', (e) => {
      // Filtrar a números enteros y restringir a 8 dígitos
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombreVal = (document.getElementById('g-inp-nombre').value || '').trim();
    const apellidosVal = (document.getElementById('g-inp-apellidos').value || '').trim();
    const fechaVal = (document.getElementById('g-inp-fecha').value || '').trim();
    const generoVal = document.getElementById('g-inp-genero').value;
    const dpiVal = (document.getElementById('g-inp-curp').value || '').trim();
    const telVal = (document.getElementById('g-inp-telefono').value || '').trim();
    const correoVal = (document.getElementById('g-inp-correo').value || '').trim();
    const direccionVal = (document.getElementById('g-inp-direccion').value || '').trim();
    const servicioVal = (document.getElementById('g-inp-servicio').value || '').trim();
    const estadoVal = (document.getElementById('g-inp-estado').value || '').trim();
    const ubicacionVal = (document.getElementById('g-inp-ubicacion').value || '').trim();
    const sangreVal = (document.getElementById('g-inp-sangre').value || '').trim();
    const medicoVal = (document.getElementById('g-inp-medico').value || '').trim();

    // Verificación estricta: todos los campos son obligatorios salvo póliza y antecedentes
    if (!nombreVal || !apellidosVal || !fechaVal || !generoVal || !dpiVal || !telVal || !correoVal || !direccionVal || !servicioVal || !estadoVal || !ubicacionVal || !sangreVal || !medicoVal) {
      mostrarAlertaPersonalizada({
        titulo: 'Campos Obligatorios Incompletos',
        subtitulo: 'Admisión Hospitalaria',
        mensaje: 'Todos los campos del paciente son obligatorios (incluyendo médico asignado, dirección, correo y ubicación), a excepción de la póliza y los antecedentes/observaciones.',
        tipo: 'warning'
      });
      return;
    }

    if (!/^\d{13}$/.test(dpiVal)) {
      mostrarAlertaPersonalizada({
        titulo: 'DPI Inválido',
        subtitulo: 'Validación de Documento Único de Identidad (Guatemala)',
        mensaje: 'El DPI / CUI debe contener exactamente 13 dígitos numéricos enteros. Por favor verifique el número ingresado.',
        tipo: 'error'
      });
      return;
    }

    if (!/^\d{8}$/.test(telVal)) {
      mostrarAlertaPersonalizada({
        titulo: 'Teléfono Inválido',
        subtitulo: 'Validación de Contacto Telefónico',
        mensaje: 'El número de teléfono debe contener exactamente 8 dígitos numéricos enteros (ej. 77612345).',
        tipo: 'error'
      });
      return;
    }

    if (generoVal !== 'Femenino' && generoVal !== 'Masculino') {
      mostrarAlertaPersonalizada({
        titulo: 'Género Requerido',
        mensaje: 'Debe seleccionar un género biológico válido (Femenino o Masculino).',
        tipo: 'warning'
      });
      return;
    }

    const antecedentesVal = document.getElementById('g-inp-antecedentes').value;
    const antecedentesArr = antecedentesVal ? antecedentesVal.split(',').map(s => s.trim()).filter(Boolean) : [];
    const expNum = Math.floor(1000 + Math.random() * 9000);

    const aseguradoraVal = document.getElementById('g-inp-aseguradora').value;
    const polizaVal = document.getElementById('g-inp-poliza').value;

    const nuevo = {
      id: `pac-${Date.now()}`,
      expediente: `EXP-0${expNum}`,
      documentoIdentidad: dpiVal,
      nombre: nombreVal,
      apellidos: apellidosVal,
      fechaNacimiento: fechaVal,
      sexo: generoVal,
      genero: generoVal,
      curp: dpiVal,
      telefono: telVal,
      correo: correoVal,
      direccion: direccionVal,
      servicioArea: servicioVal,
      medicoTratante: medicoVal,
      ubicacion: ubicacionVal,
      ultimaConsulta: new Date().toISOString(),
      estadoClinico: estadoVal,
      estadoArchivo: "activo",
      detallesInstitucion: {
        institucionId: "I1",
        nombreInstitucion: "Hospital General",
        antecedentesCriticos: antecedentesArr,
        tipoSangre: sangreVal,
        seguro: aseguradoraVal ? {
          aseguradora: aseguradoraVal,
          poliza: polizaVal || 'S/N',
          cobertura: 80
        } : null,
        internamiento: {
          enCama: servicioVal === 'Hospitalización',
          pabellon: ubicacionVal
        }
      },
      historial: { consultas: [] }
    };

    const guardado = await store.agregarPaciente(nuevo);
    form.reset();
    poblarSelectDoctoresEnGestion();
    renderListaArchivar('lista-archivar-pacientes-container');

    mostrarToast({
      titulo: 'Expediente Guardado en MongoDB',
      mensaje: `Paciente ${guardado.nombre} ${guardado.apellidos} registrado exitosamente con expediente ${guardado.expediente} asignado a ${guardado.medicoTratante}.`,
      tipo: 'success'
    });
  });
}

// Navegación expuesta al objeto window
window.navegarA = (nombreVista) => {
  cargarVista(nombreVista);
};

document.addEventListener('DOMContentLoaded', () => {
  renderModalDrawer('drawer-container');
  cargarVista('principal');
  store.sincronizarConBackend();

  store.subscribe(() => {
    if (vistaActual === 'principal') {
      renderKpiCards('inicio-kpi-container');
      renderInicioCriticos('inicio-criticos-container');
    } else if (vistaActual === 'buscador') {
      renderPatientTable('table-container');
    } else if (vistaActual === 'gestion') {
      poblarSelectDoctoresEnGestion();
      renderListaArchivar('lista-archivar-pacientes-container');
    } else if (vistaActual === 'laboratorio') {
      actualizarMetricasLaboratorio();
      poblarSelectsLaboratorio();
      renderLaboratorioTable('laboratorio-table-container');
      renderUnidadesLaboratorio('unidades-laboratorio-cards-container');
      renderCatalogoExamenes('catalogo-examenes-table-container');
      renderPacientesAsociadosTable('laboratorio-pacientes-asociados-container');
    } else if (vistaActual === 'polizas') {
      actualizarMetricasPolizas();
      poblarSelectsPolizas();
      renderPolizasTable();
    } else if (vistaActual === 'doctores') {
      actualizarMetricasDoctores();
      renderDoctoresTable();
    }

    const kpis = store.getKPIs();
    const totalEl = document.getElementById('sidebar-total-badge');
    const labBadge = document.getElementById('sidebar-lab-badge');
    const polizasBadge = document.getElementById('sidebar-polizas-badge');
    const doctoresBadge = document.getElementById('sidebar-doctores-badge');
    if (totalEl) totalEl.textContent = kpis.total;
    if (labBadge) labBadge.textContent = kpis.labsPendientes > 0 ? kpis.labsPendientes : 'OK';
    if (polizasBadge) polizasBadge.textContent = kpis.totalPolizas || 0;
    if (doctoresBadge) doctoresBadge.textContent = kpis.totalDoctores || 0;
  });

  // Botones de acceso en header
  const topNavPrincipal = document.getElementById('topnav-btn-principal');
  if (topNavPrincipal) topNavPrincipal.addEventListener('click', () => cargarVista('principal'));

  const topNavBuscador = document.getElementById('topnav-btn-buscador');
  if (topNavBuscador) topNavBuscador.addEventListener('click', () => cargarVista('buscador'));

  const topNavNuevo = document.getElementById('topnav-btn-nuevo');
  if (topNavNuevo) topNavNuevo.addEventListener('click', () => cargarVista('gestion'));
});
