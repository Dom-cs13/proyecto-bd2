import { store } from './state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderKpiCards } from './components/kpiCards.js';
import { renderSearchBar } from './components/searchBar.js';
import { renderPatientTable } from './components/patientTable.js';
import { renderModalDrawer } from './components/modalDrawer.js';
import { renderInicioCriticos } from './components/inicioCriticos.js';
import { renderListaArchivar } from './components/listaArchivar.js';
import { renderLaboratorioTable } from './components/laboratorioTable.js';
import { inicializarVistaPolizas, renderPolizasTable, actualizarMetricasPolizas, poblarSelectsPolizas } from './components/polizasComponent.js';
import { inicializarVistaDoctores, renderDoctoresTable, actualizarMetricasDoctores } from './components/doctoresComponent.js';
import { mostrarToast, mostrarAlertaPersonalizada, mostrarModalNuevaOrdenLab } from './components/modalDialog.js';
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
      renderLaboratorioTable('laboratorio-table-container');
      inicializarBuscadorLaboratorio();
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
      const pacientesActivos = store.pacientes.filter(p => p.estadoArchivo === 'activo');
      if (pacientesActivos.length === 0) {
        mostrarAlertaPersonalizada({
          titulo: 'Sin Pacientes Activos',
          mensaje: 'No hay pacientes activos disponibles para emitir órdenes de laboratorio.',
          tipo: 'warning'
        });
        return;
      }

      mostrarModalNuevaOrdenLab(pacientesActivos, ({ pacienteId, tipo, solicitante, observaciones }) => {
        const paciente = store.pacientes.find(p => p.id === pacienteId);
        if (!paciente) return;

        const nuevaOrden = {
          id: `lab-${Date.now()}`,
          codigoOrden: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
          pacienteId: paciente.id,
          expediente: paciente.expediente,
          pacienteNombre: `${paciente.nombre} ${paciente.apellidos}`,
          tipoExamen: tipo,
          fechaOrden: new Date().toISOString(),
          fechaResultado: null,
          solicitante: solicitante || "Dr. Rodrigo Palma",
          estado: "En proceso",
          resultadoResumen: "Muestra recolectada y enviada a centrífuga",
          valores: [],
          observacionesTecnicas: observaciones || "Toma de muestra realizada en ayuno."
        };

        store.agregarOrdenLaboratorio(nuevaOrden);
        renderLaboratorioTable('laboratorio-table-container');

        mostrarToast({
          titulo: 'Orden de Laboratorio Emitida',
          mensaje: `Se generó la orden ${nuevaOrden.codigoOrden} para el paciente ${nuevaOrden.pacienteNombre}.`,
          tipo: 'success'
        });
      });
    });
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
      renderLaboratorioTable('laboratorio-table-container');
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
