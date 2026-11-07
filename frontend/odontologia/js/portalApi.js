import { apiOdontologia } from '../../shared/js/api/odontologia.js';

import { escapar, campo, formulario, enlace, selectSimple, registroPaciente, busquedaPacientes, detallePaciente, tablaPacientes } from '../../shared/js/components/pacientes.js';
const opciones = (items) => items.map((item) => `<option value="${escapar(item.id)}">${escapar(item.nombre)}</option>`).join('');
const opcionesArchivo = ['traslado', 'fallecimiento', 'administrativo', 'otro'];
const opcionesSuperficie = ['O', 'M', 'D', 'V', 'L', 'P', 'I'];

export function iniciarPortalOdontologia({ sesion, contenido, api = apiOdontologia }) {
  const clinica = sesion.rol === 'odontologo';
  const navegacion = document.getElementById('navegacion');
  const menu = [['pacientes', 'Pacientes'], ...(!clinica ? [['registro', 'Registrar paciente']] : []), ['estado', 'Estado del servicio']];
  navegacion.innerHTML = menu.map(([hash, texto]) => `<a class="nav-link" href="#${hash}">${texto}</a>`).join('');
  document.getElementById('rol-actual').textContent = clinica ? 'Odontólogo' : 'Secretaria';
  document.querySelector('.page-footer').lastElementChild.textContent = 'Atención odontológica';
  let version = 0;
  let controlador;
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
      try { await accion(Object.fromEntries(new FormData(form))); }
      catch (error) { if (actual === version) aviso(error); }
      finally { delete form.dataset.enviando; submit.disabled = false; }
    });
  }
  async function renderizar() {
    const actual = ++version;
    controlador?.abort();
    controlador = new AbortController();
    const signal = controlador.signal;
    const [ruta, query] = (location.hash.slice(1) || 'pacientes').split('?');
    const [seccion, pacienteId, entidadId] = ruta.split('/');
    contenido.innerHTML = '<p role="status">Cargando…</p>';
    navegacion.querySelectorAll('a').forEach((a) => {
      if (a.hash === `#${seccion}`) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const mostrar = (titulo, html) => {
      if (actual !== version) return false;
      contenido.innerHTML = `<div class="page-heading"><h1>${titulo}</h1></div><section class="panel route-panel">${html}</section>`;
      document.title = `${titulo} · Odontología · Alba Suite`;
      document.getElementById('seccion-actual').textContent = titulo;
      return true;
    };
    const ir = (destino) => { if (actual === version) location.hash = destino; };
    try {
      if (seccion === 'estado') {
        const estado = await api.estado(signal);
        mostrar('Estado del servicio', `<p role="status">${estado.ok ? 'Disponible' : 'No disponible'}</p><dl class="detail-grid"><div><dt>Motor</dt><dd>${escapar(estado.motor)}</dd></div><div><dt>Latencia</dt><dd>${escapar(estado.latenciaMs)} ms</dd></div></dl>`);
      } else if (seccion === 'registro' && !clinica) {
        mostrar('Registrar paciente', registroPaciente());
        alEnviar('registro-api', async (datos) => {
          const paciente = await api.registrar(Object.fromEntries(Object.entries(datos).filter(([, valor]) => valor.trim())));
          ir(`ficha/${paciente.id}`);
        });
      } else if (seccion === 'ficha' || seccion === 'expediente') {
        const paciente = await api.paciente(pacienteId, signal);
        let html = detallePaciente(paciente);
        if (clinica) {
          const expediente = await api.historial(pacienteId, signal);
          const activo = expediente.historial.estado === 'activo';
          html += `<p>Historial: <strong>${escapar(expediente.historial.estado)}</strong></p>`;
          if (activo) html += enlace(`consulta/${pacienteId}`, 'Nueva consulta') + enlace(`archivar/${pacienteId}`, 'Archivar historial');
          else html += `<p>${escapar(expediente.historial.motivoArchivo?.detalle)} · ${escapar(expediente.historial.fechaArchivo)}</p>`;
          html += '<h2>Consultas</h2>' + (expediente.consultas.length ? expediente.consultas.map((consulta) =>
            `<article class="api-consulta"><h3>Consulta ${escapar(consulta.id)} · ${escapar(consulta.fecha)}</h3><p>${escapar(consulta.motivo)}</p><p>${escapar(consulta.observaciones)}</p>` +
            (activo && consulta.estado === 'borrador' ? enlace(`diagnostico/${pacienteId}/${consulta.id}`, 'Agregar diagnóstico') + enlace(`receta/${pacienteId}/${consulta.id}`, 'Emitir receta') : '') +
            '<h4>Diagnósticos y tratamientos</h4>' + (consulta.diagnosticos ?? []).map((d) => `<div><p>${escapar(d.descripcion)} · ${escapar(d.observaciones)}</p>` +
              (activo && consulta.estado === 'borrador' ? enlace(`tratamiento/${pacienteId}/${d.id}`, 'Agregar tratamiento') : '') +
              (d.tratamientos ?? []).map((t) => `<p>${escapar(t.descripcion)} · ${escapar(t.fechaInicio)} — ${escapar(t.fechaFin)} · ${escapar(t.estado)}</p>`).join('') + '</div>').join('') +
            '<h4>Recetas</h4>' + (consulta.recetas ?? []).map((r) => `<p>${escapar(r.indicacionesGenerales)}</p><ul>${r.medicamentos.map((m) =>
              `<li>${escapar(m.nombre)}: ${escapar(m.dosis)} · ${escapar(m.frecuencia)} · ${escapar(m.duracion)} · ${escapar(m.indicaciones)}</li>`).join('')}</ul>`).join('') +
            '<h4>Servicios y piezas dentales</h4><ul>' + (consulta.detallesInstitucion?.servicios ?? []).map((s) =>
              `<li>${escapar(s.nombre)} · Pieza ${escapar(s.piezaDental)} · ${escapar(s.superficie)} · ${escapar(s.precioAplicado)}</li>`).join('') + '</ul></article>').join('') : '<p>No hay consultas registradas.</p>');
        }
        mostrar(clinica ? 'Expediente clínico' : 'Ficha administrativa', html);
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
          campos = campo('motivo', 'Motivo', 'text', true, 'maxlength="250"') + campo('observaciones', 'Observaciones', 'text', false, 'maxlength="500"') +
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
          contenido.querySelector('#agregar-servicio').addEventListener('click', () => {
            const contenedor = contenido.querySelector('#servicios-api');
            if (contenedor.children.length >= 100) return;
            const fila = contenedor.firstElementChild.cloneNode(true);
            fila.querySelectorAll('input, select').forEach((input) => { input.value = ''; });
            const quitar = document.createElement('button');
            quitar.type = 'button'; quitar.className = 'button'; quitar.textContent = 'Quitar servicio';
            quitar.addEventListener('click', () => fila.remove());
            fila.append(quitar); contenedor.append(fila);
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
        const pagina = Math.max(1, Number(parametros.get('pagina')) || 1);
        const filtro = { texto: parametros.get('texto') || '', documento: parametros.get('documento') || '', estado: parametros.get('estado') || '', pagina, limite: 10 };
        const lista = await api.listar(filtro, signal);
        const busqueda = busquedaPacientes();
        const paginar = (numero, etiqueta) => enlace(`pacientes?${new URLSearchParams({ ...filtro, pagina: numero })}`, etiqueta);
        if (!mostrar('Pacientes', busqueda + `<p role="status">${escapar(lista.total)} pacientes</p>` +
          tablaPacientes(lista.items, clinica) +
          `<nav class="route-actions" aria-label="Paginación">${pagina > 1 ? paginar(pagina - 1, 'Anterior') : ''}<span>Página ${escapar(pagina)}</span>${pagina * 10 < lista.total ? paginar(pagina + 1, 'Siguiente') : ''}</nav>`)) return;
        contenido.querySelector('[name="texto"]').value = filtro.texto;
        contenido.querySelector('[name="documento"]').value = filtro.documento;
        contenido.querySelector('[name="estado"]').value = filtro.estado;
        alEnviar('buscar-api', async (datos) => {
          const destino = `pacientes?${new URLSearchParams({ ...datos, pagina: 1 })}`;
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
  const cambiar = () => { renderizar(); contenido.focus(); };
  window.addEventListener('hashchange', cambiar);
  renderizar();
  return () => { version++; controlador?.abort(); window.removeEventListener('hashchange', cambiar); };
}
