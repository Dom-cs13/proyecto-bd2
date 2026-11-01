import { exigirSesion, obtenerSesion } from '../../shared/js/api/auth.js';

// Único interruptor de la maqueta: solo localhost y sin una sesión existente.
// La entrada local sin parámetros abre secretaría; preview permite cambiar la vista.
// Retirar este bloque al integrar los roles oficiales del backend.
const esLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const vistaSolicitada = new URLSearchParams(location.search).get('preview') ?? 'secretaria';
const esDemo = esLocal && ['secretaria', 'odontologo'].includes(vistaSolicitada) && !obtenerSesion();
const sesion = esDemo ? null : exigirSesion('odontologia');
let rol = esDemo ? vistaSolicitada : sesion?.rol;

const trazos = {
  diente: '<path d="M12 5C8 1 3 4 4 10c.5 3 2 4 2.5 8 .5 4 3 4 3.5 0 .5-3 3.5-3 4 0 .5 4 3 4 3.5 0 .5-4 2-5 2.5-8 1-6-4-9-8-5Z"/>',
  inicio: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  persona: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  pacientes: '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/>',
  historial: '<path d="M7 3h10l3 3v15H4V3h3m1 7h8m-8 4h8m-8 4h5"/>',
  receta: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h6m-6 4h6m-6 4h3m3 0v4m-2-2h4"/>',
  consulta: '<path d="M6 3v5a6 6 0 0 0 12 0V3M4 3h4m8 0h4m-8 11v2a5 5 0 0 0 10 0v-3"/><circle cx="20" cy="11" r="2"/>',
  gestion: '<path d="M3 7h7l2-3h9v16H3V7Z"/><path d="M8 12h8m-8 4h5"/>',
  buscar: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  flecha: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  diagnostico: '<circle cx="12" cy="12" r="9"/><path d="M8 12h8m-4-4v8"/>',
  tratamiento: '<path d="m8 4 12 12a3 3 0 0 1-4 4L4 8a3 3 0 0 1 4-4Zm0 8 4-4"/>',
};
const icono = (nombre) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${trazos[nombre] || trazos.historial}</svg>`;
const secciones = {
  inicio: ['Inicio', 'inicio', ''],
  pacientes: ['Pacientes', 'pacientes', 'Búsqueda, listado y datos personales del paciente.'],
  registro: ['Registrar paciente', 'mas', 'Registro de datos personales, contacto y responsables legales cuando corresponda.'],
  citas: ['Agenda y citas', 'calendario', 'Vista de agenda y citas. La gestión de citas se incorporará en una etapa posterior.'],
  administracion: ['Gestión administrativa', 'gestion', 'Consulta del estado de atención y datos administrativos del paciente.'],
  historial: ['Historial clínico', 'historial', 'Consulta del expediente y antecedentes, incluidas alergias registradas.'],
  consultas: ['Consultas clínicas', 'consulta', 'Registro de la atención clínica del paciente.'],
  diagnosticos: ['Diagnósticos', 'diagnostico', 'Registro de diagnósticos asociados a una consulta clínica.'],
  procedimientos: ['Procedimientos', 'diente', 'Documentación de servicios odontológicos, piezas dentales y superficies.'],
  tratamientos: ['Tratamientos', 'tratamiento', 'Registro de tratamientos asociados a un diagnóstico.'],
  recetas: ['Recetas emitidas', 'receta', 'Consulta de recetas ya emitidas para su entrega. Esta vista no permite prescribir.'],
  prescribir: ['Recetas y medicamentos', 'receta', 'Emisión de recetas con sus medicamentos durante la atención clínica.'],
  ficha: ['Ficha administrativa', 'persona', 'Datos personales y contacto del paciente.'],
  responsables: ['Responsables legales', 'pacientes', 'Vínculo con padres o responsables legales cuando corresponda.'],
  'nueva-cita': ['Nueva cita', 'calendario', 'Registro de una cita para el paciente.'],
  cita: ['Detalle de cita', 'calendario', 'Hora, motivo y estado de la cita.'],
  reprogramar: ['Reprogramar cita', 'calendario', 'Selección de una nueva fecha y hora.'],
  expediente: ['Expediente clínico', 'historial', 'Antecedentes e información para la atención.'],
  antecedentes: ['Antecedentes y alergias', 'historial', 'Información relevante antes de iniciar una consulta.'],
  finalizar: ['Cierre de atención', 'consulta', 'Información autorizada para administración al finalizar la consulta.'],
  entrega: ['Entrega de receta', 'receta', 'Consulta de una receta ya emitida.'],
};
const opciones = {
  secretaria: ['inicio', 'pacientes', 'citas', 'administracion', 'recetas'],
  odontologo: ['inicio', 'pacientes', 'citas', 'historial', 'consultas', 'diagnosticos', 'procedimientos', 'tratamientos', 'prescribir'],
};
const contenido = document.getElementById('contenido');
const acceso = (destino, titulo, texto, simbolo) => `<a class="quick-card" href="#${destino}"><span class="icon-box">${icono(simbolo)}</span><span><strong>${titulo}</strong><small>${texto}</small></span><span class="arrow">${icono('flecha')}</span></a>`;
const boton = (destino, texto, simbolo, principal = false, pendiente = false) => `<a class="button${principal ? ' primary' : ''}" href="#${destino}">${icono(simbolo)}<span>${texto}${pendiente ? '<small class="action-state">Próximamente</small>' : ''}</span></a>`;

// Escenarios editoriales para revisar recorridos. No hay búsqueda real ni cambios de estado.
const ejemplos = [
  { id: 'OD-001', nombre: 'Paciente de ejemplo 01', hora: '09:00', motivo: 'Valoración odontológica', cita: 'Confirmada', tono: 'blue', atencion: 'En espera' },
  { id: 'OD-002', nombre: 'Paciente de ejemplo 02', hora: '09:45', motivo: 'Seguimiento de tratamiento', cita: 'Pendiente', tono: 'amber', atencion: 'Por confirmar' },
  { id: 'OD-003', nombre: 'Paciente de ejemplo 03', hora: '10:30', motivo: 'Consulta de revisión', cita: 'Cancelada', tono: 'cancelled', atencion: 'Sin atención programada' },
];
const estado = (paciente) => `<span class="label ${paciente.tono}">${paciente.cita}</span>`;
const notaEjemplo = '<p class="table-note">Escenario ficticio de demostración. Las acciones de registro y actualización están en desarrollo.</p>';

function cabeceraZona(numero, titulo, texto) {
  return `<div class="zone-heading"><span class="zone-number">${numero}</span><div><h2>${titulo}</h2><p>${texto}</p></div></div>`;
}

// Contenido editorial estático de maqueta; no representa pacientes ni citas reales.
function agenda() {
  const clinica = rol === 'odontologo';
  const pacientes = clinica ? ejemplos.filter(p => p.cita !== 'Cancelada') : ejemplos;
  return `<section class="panel"><div class="section-heading"><div><h2>${clinica ? 'Agenda de pacientes' : 'Próximas citas'}</h2><p>${clinica ? 'Accede al expediente de tu siguiente paciente.' : 'Consulta las citas antes de realizar cambios.'}</p></div><span class="label">Día de ejemplo</span></div><div class="agenda agenda-wide">
    ${pacientes.map(p => `<article class="appointment"><span class="time">${p.hora}</span><div class="appointment-info"><strong>${p.nombre}</strong><p>${p.id} · ${p.motivo}</p><div class="appointment-status">${estado(p)}${clinica ? `<span class="attendance">Atención: ${p.atencion}</span>` : ''}</div></div><div class="row-actions">${clinica
      ? boton(`expediente/${p.id}`, 'Abrir expediente', 'historial', p.id === 'OD-001')
      : boton(`cita/${p.id}`, 'Consultar', 'calendario') + (p.cita !== 'Cancelada' ? boton(`reprogramar/${p.id}`, 'Reprogramar', 'calendario', false, true) : '<span class="cancel-note">Sin cita activa</span>')
    }</div></article>`).join('')}</div>${notaEjemplo}</section>`;
}

function tabla(esClinica) {
  return `<section class="panel"><div class="section-heading"><div><h2>${esClinica ? 'Pacientes asignados' : 'Pacientes recientes'}</h2><p>Abre una ficha de ejemplo para revisar el recorrido.</p></div><span class="label">Ejemplo</span></div><div class="patient-list">${ejemplos.map(p => `<article class="patient-row"><span class="avatar">${icono('persona')}</span><div><strong>${p.nombre}</strong><small>${p.id} · Datos ficticios</small></div><a class="text-link" href="#${esClinica ? 'expediente' : 'ficha'}/${p.id}">${esClinica ? 'Abrir expediente' : 'Abrir ficha'} ${icono('flecha')}</a></article>`).join('')}</div></section>`;
}

function inicio() {
  const clinica = rol === 'odontologo';
  const heading = `<div class="page-heading"><div><span class="eyebrow">${clinica ? 'ATENCIÓN CLÍNICA' : 'ADMINISTRACIÓN ODONTOLÓGICA'}</span><h1>${clinica ? 'Tu siguiente paciente, a un paso' : 'Una recepción más ágil'}</h1><p>${clinica ? 'Revisa la agenda y abre el expediente para preparar la atención.' : 'Encuentra al paciente, organiza su cita y acompaña su visita.'}</p></div><span class="label blue">Recorridos de demostración</span></div>`;
  if (clinica) return `${heading}
    <section class="dashboard-zone" aria-label="Pacientes por atender">${cabeceraZona('01', 'Pacientes por atender', 'Agenda del día · escenarios ficticios')}${agenda()}</section>
    <section class="dashboard-zone" aria-label="Trabajo clínico">${cabeceraZona('02', 'Trabajo clínico', 'Accesos al expediente de ejemplo OD-001')}
    <div class="clinical-context"><span>${icono('persona')} Paciente de ejemplo 01 · OD-001</span><a href="#pacientes">Cambiar paciente de ejemplo</a></div>
    <div class="quick-grid clinical-grid">${acceso('expediente/OD-001', 'Historial clínico', 'Consultas y expediente', 'historial')}${acceso('antecedentes/OD-001', 'Antecedentes y alergias', 'Información antes de atender', 'historial')}${acceso('diagnosticos/OD-001', 'Diagnósticos', 'Próximamente', 'diagnostico')}${acceso('procedimientos/OD-001', 'Procedimientos dentales', 'Piezas y superficies · Próximamente', 'diente')}${acceso('tratamientos/OD-001', 'Tratamientos', 'Próximamente', 'tratamiento')}${acceso('prescribir/OD-001', 'Recetas y medicamentos', 'Próximamente', 'receta')}</div></section>
    <section class="dashboard-zone" aria-label="Seguimiento">${cabeceraZona('03', 'Seguimiento', 'Se completará al integrar el flujo de consulta.')}
    <div class="followup-grid">${[['Consultas en borrador', 'Esta maqueta no contiene borradores guardados.'], ['Pacientes atendidos', 'Todavía no hay atenciones finalizadas en esta maqueta.'], ['Seguimientos pendientes', 'Se mostrarán cuando exista información de seguimiento.']].map(([titulo, texto]) => `<article class="panel empty-card"><h3>${titulo}</h3><p>${texto}</p><span class="label">Sin datos en esta etapa</span></article>`).join('')}</div></section>`;
  return `${heading}<section class="dashboard-zone" aria-label="Atención rápida">${cabeceraZona('01', 'Atención rápida', 'El punto de partida para recibir al paciente.')}
    <div class="panel reception-tools"><div class="search-preview"><label for="buscar-paciente">Buscar paciente <span class="label">Próximamente</span></label><div class="search-field">${icono('buscar')}<input id="buscar-paciente" type="search" placeholder="Nombre, documento o expediente" disabled aria-describedby="ayuda-busqueda"></div><p id="ayuda-busqueda">Búsqueda en desarrollo. Puedes abrir las fichas de ejemplo.</p><a class="text-link" href="#pacientes">Ver pacientes de ejemplo ${icono('flecha')}</a></div><div class="reception-actions">${boton('registro', 'Nuevo paciente', 'mas', true, true)}${boton('nueva-cita/OD-001', 'Nueva cita', 'calendario', false, true)}<a class="text-link" href="#ficha/OD-001">Ver ficha administrativa de ejemplo ${icono('flecha')}</a></div></div></section>
    <section class="dashboard-zone" aria-label="Agenda del día">${cabeceraZona('02', 'Agenda del día', 'Hora, paciente, motivo y estado de cada cita.')}${agenda()}</section>
    <section class="dashboard-zone" aria-label="Gestión administrativa">${cabeceraZona('03', 'Gestión administrativa', 'Datos de pacientes y tareas posteriores a la atención.')}<div class="content-grid"><div>${tabla(false)}</div><div class="admin-shortcuts">${acceso('responsables/OD-003', 'Responsables legales', 'Padres y contactos autorizados', 'pacientes')}${acceso('recetas', 'Recetas pendientes de entrega', 'Ejemplo de receta emitida', 'receta')}${acceso('administracion', 'Estado de atención', 'Consulta administrativa · Próximamente', 'gestion')}</div></div></section>`;
}

function recorrido(seccion, paciente) {
  const clinica = rol === 'odontologo';
  const contexto = `<div class="patient-context"><span class="avatar">${icono('persona')}</span><div><strong>${paciente.nombre}</strong><small>${paciente.id} · Escenario ficticio de demostración</small></div></div>`;
  const encabezado = `<div class="page-heading"><div><span class="eyebrow">CLÍNICA ODONTOLÓGICA</span><h1>${secciones[seccion][0]}</h1><p>Vista de recorrido · sin registro ni actualización de datos</p></div>${boton('inicio', 'Volver al inicio', 'inicio')}</div>`;
  const pasos = (items) => `<ol class="flow-steps">${items.map(item => `<li>${item}</li>`).join('')}</ol>`;
  const descripcion = `<p class="preview-description">${secciones[seccion][2]}</p>`;
  let detalle;
  if (seccion === 'pacientes') {
    detalle = `${tabla(clinica)}<p class="preview-description">Listado fijo de demostración. La búsqueda real está en desarrollo.</p>`;
  } else if (['ficha', 'responsables'].includes(seccion)) {
    detalle = `<section class="panel route-panel">${contexto}<h2>${seccion === 'responsables' ? 'Padres o responsables legales' : 'Información administrativa'}</h2><dl class="detail-grid"><div><dt>Datos personales</dt><dd>${paciente.nombre} · Ejemplo ficticio</dd></div><div><dt>Contacto</dt><dd>Teléfono y dirección pendientes de integración</dd></div><div><dt>Responsable legal</dt><dd>${paciente.id === 'OD-003' ? 'Escenario de menor con responsable por completar' : 'Se mostrará cuando corresponda'}</dd></div><div><dt>Estado de atención</dt><dd>${paciente.atencion} · Ejemplo</dd></div></dl><div class="route-actions">${boton(`nueva-cita/${paciente.id}`, 'Agendar cita', 'calendario', true, true)}${boton('recetas', 'Consultar recetas emitidas', 'receta')}</div></section>`;
  } else if (seccion === 'citas') {
    detalle = agenda();
  } else if (['cita', 'nueva-cita', 'reprogramar', 'registro'].includes(seccion)) {
    detalle = `<section class="panel route-panel">${pasos(seccion === 'registro' || seccion === 'nueva-cita' ? ['Datos del paciente', 'Registro · Próximamente', 'Agendar cita · Próximamente'] : ['Consultar cita', 'Reprogramar · Próximamente'])}${contexto}${descripcion}<dl class="detail-grid"><div><dt>Hora de ejemplo</dt><dd>${paciente.hora}</dd></div><div><dt>Motivo</dt><dd>${paciente.motivo}</dd></div><div><dt>Estado de cita</dt><dd>${estado(paciente)}</dd></div><div><dt>Edición</dt><dd>En desarrollo · no se guarda ningún cambio</dd></div></dl><div class="route-actions">${seccion === 'registro' ? boton(`nueva-cita/${paciente.id}`, 'Ver paso de cita de ejemplo', 'flecha') : seccion === 'cita' && paciente.cita !== 'Cancelada' ? boton(`reprogramar/${paciente.id}`, 'Reprogramar', 'calendario', true, true) : '<span class="label">Formulario próximamente</span>'}${boton('citas', 'Ver agenda de ejemplo', 'calendario')}</div></section>`;
  } else if (['expediente', 'historial', 'antecedentes'].includes(seccion)) {
    detalle = `<section class="panel route-panel">${contexto}<div class="context-alert"><strong>Antecedentes y alergias</strong><p>Información ficticia: antecedente de alergia a un medicamento pendiente de revisión clínica. Este ejemplo no sirve para tomar decisiones de atención.</p></div><div class="route-block"><h2>Historial clínico</h2><p>Las consultas anteriores y sus detalles se integrarán con el componente compartido.</p></div><div class="route-block"><h2>Datos administrativos necesarios</h2><p>Nombre e identificador visibles arriba. Contacto y responsable legal se consultarán desde la ficha común, sin duplicar formularios.</p></div><div class="route-actions">${boton(`consultas/${paciente.id}`, 'Iniciar consulta', 'consulta', true, true)}${boton(`antecedentes/${paciente.id}`, 'Revisar antecedentes', 'historial')}</div><div class="clinical-links">${['diagnosticos', 'procedimientos', 'tratamientos', 'prescribir'].map(id => `<a href="#${id}/${paciente.id}">${icono(secciones[id][1])}<span>${secciones[id][0]}<small class="action-state">Próximamente</small></span></a>`).join('')}</div></section>`;
  } else if (['consultas', 'finalizar'].includes(seccion)) {
    detalle = `<section class="panel route-panel">${pasos(['Expediente', 'Consulta · Próximamente', 'Cierre · Próximamente'])}${contexto}${descripcion}<div class="route-block"><h2>${seccion === 'finalizar' ? 'Información disponible para administración' : 'Trabajo durante la consulta'}</h2><p>${seccion === 'finalizar' ? 'El flujo futuro pondrá a disposición el estado de atención y las recetas emitidas autorizadas para entrega. No se expondrán notas clínicas ni se cambiará el estado desde esta maqueta.' : 'Los formularios clínicos se integrarán en una próxima etapa. Puedes recorrer las secciones de ejemplo sin introducir datos.'}</p></div><div class="route-actions">${seccion === 'consultas' ? boton(`diagnosticos/${paciente.id}`, 'Ver paso de diagnóstico', 'diagnostico', false, true) + boton(`finalizar/${paciente.id}`, 'Ver cierre de ejemplo', 'flecha') : '<button class="button" disabled>Finalizar atención · Próximamente</button>'}${boton(`expediente/${paciente.id}`, 'Volver al expediente', 'historial')}</div></section>`;
  } else if (seccion === 'recetas' || seccion === 'entrega') {
    detalle = `<section class="panel route-panel">${pasos(['Consulta terminada · Ejemplo', 'Localizar receta', 'Entrega · Próximamente'])}${contexto}<div class="route-block"><h2>Receta emitida de ejemplo</h2><p>Escenario ficticio: receta pendiente de entrega. El documento y sus medicamentos se mostrarán cuando se integre el componente compartido.</p><span class="label amber">Pendiente de entrega · Ejemplo</span></div><div class="route-actions">${seccion === 'recetas' ? boton(`entrega/${paciente.id}`, 'Consultar entrega de ejemplo', 'receta', true) : '<button class="button" disabled>Marcar como entregada · Próximamente</button>'}</div></section>`;
  } else {
    const siguiente = { diagnosticos: 'procedimientos', procedimientos: 'tratamientos', tratamientos: 'prescribir', prescribir: 'finalizar' }[seccion];
    detalle = `<section class="panel coming-soon"><span class="icon-box">${icono(secciones[seccion][1])}</span><span class="label blue">Próximamente</span><h2>Sección en desarrollo</h2>${contexto}${descripcion}<p>Esta etapa prepara el recorrido visual. No hay formularios completos ni cambios de datos.</p>${boton(clinica ? `expediente/${paciente.id}` : `ficha/${paciente.id}`, clinica ? 'Volver al expediente' : 'Ver ficha administrativa', 'persona')}${siguiente ? `<div class="route-actions">${boton(`${siguiente}/${paciente.id}`, `Ver paso: ${secciones[siguiente][0]}`, 'flecha', false, true)}</div>` : ''}</section>`;
  }
  return encabezado + detalle;
}

function renderizar() {
  const [solicitada = 'inicio', pacienteId] = (location.hash.slice(1) || 'inicio').split('/');
  const paciente = ejemplos.find(p => p.id === pacienteId) || ejemplos[0];
  // Separación visual de recorridos. La autorización real sigue perteneciendo al backend.
  const permitidas = [...opciones[rol], ...(rol === 'secretaria' ? ['registro', 'ficha', 'responsables', 'nueva-cita', 'cita', 'reprogramar', 'entrega'] : ['expediente', 'antecedentes', 'finalizar'])];
  const seccion = permitidas.includes(solicitada) ? solicitada : 'inicio';
  const grupoActivo = ['registro', 'ficha', 'responsables'].includes(seccion) ? 'pacientes' : ['nueva-cita', 'cita', 'reprogramar'].includes(seccion) ? 'citas' : ['expediente', 'antecedentes'].includes(seccion) ? 'historial' : seccion === 'entrega' ? 'recetas' : seccion === 'finalizar' ? 'consultas' : seccion;
  const conContexto = ['historial', 'consultas', 'diagnosticos', 'procedimientos', 'tratamientos', 'prescribir'];
  document.getElementById('navegacion').innerHTML = opciones[rol].map((id) => `<a class="nav-link" href="#${id}${conContexto.includes(id) ? `/${paciente.id}` : ''}"${id === grupoActivo ? ' aria-current="page"' : ''}>${icono(secciones[id][1])}${secciones[id][0]}</a>`).join('');
  document.getElementById('seccion-actual').textContent = secciones[seccion][0];
  document.getElementById('rol-actual').textContent = rol === 'secretaria' ? 'Secretaria' : 'Odontólogo';
  document.title = `${secciones[seccion][0]} · Odontología · Alba Suite`;
  contenido.innerHTML = seccion === 'inicio' ? inicio() : recorrido(seccion, paciente);
}

if ((esDemo || sesion?.institucion === 'odontologia') && opciones[rol]) {
  document.getElementById('portal').hidden = false;
  document.querySelectorAll('[data-icon]').forEach((elemento) => { elemento.innerHTML = icono(elemento.dataset.icon); });
  if (esDemo) {
    document.getElementById('demo').hidden = false;
    const selector = document.getElementById('vista-previa');
    selector.value = rol;
    selector.addEventListener('change', () => {
      rol = selector.value;
      const url = new URL(location.href);
      url.searchParams.set('preview', rol);
      url.hash = '';
      history.replaceState(null, '', url);
      renderizar();
    });
  }
  renderizar();
  window.addEventListener('hashchange', () => { renderizar(); contenido.focus(); });
} else if (sesion?.institucion === 'odontologia') {
  document.getElementById('acceso-pendiente').hidden = false;
}
