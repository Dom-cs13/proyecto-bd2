import { apiPediatria } from '../../shared/js/api/pediatria.js';
import { escapar, campo, formulario, enlace, selectSimple, registroPaciente, busquedaPacientes, detallePaciente, tablaPacientes } from '../../shared/js/components/pacientes.js';

const opcionesArchivo = ['traslado', 'fallecimiento', 'administrativo', 'otro'];

export function iniciarPortalPediatria({ sesion, contenido, api = apiPediatria }) {
  const rol = sesion.rol;
  const esPediatra = rol === 'pediatra';
  const esEnfermeria = rol === 'enfermeria';
  const esRecepcion = rol === 'recepcion';

  const navegacion = document.getElementById('navegacion');
  const menu = [
    ['pacientes', 'Pacientes'],
    ...(!esEnfermeria ? [['registro', 'Registrar menor']] : []),
    ['catalogos', 'Catálogos'],
    ['estado', 'Estado del servicio'],
  ];

  if (navegacion) {
    navegacion.innerHTML = menu.map(([hash, texto]) => `<a class="nav-link" href="#${hash}">${texto}</a>`).join('');
  }

  const rolElem = document.getElementById('rol-actual');
  if (rolElem) {
    rolElem.textContent = esPediatra ? 'Pediatra' : esEnfermeria ? 'Enfermería' : 'Recepción';
  }

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
      if (submit) submit.disabled = true;
      const actual = version;
      try {
        await accion(Object.fromEntries(new FormData(form)));
      } catch (error) {
        if (actual === version) aviso(error);
      } finally {
        delete form.dataset.enviando;
        if (submit) submit.disabled = false;
      }
    });
  }

  async function renderizar() {
    const actual = ++version;
    controlador?.abort();
    controlador = new AbortController();
    const signal = controlador.signal;
    const [ruta, query] = (location.hash.slice(1) || 'pacientes').split('?');
    const [seccion, pacienteId] = ruta.split('/');

    contenido.innerHTML = '<p role="status">Cargando…</p>';
    if (navegacion) {
      navegacion.querySelectorAll('a').forEach((a) => {
        if (a.hash === `#${seccion}`) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
    }

    try {
      if (seccion === 'pacientes') {
        const params = new URLSearchParams(query ?? '');
        const filtro = {
          texto: params.get('texto') ?? '',
          estado: params.get('estado') ?? '',
          pagina: params.get('pagina') ?? '1',
        };
        const resultado = await api.listar(filtro, signal);
        if (actual !== version) return;

        contenido.innerHTML = `
          <h2>Directorio de Menores Pediátricos</h2>
          ${busquedaPacientes(filtro)}
          ${tablaPacientes(resultado.items, {
            enlaceDetalle: (p) => enlace(`#pacientes/${escapar(p.id)}`, 'Ver expediente'),
          })}
        `;
        return;
      }

      if (seccion === 'registro') {
        if (esEnfermeria) {
          contenido.innerHTML = '<p role="alert">Solo recepción y pediatras pueden registrar pacientes.</p>';
          return;
        }

        contenido.innerHTML = `
          <h2>Alta de Menor y Tutor Legal</h2>
          ${formulario('form-registro-pediatrico', `
            ${registroPaciente()}
            <fieldset style="margin-top: 15px; padding: 12px; border: 1px solid #ccc; border-radius: 6px;">
              <legend><strong>Datos del Tutor Principal (Requerido)</strong></legend>
              ${campo('tutorDpi', 'DPI / Documento del Tutor', 'text', { required: true })}
              ${campo('tutorNombres', 'Nombres del Tutor', 'text', { required: true })}
              ${campo('tutorApellidos', 'Apellidos del Tutor', 'text', { required: true })}
              ${campo('tutorParentesco', 'Parentesco', 'text', { placeholder: 'Madre, Padre, Tutor legal' })}
              ${campo('tutorTelefono', 'Teléfono de Contacto', 'tel')}
            </fieldset>
            <button type="submit" class="btn btn-primary" style="margin-top: 15px;">Registrar en MariaDB</button>
          `)}
        `;

        alEnviar('form-registro-pediatrico', async (datos) => {
          const payload = {
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            fechaNacimiento: datos.fechaNacimiento,
            sexo: datos.sexo,
            documento: datos.documento || null,
            telefono: datos.telefono || null,
            correo: datos.correo || null,
            direccion: datos.direccion || null,
            detallesInstitucion: {
              tutorPrincipal: {
                dpi: datos.tutorDpi,
                nombres: datos.tutorNombres,
                apellidos: datos.tutorApellidos,
                parentesco: datos.tutorParentesco || 'Tutor',
                telefono: datos.tutorTelefono || '',
              },
            },
          };
          const creado = await api.registrar(payload);
          location.hash = `#pacientes/${creado.id}`;
        });
        return;
      }

      if (seccion === 'pacientes' && pacienteId) {
        const [paciente, historial] = await Promise.all([
          api.paciente(pacienteId, signal),
          esRecepcion ? null : api.historial(pacienteId, signal).catch(() => null),
        ]);
        if (actual !== version) return;

        const tutor = paciente.detallesInstitucion?.tutorPrincipal;
        const controles = paciente.detallesInstitucion?.controlesCrecimiento ?? [];
        const vacunas = paciente.detallesInstitucion?.vacunasAplicadas ?? [];

        contenido.innerHTML = `
          <h2>Expediente Pediátrico: ${escapar(paciente.nombres)} ${escapar(paciente.apellidos)}</h2>
          ${detallePaciente(paciente)}
          <div class="panel-tutor" style="margin-top: 12px; padding: 12px; background: #f9fbfd; border-radius: 6px;">
            <h3>Tutor Principal</h3>
            <p><strong>Nombre:</strong> ${escapar(tutor?.nombre || tutor?.nombres || 'No asignado')}</p>
            <p><strong>DPI:</strong> ${escapar(tutor?.documento || tutor?.dpi || 'N/A')} · <strong>Parentesco:</strong> ${escapar(tutor?.parentesco || 'N/A')}</p>
          </div>

          <div style="margin-top: 20px;">
            <h3>Crecimiento (${controles.length} registros)</h3>
            <ul>
              ${controles.map((c) => `<li>${c.fecha}: Peso ${c.pesoKg} kg, Talla ${c.tallaCm || c.estaturaCm || 'N/A'} cm</li>`).join('')}
            </ul>
          </div>

          <div style="margin-top: 20px;">
            <h3>Vacunación (${vacunas.length} dosis)</h3>
            <ul>
              ${vacunas.map((v) => `<li>Dosis #${v.numeroDosis || v.dosis}: Vacuna ${v.nombreVacuna || v.vacunaId} (Lote: ${v.lote || 'N/A'})</li>`).join('')}
            </ul>
          </div>

          ${esPediatra && historial?.historial?.estado === 'activo' ? `
            <div style="margin-top: 25px; padding: 15px; border-top: 1px solid #eee;">
              <h3>Archivado Formal de Expediente</h3>
              ${formulario('form-archivar-paciente', `
                ${selectSimple('tipoMotivo', 'Tipo de motivo', opcionesArchivo)}
                ${campo('detalleMotivo', 'Detalle de la causal', 'text', { required: true })}
                <button type="submit" class="btn btn-danger">Archivar expediente</button>
              `)}
            </div>
          ` : ''}
        `;

        if (esPediatra) {
          alEnviar('form-archivar-paciente', async (datos) => {
            await api.archivar(pacienteId, {
              tipo: datos.tipoMotivo,
              detalle: datos.detalleMotivo,
            });
            renderizar();
          });
        }
        return;
      }

      if (seccion === 'catalogos') {
        const catalogos = await api.catalogos(signal);
        if (actual !== version) return;
        contenido.innerHTML = `
          <h2>Catálogos Clínicos Pediátricos</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h3>Vacunas Oficiales (${catalogos.vacunas.length})</h3>
              <ul>${catalogos.vacunas.map((v) => `<li><strong>${escapar(v.nombre)}</strong>: ${escapar(v.descripcion || '')} (${v.dosisRequeridas || 1} dosis)</li>`).join('')}</ul>
            </div>
            <div>
              <h3>Medicamentos Pediátricos (${catalogos.medicamentos.length})</h3>
              <ul>${catalogos.medicamentos.map((m) => `<li><strong>${escapar(m.nombre)}</strong> (${escapar(m.presentacion || '')})</li>`).join('')}</ul>
            </div>
          </div>
        `;
        return;
      }

      if (seccion === 'estado') {
        const status = await api.estado(signal);
        if (actual !== version) return;
        contenido.innerHTML = `
          <h2>Estado del Motor de Pediatría</h2>
          <div style="padding: 15px; background: #eef9f1; border: 1px solid #48c774; border-radius: 6px;">
            <p><strong>Motor:</strong> ${escapar(status.motor)}</p>
            <p><strong>Estado:</strong> ${status.ok ? 'En línea' : 'Desconectado'}</p>
            <p><strong>Latencia:</strong> ${status.latenciaMs} ms</p>
          </div>
        `;
        return;
      }

      contenido.innerHTML = '<p>Página no encontrada.</p>';
    } catch (error) {
      if (actual === version) aviso(error);
    }
  }

  window.addEventListener('hashchange', renderizar);
  renderizar();

  return () => {
    controlador?.abort();
    window.removeEventListener('hashchange', renderizar);
  };
}
