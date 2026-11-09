import { apiOdontologia } from '../../shared/js/api/odontologia.js';
import { vistaOdontograma, activarOdontograma } from './odontograma.js';

import { escapar, campo, formulario, enlace, selectSimple, registroPaciente, busquedaPacientes, detallePaciente, tablaPacientes } from '../../shared/js/components/pacientes.js';
const opciones = (items) => items.map((item) => `<option value="${escapar(item.id)}">${escapar(item.nombre)}</option>`).join('');
const opcionesArchivo = ['traslado', 'fallecimiento', 'administrativo', 'otro'];
const opcionesSuperficie = ['O', 'M', 'D', 'V', 'L', 'P', 'I'];

export function iniciarPortalOdontologia({ sesion, contenido, api = apiOdontologia, icono = () => '' }) {
  const clinica = sesion.rol === 'odontologo';
  const navegacion = document.getElementById('navegacion');
  const menu = [['inicio', 'Inicio'], ['citas', 'Agenda'], ['pacientes', 'Pacientes'], ...(!clinica ? [['registro', 'Registrar paciente']] : [['catalogos', 'Servicios y medicamentos']]), ['red', 'Consulta en red'], ['estado', 'Estado del servicio']];
  navegacion.innerHTML = menu.map(([hash, texto]) => `<a class="nav-link" href="#${hash}">${icono({ inicio: 'inicio', citas: 'calendario', pacientes: 'pacientes', registro: 'mas', catalogos: 'receta', red: 'buscar', estado: 'gestion' }[hash])}<span>${texto}</span></a>`).join('');
  document.getElementById('rol-actual').textContent = clinica ? 'Odontólogo' : 'Secretaria';
  document.querySelector('.page-footer').lastElementChild.textContent = 'Atención odontológica';
  let version = 0;
  let controlador;
  let guardado = false;
  function notificarGuardado() {
    contenido.querySelector('.save-status')?.remove();
    const mensaje = document.createElement('p');
    mensaje.className = 'save-status'; mensaje.setAttribute('role', 'status');
    mensaje.textContent = 'Cambios guardados correctamente.';
    contenido.prepend(mensaje);
  }
  function aviso(error) {
    const mensaje = document.createElement('p');
    mensaje.setAttribute('role', 'alert');
    mensaje.className = 'context-alert';
    mensaje.textContent = error.status === 401 ? 'La sesión terminó. Vuelve al acceso general.' : error.message;
    contenido.querySelector('[role="alert"]')?.remove();
    contenido.prepend(mensaje);
  }
  function alEnviar(id, accion) {
    const form = contenido.querySelector(`#${id}`);
    form?.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      if (form.dataset.enviando || !form.reportValidity()) return;
      form.dataset.enviando = 'true';
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      const actual = version;
      const rutaEnvio = location.hash;
      const textoSubmit = submit.textContent;
      submit.textContent = 'Procesando…';
      try {
        await accion(Object.fromEntries(new FormData(form)));
        if (actual === version && !['buscar-api', 'buscar-red', 'fecha-agenda'].includes(id)) {
          guardado = location.hash;
          if (location.hash === rutaEnvio) notificarGuardado();
        }
      }
      catch (error) { if (actual === version) aviso(error); }
      finally { delete form.dataset.enviando; submit.disabled = false; submit.textContent = textoSubmit; }
    });
  }
  async function renderizar() {
    const actual = ++version;
    if (guardado !== location.hash) guardado = false;
    controlador?.abort();
    controlador = new AbortController();
    const signal = controlador.signal;
    const [ruta, query] = (location.hash.slice(1) || 'inicio').split('?');
    const [seccion, pacienteId, entidadId] = ruta.split('/');
    const grupoActivo = seccion === 'red-historial' ? 'red' : ['nueva-cita', 'reprogramar'].includes(seccion) ? 'citas'
      : ['ficha', 'expediente', 'responsables', 'alergias', 'contacto', 'consulta', 'diagnostico', 'tratamiento', 'receta', 'archivar'].includes(seccion) ? 'pacientes' : seccion;
    contenido.innerHTML = '<p role="status">Cargando…</p>';
    contenido.setAttribute('aria-busy', 'true');
    navegacion.querySelectorAll('a').forEach((a) => {
      if (a.hash === `#${grupoActivo}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const mostrar = (titulo, html) => {
      if (actual !== version) return false;
      contenido.innerHTML = `<div class="page-heading"><div><span class="eyebrow">${clinica ? 'ESPACIO CLÍNICO' : 'RECEPCIÓN Y ADMINISTRACIÓN'}</span><h1>${titulo}</h1></div>${seccion !== 'inicio' ? enlace('inicio', 'Volver al inicio') : '<span class="label blue">Clínica Odontológica · I2</span>'}</div><section class="panel route-panel">${html}</section>`;
      document.title = `${titulo} · Odontología · Alba Suite`;
      document.getElementById('seccion-actual').textContent = titulo;
      contenido.setAttribute('aria-busy', 'false');
      contenido.querySelector('h1').setAttribute('tabindex', '-1');
      contenido.querySelector('h1').focus({ preventScroll: true });
      if (guardado) notificarGuardado();
      return true;
    };
    const ir = (destino) => { if (actual === version) location.hash = destino; };
    try {
      if (seccion === 'red') {
        const params = new URLSearchParams(query);
        const filtro = { documento: params.get('documento') || '', texto: params.get('texto') || '', pagina: params.get('pagina') || '1', limite: 10 };
        const busqueda = formulario('buscar-red', campo('documento', 'Documento exacto', 'search', false, 'maxlength="50"') + campo('texto', 'Nombre o apellido', 'search', false, 'minlength="2" maxlength="100"'), 'Consultar instituciones');
        let resultados = '<div class="empty-state"><h2>Busca una vez, consulta las instituciones</h2><p>Escribe el documento o el nombre del paciente. Las fichas de otras instituciones se abren en modo de solo lectura.</p></div>';
        if (filtro.documento || filtro.texto) {
          const respuesta = await api.buscarEnRed(filtro, signal);
          const nombres = { hospital: 'Hospital General', odontologia: 'Clínica Odontológica', laboratorio: 'Laboratorio Clínico', pediatria: 'Centro Pediátrico' };
          resultados = `<div class="network-grid">${respuesta.resultados.map((r) => `<article class="network-card"><div class="section-intro"><h2>${escapar(nombres[r.institucion] ?? r.institucion)}</h2><span class="label ${r.estado === 'ok' ? 'blue' : 'amber'}">${r.estado === 'ok' ? 'Consultado' : 'No disponible'}</span></div>${r.estado !== 'ok' ? '<p>No se pudo consultar esta institución. Los resultados de las demás siguen disponibles.</p>' : `<p>${escapar(r.total)} coincidencias</p>${r.items.map((p) => `<div class="network-patient"><strong>${escapar(p.nombre)} ${escapar(p.apellidos)}</strong><small>${escapar(p.documentoIdentidad)}</small>${enlace(`red-historial/${r.institucion}/${p.id}?${new URLSearchParams(filtro)}`, 'Consultar ficha en red')}</div>`).join('') || '<p>No hay coincidencias.</p>'}${Number(filtro.pagina) > 1 ? enlace(`red?${new URLSearchParams({ ...filtro, pagina: Number(filtro.pagina) - 1 })}`, 'Página anterior') : ''}${Number(filtro.pagina) * filtro.limite < r.total ? enlace(`red?${new URLSearchParams({ ...filtro, pagina: Number(filtro.pagina) + 1 })}`, 'Página siguiente') : ''}`}</article>`).join('')}</div>`;
        }
        if (!mostrar('Consulta en red', '<p class="form-help">Información autorizada por tu rol. La consulta no modifica expedientes de otras instituciones.</p>' + busqueda + resultados)) return;
        for (const nombre of ['documento', 'texto']) contenido.querySelector(`[name="${nombre}"]`).value = filtro[nombre];
        alEnviar('buscar-red', async (d) => {
          if (!d.documento.trim() && d.texto.trim().length < 2) throw new Error('Escribe un documento o al menos dos caracteres del nombre.');
          const destino = `red?${new URLSearchParams({ ...d, pagina: 1 })}`;
          if (location.hash === `#${destino}`) await renderizar(); else ir(destino);
        });
      } else if (seccion === 'red-historial') {
        const datos = await api.historialEnRed(pacienteId, entidadId, signal);
        const ficha = `<h2>${escapar(datos.paciente?.nombre)} ${escapar(datos.paciente?.apellidos)}</h2><dl class="detail-grid">${[['Documento', datos.paciente?.documentoIdentidad], ['Nacimiento', datos.paciente?.fechaNacimiento], ['Género', datos.paciente?.genero]].filter(([,v]) => v !== undefined).map(([etiqueta, valor]) => `<div><dt>${etiqueta}</dt><dd>${escapar(valor)}</dd></div>`).join('')}</dl>`;
        mostrar('Ficha en red · solo lectura', enlace(`red?${query ?? ''}`, 'Volver a resultados') + ficha +
          `<p class="context-alert">Se muestran únicamente los campos autorizados. Las notas y extensiones restringidas de otras instituciones no se comparten.</p><p>Estado del historial: <strong>${escapar(datos.historial?.estado)}</strong></p>`);
      } else if (['inicio', 'citas'].includes(seccion)) {
        const fecha = new URLSearchParams(query).get('fecha') || new Intl.DateTimeFormat('en-CA').format(new Date());
        const agenda = await api.agenda(fecha, signal);
        const indicadores = `<dl class="agenda-metrics" aria-label="Resumen de la agenda seleccionada">${[
          ['Citas registradas', agenda.items.length],
          ['Por atender', agenda.items.filter((c) => ['programada', 'confirmada'].includes(c.estado)).length],
          ['Completadas', agenda.items.filter((c) => c.estado === 'completada').length],
          ['Canceladas / no asistió', agenda.items.filter((c) => ['cancelada', 'no_asistio'].includes(c.estado)).length],
        ].map(([titulo, valor]) => `<div><dt>${titulo}</dt><dd>${valor}</dd></div>`).join('')}</dl>`;
        const acceso = (destino, titulo, texto, simbolo) => `<a class="quick-card" href="#${destino}"><span class="icon-box">${icono(simbolo)}</span><span><strong>${titulo}</strong><small>${texto}</small></span><span class="arrow">${icono('flecha')}</span></a>`;
        const trabajo = clinica
          ? [['Historial clínico', 'Seleccionar paciente y ver expediente', 'historial', 'pacientes'], ['Antecedentes y alergias', 'Seleccionar paciente y revisar alergias', 'historial', 'pacientes?accion=alergias'], ['Diagnósticos', 'Elegir consulta desde el expediente', 'diagnostico', 'pacientes'], ['Procedimientos dentales', 'Seleccionar paciente y abrir odontograma', 'diente', 'pacientes?accion=consulta'], ['Tratamientos', 'Seguimiento desde el expediente', 'tratamiento', 'pacientes'], ['Recetas y medicamentos', 'Elegir consulta desde el expediente', 'receta', 'pacientes']]
          : [['Responsables legales', 'Seleccionar paciente y gestionar vínculos', 'pacientes', 'pacientes?accion=responsables'], ['Citas y estado de atención', 'Consultar la agenda administrativa', 'calendario', 'citas']];
        const tarjetas = agenda.items.map((c) => `<article class="appointment"><span class="time">${escapar(c.hora)}</span><div class="appointment-info"><strong>${escapar(c.nombre)}</strong><p>${escapar(c.motivo)}</p><span class="label">${escapar(c.estado)}</span></div><div class="row-actions">${enlace(`${clinica ? 'expediente' : 'ficha'}/${c.pacienteId}`, clinica ? 'Abrir expediente' : 'Abrir ficha')}${['programada', 'confirmada'].includes(c.estado) ? (clinica ? enlace(`consulta/${c.pacienteId}?citaId=${encodeURIComponent(c.id)}`, 'Atender cita') : enlace(`reprogramar/${c.id}?fecha=${encodeURIComponent(c.fecha)}&hora=${encodeURIComponent(c.hora)}&estado=${encodeURIComponent(c.estado)}`, 'Gestionar cita')) : ''}</div></article>`).join('');
        if (!mostrar(seccion === 'citas' ? 'Agenda de citas' : clinica ? 'Tu siguiente paciente, a un paso' : 'Una recepción más ágil',
          `<p class="agenda-scope">${clinica ? 'Tu agenda profesional' : 'Agenda de la clínica'} · ${escapar(fecha)}. Indicadores calculados con las citas de esta fecha.</p>${indicadores}` +
          `<section class="dashboard-zone"><div class="zone-heading"><h2>${clinica ? 'Pacientes por atender' : 'Atención rápida'}</h2></div><div class="quick-grid">${enlace('pacientes', 'Buscar paciente')}${!clinica ? enlace('registro', 'Nuevo paciente') : ''}</div></section>` +
          `<section class="dashboard-zone"><h2>Agenda de la fecha seleccionada</h2>${formulario('fecha-agenda', campo('fecha', 'Fecha', 'date', true), 'Consultar')}<div class="agenda agenda-wide">${tarjetas || `<div class="empty-state"><h3>Sin citas para esta fecha</h3><p>Puedes consultar otro día${!clinica ? ' o seleccionar un paciente para agendar una cita' : ''}.</p>${enlace('pacientes', 'Buscar paciente')}</div>`}</div></section>` +
          `<section class="dashboard-zone"><h2>${clinica ? 'Trabajo clínico y seguimiento' : 'Gestión administrativa'}</h2><p>${clinica ? 'Selecciona un paciente para consultar antecedentes, registrar procedimientos, diagnósticos, tratamientos y recetas.' : 'Abre una ficha para gestionar responsables legales y agendar citas.'}</p><div class="quick-grid ${clinica ? 'clinical-grid' : ''}">${trabajo.map(([titulo, texto, simbolo, destino]) => acceso(destino, titulo, texto, simbolo)).join('')}</div></section>`)) return;
        contenido.querySelector('[name="fecha"]').value = fecha;
        alEnviar('fecha-agenda', async (d) => { const destino = `citas?fecha=${d.fecha}`; if (location.hash === `#${destino}`) await renderizar(); else ir(destino); });
      } else if (seccion === 'contacto' && !clinica) {
        const paciente = await api.paciente(pacienteId, signal);
        mostrar('Actualizar contacto', formulario('contacto-api', campo('telefono', 'Teléfono', 'tel', false, 'maxlength="20"') + campo('correo', 'Correo', 'email', false, 'maxlength="150"') + campo('direccion', 'Dirección', 'text', false, 'maxlength="200"'), 'Guardar'));
        for (const nombre of ['telefono', 'correo', 'direccion']) contenido.querySelector(`[name="${nombre}"]`).value = paciente[nombre] ?? '';
        alEnviar('contacto-api', async (d) => { await api.actualizarContacto(pacienteId, Object.fromEntries(Object.entries(d).filter(([,v]) => v.trim()))); ir(`ficha/${pacienteId}`); });
      } else if (seccion === 'reprogramar' && !clinica) {
        mostrar('Gestionar cita', formulario('cita-api', campo('fecha', 'Fecha', 'date', true) + campo('hora', 'Hora', 'time', true) + selectSimple('estado', 'Estado', ['programada', 'confirmada', 'cancelada', 'no_asistio']), 'Guardar'));
        const params = new URLSearchParams(query);
        for (const nombre of ['fecha', 'hora']) contenido.querySelector(`[name="${nombre}"]`).value = params.get(nombre) || '';
        const estadoActual = params.get('estado');
        if (['programada', 'confirmada', 'cancelada', 'no_asistio'].includes(estadoActual)) contenido.querySelector('[name="estado"]').value = estadoActual;
        alEnviar('cita-api', async (d) => { await api.cambiarCita(pacienteId, d); ir('citas'); });
      } else if (seccion === 'nueva-cita' && !clinica) {
        const equipo = await api.equipo(signal);
        mostrar('Nueva cita', formulario('cita-api', `<label>Odontólogo<select name="usuarioId" required>${opciones(equipo.items)}</select></label>` + campo('fecha', 'Fecha', 'date', true) + campo('hora', 'Hora', 'time', true) + campo('motivo', 'Motivo', 'text', true, 'maxlength="250"'), 'Agendar'));
        alEnviar('cita-api', async (d) => { await api.crearCita({ ...d, pacienteId }); ir(`citas?fecha=${d.fecha}`); });
      } else if (seccion === 'responsables' || (seccion === 'alergias' && clinica)) {
        const esAlergia = seccion === 'alergias';
        const datos = await (esAlergia ? api.alergias(pacienteId, signal) : api.responsables(pacienteId, signal));
        const lista = datos.items.map((r) => `<article class="patient-row"><p>${escapar(esAlergia ? r.nombre : `${r.nombres} ${r.apellidos}`)} · ${escapar(esAlergia ? `${r.nivelSeveridad}: ${r.reaccion}` : `${r.parentesco} · ${r.telefono ?? ''}${r.esPrincipal ? ' · Principal' : ''}`)}</p></article>`).join('') || '<p>No hay registros.</p>';
        const campos = esAlergia ? `<label>Alergia<select name="alergiaId" required>${opciones(datos.catalogo)}</select></label>` + campo('nivelSeveridad', 'Severidad', 'text', true, 'maxlength="50"') + campo('reaccion', 'Reacción', 'text', true, 'maxlength="500"') + campo('observaciones', 'Observaciones', 'text', false, 'maxlength="500"') : campo('nombres', 'Nombres', 'text', true, 'maxlength="100"') + campo('apellidos', 'Apellidos', 'text', true, 'maxlength="100"') + campo('dpi', 'Documento', 'text', false, 'maxlength="20"') + campo('telefono', 'Teléfono', 'tel', false, 'maxlength="20"') + campo('parentesco', 'Parentesco', 'text', true, 'maxlength="50"') + selectSimple('esPrincipal', 'Principal', ['false', 'true']);
        mostrar(esAlergia ? 'Antecedentes y alergias' : 'Responsables legales', enlace(`${clinica ? 'expediente' : 'ficha'}/${pacienteId}`, 'Volver al paciente') + lista + ((esAlergia || !clinica) ? formulario('relacion-api', campos, 'Guardar') : ''));
        alEnviar('relacion-api', async (d) => {
          const entrada = Object.fromEntries(Object.entries(d).filter(([, v]) => v !== ''));
          if (esAlergia) await api.alergia(pacienteId, entrada);
          else await api.responsable(pacienteId, { ...entrada, esPrincipal: d.esPrincipal === 'true' });
          if (actual !== version) return;
          guardado = location.hash;
          await renderizar();
        });
      } else if (seccion === 'catalogos' && clinica) {
        const datos = await api.catalogos(signal);
        const catalogo = (titulo, items, detalle) => `<section class="dashboard-zone"><h2>${titulo}</h2>${items.length ? `<ul class="catalog-list">${items.map((item) => `<li><strong>${escapar(item.nombre)}</strong><span>${escapar(detalle(item))}</span></li>`).join('')}</ul>` : '<p class="empty-state">No hay elementos disponibles en este catálogo.</p>'}</section>`;
        mostrar('Servicios y medicamentos', '<p class="form-help">Catálogos disponibles para la atención. Para registrar un procedimiento o emitir una receta, abre el expediente del paciente. La administración de catálogos no está disponible en este portal.</p>' + enlace('pacientes', 'Seleccionar paciente') +
          catalogo('Servicios odontológicos', datos.servicios, (s) => s.precioBase == null ? 'Precio base sin registrar' : `Precio base: ${Number(s.precioBase).toFixed(2)}`) +
          catalogo('Medicamentos', datos.medicamentos, (m) => m.presentacion || 'Presentación sin registrar'));
      } else if (seccion === 'estado') {
        const estado = await api.estado(signal);
        mostrar('Estado del servicio', `<p role="status">${estado.ok ? 'Disponible' : 'No disponible'}</p><dl class="detail-grid"><div><dt>Motor</dt><dd>${escapar(estado.motor)}</dd></div><div><dt>Latencia</dt><dd>${escapar(estado.latenciaMs)} ms</dd></div></dl>`);
      } else if (seccion === 'registro' && !clinica) {
        mostrar('Registrar paciente', registroPaciente());
        const registro = contenido.querySelector('#registro-api');
        const responsable = document.createElement('fieldset');
        responsable.innerHTML = '<legend>Responsable legal · obligatorio para menores</legend>' + campo('responsableNombres', 'Nombres', 'text', false, 'maxlength="100"') + campo('responsableApellidos', 'Apellidos', 'text', false, 'maxlength="100"') + campo('responsableParentesco', 'Parentesco', 'text', false, 'maxlength="50"') + campo('responsableTelefono', 'Teléfono', 'tel', false, 'maxlength="20"') + campo('responsableDpi', 'Documento', 'text', false, 'maxlength="20"');
        registro.insertBefore(responsable, registro.querySelector('[type="submit"]'));
        alEnviar('registro-api', async (datos) => {
          const entrada = Object.fromEntries(Object.entries(datos).filter(([nombre, valor]) => !nombre.startsWith('responsable') && valor.trim()));
          if (Object.entries(datos).some(([nombre, valor]) => nombre.startsWith('responsable') && valor.trim())) {
            entrada.detallesInstitucion = { responsableLegal: Object.fromEntries([
              ['nombres', datos.responsableNombres], ['apellidos', datos.responsableApellidos], ['parentesco', datos.responsableParentesco],
              ['telefono', datos.responsableTelefono], ['dpi', datos.responsableDpi], ['esPrincipal', true],
            ].filter(([, valor]) => valor === true || valor.trim())) };
          }
          const paciente = await api.registrar(entrada);
          ir(`ficha/${paciente.id}`);
        });
      } else if (seccion === 'ficha' || seccion === 'expediente') {
        const paciente = await api.paciente(pacienteId, signal);
        let html = detallePaciente(paciente);
        let expedienteActual;
        html += enlace(`responsables/${pacienteId}`, 'Responsables legales') + (clinica ? enlace(`alergias/${pacienteId}`, 'Antecedentes y alergias') : enlace(`nueva-cita/${pacienteId}`, 'Agendar cita') + enlace(`contacto/${pacienteId}`, 'Actualizar contacto'));
        if (clinica) {
          const expediente = await api.historial(pacienteId, signal);
          expedienteActual = expediente;
          html += vistaOdontograma(expediente.consultas.flatMap((c) => c.detallesInstitucion?.servicios ?? []), true);
          const activo = expediente.historial.estado === 'activo';
          html += `<p>Historial: <strong>${escapar(expediente.historial.estado)}</strong></p>`;
          if (activo) html += enlace(`consulta/${pacienteId}`, 'Nueva consulta') + enlace(`archivar/${pacienteId}`, 'Archivar historial');
          else html += `<p>${escapar(expediente.historial.motivoArchivo?.detalle)} · ${escapar(expediente.historial.fechaArchivo)}</p>`;
          html += '<h2>Consultas</h2>' + (expediente.consultas.length ? expediente.consultas.map((consulta) =>
            `<article class="api-consulta"><h3>Consulta ${escapar(consulta.id)} · ${escapar(consulta.fecha)}</h3><p>${escapar(consulta.motivo)}</p><p>${escapar(consulta.observaciones)}</p><span class="label blue">${escapar(consulta.estado)}</span><p class="form-help">Póliza vinculada: ${consulta.detallesInstitucion?.polizaId ? escapar(consulta.detallesInstitucion.polizaId) : "Sin póliza registrada"}</p>` +
            (activo && consulta.estado === 'borrador' ? enlace(`diagnostico/${pacienteId}/${consulta.id}`, 'Agregar diagnóstico') + enlace(`receta/${pacienteId}/${consulta.id}`, 'Emitir receta') : '') +
            '<h4>Diagnósticos y tratamientos</h4>' + (consulta.diagnosticos ?? []).map((d) => `<div><p>${escapar(d.descripcion)} · ${escapar(d.observaciones)}</p>` +
              (activo && consulta.estado === 'borrador' ? enlace(`tratamiento/${pacienteId}/${d.id}`, 'Agregar tratamiento') : '') +
              (d.tratamientos ?? []).map((t) => `<p>${escapar(t.descripcion)} · ${escapar(t.fechaInicio)} — ${escapar(t.fechaFin)} · ${escapar(t.estado)}</p>`).join('') + '</div>').join('') +
            '<h4>Recetas</h4>' + (consulta.recetas ?? []).map((r) => `<p>${escapar(r.indicacionesGenerales)}</p><ul>${r.medicamentos.map((m) =>
              `<li>${escapar(m.nombre)}: ${escapar(m.dosis)} · ${escapar(m.frecuencia)} · ${escapar(m.duracion)} · ${escapar(m.indicaciones)}</li>`).join('')}</ul>`).join('') +
            '<h4>Servicios y piezas dentales</h4><ul>' + (consulta.detallesInstitucion?.servicios ?? []).map((s) =>
              `<li>${escapar(s.nombre)} · Pieza ${escapar(s.piezaDental)} · ${escapar(s.superficie)} · ${escapar(s.precioAplicado)}</li>`).join('') + '</ul></article>').join('') : '<p>No hay consultas registradas.</p>');
        }
        if (!mostrar(clinica ? 'Expediente clínico' : 'Ficha administrativa', html)) return;
        if (clinica) {
          const expediente = expedienteActual;
          if (actual !== version) return;
          if (expediente.historial.estado === 'activo') for (const consulta of expediente.consultas.filter((c) => c.estado === 'borrador')) {
            const boton = document.createElement('button');
            boton.className = 'button'; boton.textContent = `Finalizar consulta ${consulta.id}`;
            boton.addEventListener('click', async () => {
              if (boton.disabled) return;
              boton.disabled = true;
              try { await api.finalizar(consulta.id); if (actual === version) { guardado = location.hash; await renderizar(); } }
              catch (error) { if (actual === version) aviso(error); }
              finally { boton.disabled = false; }
            });
            const indice = expediente.consultas.findIndex((item) => item.id === consulta.id);
            contenido.querySelectorAll('.api-consulta')[indice]?.append(boton);
          }
        }
      } else if (['consulta', 'diagnostico', 'tratamiento', 'receta', 'archivar'].includes(seccion) && clinica) {
        const expediente = await api.historial(pacienteId, signal);
        if (expediente.historial.estado !== 'activo') throw new Error('El historial está archivado');
        if (['diagnostico', 'receta', 'tratamiento'].includes(seccion)) {
          const consulta = expediente.consultas.find((c) => seccion === 'tratamiento'
            ? c.diagnosticos?.some((d) => d.id === entidadId) : c.id === entidadId);
          if (!consulta) throw new Error('El registro no pertenece al expediente seleccionado');
          if (consulta.estado !== 'borrador') throw new Error('La consulta no está disponible para edición');
        }
        const cabecera = `<h2>${escapar(expediente.paciente.nombre ?? expediente.paciente.nombres)} ${escapar(expediente.paciente.apellidos)}</h2>${enlace(`expediente/${pacienteId}`, 'Volver al expediente')}`;
        let campos;
        if (seccion === 'consulta') {
          const catalogos = await api.catalogos(signal);
          campos = campo('motivo', 'Motivo', 'text', true, 'maxlength="250"') + campo('observaciones', 'Observaciones', 'text', false, 'maxlength="500"') + vistaOdontograma(expediente.consultas.flatMap((c) => c.detallesInstitucion?.servicios ?? [])) +
            `<div id="servicios-api"><fieldset class="api-servicio"><legend>Servicio odontológico opcional</legend><label>Servicio<select name="servicioId"><option value="">Sin servicio</option>${opciones(catalogos.servicios)}</select></label>` +
            campo('piezaDental', 'Pieza FDI permanente', 'number', false, 'min="11" max="48" step="1"') + selectSimple('superficie', 'Superficie', ['', ...opcionesSuperficie]) +
            campo('precioAplicado', 'Precio aplicado', 'number', false, 'min="0" step="0.01" max="99999999.99"') + '</fieldset></div><button type="button" id="agregar-servicio" class="button">Agregar servicio o pieza</button>';
        } else if (seccion === 'archivar') {
          campos = '<p>El archivo impedirá registrar nuevas consultas. Indica la justificación.</p>' + selectSimple('tipo', 'Tipo', opcionesArchivo) + campo('detalle', 'Motivo', 'text', true, 'maxlength="250"');
        } else if (seccion === 'receta') {
          const catalogos = await api.catalogos(signal);
          if (!catalogos.medicamentos.length) throw new Error('No hay medicamentos disponibles en el catálogo');
          campos = campo('indicacionesGenerales', 'Indicaciones generales', 'text', false, 'maxlength="5000"') +
            `<div id="medicamentos-api"><fieldset class="api-medicamento"><legend>Medicamento</legend><label>Medicamento<select name="medicamentoId" required><option value="">Selecciona</option>${opciones(catalogos.medicamentos)}</select></label>` +
            campo('dosis', 'Dosis', 'text', true, 'maxlength="100"') + campo('frecuencia', 'Frecuencia', 'text', true, 'maxlength="100"') +
            campo('duracion', 'Duración', 'text', false, 'maxlength="100"') + campo('cantidad', 'Cantidad', 'number', false, 'min="1" max="2147483647" step="1"') +
            campo('indicaciones', 'Indicaciones', 'text', false, 'maxlength="500"') + '</fieldset></div><button type="button" id="agregar-medicamento" class="button">Agregar medicamento</button>';
        } else {
          campos = campo('descripcion', 'Descripción', 'text', true, 'maxlength="500"') + campo('observaciones', 'Observaciones', 'text', false, 'maxlength="500"') +
            (seccion === 'tratamiento' ? campo('fechaInicio', 'Fecha de inicio', 'date', false) + campo('fechaFin', 'Fecha final', 'date', false) : '');
        }
        if (!mostrar('Atención clínica', cabecera + formulario('clinica-api', campos, seccion === 'archivar' ? 'Confirmar archivo' : 'Guardar'))) return;
        if (seccion === 'consulta') {
          let filaActiva = contenido.querySelector('.api-servicio');
          contenido.querySelector('#servicios-api').addEventListener('focusin', (evento) => {
            const fila = evento.target.closest('.api-servicio');
            if (fila) filaActiva = fila;
          });
          activarOdontograma(contenido.querySelector('.odontograma'), ({ piezaDental, superficie }) => {
            if (!filaActiva?.isConnected) filaActiva = contenido.querySelector('.api-servicio');
            filaActiva.querySelector('[name="piezaDental"]').value = piezaDental;
            filaActiva.querySelector('[name="superficie"]').value = superficie;
            contenido.querySelectorAll('.api-servicio').forEach((fila) => fila.classList.toggle('service-active', fila === filaActiva));
          });
          contenido.querySelector('#agregar-servicio').addEventListener('click', () => {
            const contenedor = contenido.querySelector('#servicios-api');
            if (contenedor.children.length >= 100) return;
            const fila = contenedor.firstElementChild.cloneNode(true);
            fila.querySelectorAll('input, select').forEach((input) => { input.value = ''; });
            const quitar = document.createElement('button');
            quitar.type = 'button'; quitar.className = 'button'; quitar.textContent = 'Quitar servicio';
            quitar.addEventListener('click', () => fila.remove());
            fila.append(quitar); contenedor.append(fila);
            filaActiva = fila;
            fila.querySelector('select').focus();
          });
        }
        if (seccion === 'receta') {
          contenido.querySelector('#agregar-medicamento').addEventListener('click', () => {
            const contenedor = contenido.querySelector('#medicamentos-api');
            if (contenedor.children.length >= 50) return;
            const fila = contenedor.firstElementChild.cloneNode(true);
            fila.querySelectorAll('input, select').forEach((input) => { input.value = ''; });
            const quitar = document.createElement('button');
            quitar.type = 'button'; quitar.className = 'button'; quitar.textContent = 'Quitar medicamento';
            quitar.addEventListener('click', () => fila.remove());
            fila.append(quitar); contenedor.append(fila);
          });
        }
        alEnviar('clinica-api', async (valores) => {
          const datos = Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor.trim()));
          if (seccion === 'consulta') {
            const entrada = { pacienteId, motivo: datos.motivo, ...(datos.observaciones ? { observaciones: datos.observaciones } : {}) };
            const citaId = new URLSearchParams(query).get('citaId');
            if (citaId) entrada.citaId = citaId;
            const servicios = [...contenido.querySelectorAll('.api-servicio')].flatMap((fila) => {
              const item = Object.fromEntries([...fila.querySelectorAll('input, select')].filter((input) => input.value.trim()).map((input) => [input.name, input.value]));
              if (!item.servicioId && Object.keys(item).length) throw new Error('Selecciona el servicio de la pieza dental');
              if (!item.servicioId) return [];
              if (item.piezaDental !== undefined) item.piezaDental = Number(item.piezaDental);
              if (item.precioAplicado !== undefined) item.precioAplicado = Number(item.precioAplicado);
              return [item];
            });
            if (servicios.length) entrada.detallesInstitucion = { servicios };
            await api.consulta(entrada);
          } else if (seccion === 'archivar') await api.archivar(pacienteId, datos);
          else if (seccion === 'diagnostico') await api.diagnostico(entidadId, datos);
          else if (seccion === 'tratamiento') await api.tratamiento(entidadId, datos);
          else {
            const medicamentos = [...contenido.querySelectorAll('.api-medicamento')].map((fila) => {
              const item = Object.fromEntries([...fila.querySelectorAll('input, select')].filter((input) => input.value.trim()).map((input) => [input.name, input.value]));
              if (item.cantidad) item.cantidad = Number(item.cantidad);
              return item;
            });
            await api.receta(entidadId, { ...(datos.indicacionesGenerales ? { indicacionesGenerales: datos.indicacionesGenerales } : {}), medicamentos });
          }
          ir(`expediente/${pacienteId}`);
        });
      } else {
        const parametros = new URLSearchParams(query);
        const accion = parametros.get('accion');
        const acciones = clinica ? { alergias: 'revisar alergias', consulta: 'abrir una consulta con odontograma' } : { responsables: 'gestionar responsables legales' };
        const pagina = Math.max(1, Number(parametros.get('pagina')) || 1);
        const filtro = { texto: parametros.get('texto') || '', documento: parametros.get('documento') || '', estado: parametros.get('estado') || '', pagina, limite: 10 };
        const lista = await api.listar(filtro, signal);
        const busqueda = busquedaPacientes();
        const contexto = Object.hasOwn(acciones, accion) ? { accion } : {};
        const paginar = (numero, etiqueta) => enlace(`pacientes?${new URLSearchParams({ ...filtro, ...contexto, pagina: numero })}`, etiqueta);
        if (!mostrar('Pacientes', (contexto.accion ? `<p class="context-alert">Selecciona un paciente para ${acciones[accion]}.</p>` : '') + busqueda + `<p role="status">${escapar(lista.total)} pacientes</p>` +
          tablaPacientes(lista.items, clinica) +
          `<nav class="route-actions" aria-label="Paginación">${pagina > 1 ? paginar(pagina - 1, 'Anterior') : ''}<span>Página ${escapar(pagina)}</span>${pagina * 10 < lista.total ? paginar(pagina + 1, 'Siguiente') : ''}</nav>`)) return;
        if (contexto.accion) contenido.querySelectorAll('.api-table a').forEach((a, i) => {
          a.href = `#${accion}/${encodeURIComponent(lista.items[i].id)}`;
          a.textContent = accion === 'consulta' ? 'Abrir odontograma' : accion === 'alergias' ? 'Revisar alergias' : 'Gestionar responsables';
        });
        contenido.querySelector('[name="texto"]').value = filtro.texto;
        contenido.querySelector('[name="documento"]').value = filtro.documento;
        contenido.querySelector('[name="estado"]').value = filtro.estado;
        alEnviar('buscar-api', async (datos) => {
          const destino = `pacientes?${new URLSearchParams({ ...datos, ...contexto, pagina: 1 })}`;
          if (location.hash === `#${destino}`) await renderizar(); else ir(destino);
        });
      }
    } catch (error) {
      if (actual !== version || error.name === 'AbortError') return;
      mostrar('No se pudo completar la operación', enlace('pacientes', 'Volver a pacientes') +
        '<button type="button" class="button" id="reintentar-api">Reintentar</button>' + '<a class="button" href="../index.html">Acceso general</a>');
      aviso(error);
      contenido.querySelector('#reintentar-api').addEventListener('click', renderizar);
    }
  }
  const cambiar = () => { renderizar(); };
  window.addEventListener('hashchange', cambiar);
  renderizar();
  return () => { version++; controlador?.abort(); window.removeEventListener('hashchange', cambiar); };
}
