import { apiPediatria } from '../../shared/js/api/pediatria.js';
import {
  escapar,
  campo,
  formulario,
  selectSimple,
  busquedaPacientes,
  detallePaciente,
  tablaPacientes,
} from '../../shared/js/components/pacientes.js';

const opcionesArchivo = ['traslado', 'fallecimiento', 'administrativo', 'otro'];

export function iniciarPortalPediatria({ sesion, contenido, api = apiPediatria }) {
  const rol = sesion.rol;
  const esPediatra = rol === 'pediatra';
  const esEnfermeria = rol === 'enfermeria';
  const esRecepcion = rol === 'recepcion';

  const navegacion = document.getElementById('navegacion');
  const menu = [
    ['pacientes', 'Pacientes'],
    ['buscador', 'Buscador'],
    ...(!esEnfermeria ? [['registro', 'Registrar menor']] : []),
    ['crecimiento-vacunas', 'Crecimiento y Vacunación'],
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
    mensaje.textContent = error.status === 401 ? 'La sesión terminó. Vuelve al acceso general.' : (error.message || 'Error en la operación');
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

  const ir = (destino) => {
    location.hash = destino;
  };

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
      if (seccion === 'buscador' || (seccion === 'pacientes' && !pacienteId)) {
        const params = new URLSearchParams(query ?? '');
        const filtro = {
          texto: params.get('texto') ?? '',
          documento: params.get('documento') ?? '',
          estado: params.get('estado') ?? '',
          pagina: params.get('pagina') ?? '1',
        };
        const resultado = await api.listar(filtro, signal);
        if (actual !== version) return;

        contenido.innerHTML = `
          <div class="view-buscador-pacientes">
            <div class="section-block">
              <div class="section-header">
                <span class="welcome-badge">Expedientes Pediátricos</span>
                <h1 class="welcome-title">Búsqueda y Directorio de Menores</h1>
                <p class="section-desc">
                  Localiza expedientes infantiles por nombre del niño, número de expediente, documento de identidad o nombre del tutor legal.
                </p>
              </div>
              <div id="search-container" style="margin-bottom: 24px;">
                ${busquedaPacientes()}
              </div>
            </div>
            <div class="section-block">
              <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-direction: row; margin-bottom: 16px;">
                <div>
                  <h2 class="section-title">Expedientes del Centro Pediátrico</h2>
                  <p class="section-desc">Información consolidada de menores, tutores principales y alertas médicas.</p>
                </div>
                ${!esEnfermeria ? `
                  <a id="btn-ir-crear-desde-buscador" class="btn btn-cta btn-sm" href="#registro" style="text-decoration:none;">
                    + Nuevo Menor
                  </a>
                ` : ''}
              </div>
              <p role="status" style="font-size:0.85rem; color:#64748b; margin-bottom:12px;">Total encontrados: <strong>${escapar(resultado.total ?? resultado.items.length)}</strong></p>
              <div id="table-container" class="table-container">
                ${tablaPacientes(resultado.items, !esRecepcion)}
              </div>
            </div>
          </div>
        `;

        const inputTexto = contenido.querySelector('[name="texto"]');
        if (inputTexto) inputTexto.value = filtro.texto;
        const inputDoc = contenido.querySelector('[name="documento"]');
        if (inputDoc) inputDoc.value = filtro.documento;
        const inputEstado = contenido.querySelector('[name="estado"]');
        if (inputEstado) inputEstado.value = filtro.estado;

        alEnviar('buscar-api', async (datos) => {
          const nuevosParams = new URLSearchParams();
          if (datos.texto?.trim()) nuevosParams.set('texto', datos.texto.trim());
          if (datos.documento?.trim()) nuevosParams.set('documento', datos.documento.trim());
          if (datos.estado?.trim()) nuevosParams.set('estado', datos.estado.trim());
          nuevosParams.set('pagina', '1');
          const hashDestino = `${seccion}?${nuevosParams.toString()}`;
          if (location.hash === `#${hashDestino}`) {
            await renderizar();
          } else {
            ir(hashDestino);
          }
        });
        return;
      }

      if (seccion === 'registro') {
        if (esEnfermeria) {
          contenido.innerHTML = '<p role="alert">Solo recepción y pediatras pueden registrar pacientes.</p>';
          return;
        }

        const camposRegistro = `
          ${campo('documentoIdentidad', 'Documento de identidad', 'text', true, 'maxlength="50"')}
          ${campo('nombre', 'Nombres', 'text', true, 'maxlength="100"')}
          ${campo('apellidos', 'Apellidos', 'text', true, 'maxlength="100"')}
          ${campo('fechaNacimiento', 'Fecha de nacimiento', 'date', true, `max="${new Date().toISOString().slice(0, 10)}"`)}
          <label>Género
            <select name="genero" required>
              <option value="">Selecciona</option>
              <option>Femenino</option>
              <option>Masculino</option>
              <option>Otro</option>
            </select>
          </label>
          ${campo('telefono', 'Teléfono', 'tel', false, 'maxlength="20"')}
          ${campo('correo', 'Correo', 'email', false, 'maxlength="150"')}
          ${campo('direccion', 'Dirección', 'text', false, 'maxlength="200"')}
          <fieldset style="margin-top: 15px; padding: 12px; border: 1px solid #ccc; border-radius: 6px;">
            <legend><strong>Datos del Tutor Principal (Requerido)</strong></legend>
            ${campo('tutorDpi', 'DPI / Documento del Tutor', 'text', true)}
            ${campo('tutorNombres', 'Nombres del Tutor', 'text', true)}
            ${campo('tutorApellidos', 'Apellidos del Tutor', 'text', true)}
            ${campo('tutorParentesco', 'Parentesco', 'text', false, 'placeholder="Madre, Padre, Tutor legal"')}
            ${campo('tutorTelefono', 'Teléfono de Contacto', 'tel', false)}
          </fieldset>
        `;

        contenido.innerHTML = `
          <h2>Alta de Menor y Tutor Legal</h2>
          ${formulario('form-registro-pediatrico', camposRegistro, 'Registrar en MariaDB')}
        `;

        const registrarSubmit = async (datos) => {
          const payload = {
            nombres: datos.nombres || datos.nombre,
            apellidos: datos.apellidos,
            fechaNacimiento: datos.fechaNacimiento,
            sexo: datos.sexo || (datos.genero === 'Femenino' ? 'F' : 'M'),
            documento: datos.documento || datos.documentoIdentidad || null,
            telefono: datos.telefono || null,
            correo: datos.correo || null,
            direccion: datos.direccion || null,
            detallesInstitucion: {
              tutorPrincipal: {
                dpi: datos.tutorDpi || datos.documento || '',
                nombres: datos.tutorNombres || datos.tutorNombre || '',
                apellidos: datos.tutorApellidos || datos.apellidos || '',
                parentesco: datos.tutorParentesco || 'Tutor',
                telefono: datos.tutorTelefono || '',
              },
            },
          };
          const creado = await api.registrar(payload);
          ir(`pacientes/${creado.id}`);
        };

        alEnviar('form-registro-pediatrico', registrarSubmit);
        alEnviar('registro-api', registrarSubmit);
        return;
      }

      if ((seccion === 'pacientes' || seccion === 'expediente' || seccion === 'ficha') && pacienteId) {
        const [paciente, historial] = await Promise.all([
          api.paciente(pacienteId, signal),
          esRecepcion ? null : api.historial(pacienteId, signal).catch(() => null),
        ]);
        if (actual !== version) return;

        const tutor = paciente.detallesInstitucion?.tutorPrincipal;
        const controles = paciente.detallesInstitucion?.controlesCrecimiento ?? [];
        const vacunas = paciente.detallesInstitucion?.vacunasAplicadas ?? [];

        contenido.innerHTML = `
          <h2>Expediente Pediátrico: ${escapar(paciente.nombres || paciente.nombre)} ${escapar(paciente.apellidos)}</h2>
          ${detallePaciente(paciente)}
          <div class="panel-tutor" style="margin-top: 12px; padding: 12px; background: #f9fbfd; border-radius: 6px; border: 1px solid #e2e8f0;">
            <h3>Tutor Principal</h3>
            <p><strong>Nombre:</strong> ${escapar(tutor?.nombre || tutor?.nombres || 'No asignado')}</p>
            <p><strong>DPI:</strong> ${escapar(tutor?.documento || tutor?.dpi || 'N/A')} · <strong>Parentesco:</strong> ${escapar(tutor?.parentesco || 'N/A')}</p>
          </div>

          <div style="margin-top: 20px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
            <a href="#crecimiento-vacunas?paciente=${escapar(pacienteId)}" class="button primary" style="text-decoration:none;">
              Ver Crecimiento y Carnet de Vacunas
            </a>
            <a href="#buscador" class="button" style="text-decoration:none;">
              Volver al Directorio
            </a>
          </div>

          <div style="margin-top: 20px;">
            <h3>Crecimiento (${controles.length} registros)</h3>
            ${controles.length === 0 ? '<p>Sin registros de crecimiento.</p>' : `
              <ul>
                ${controles.map((c) => `<li>${escapar(c.fecha || c.fechaMedicion)}: Peso ${c.pesoKg} kg, Talla ${c.tallaCm || c.estaturaCm || 'N/A'} cm</li>`).join('')}
              </ul>
            `}
          </div>

          <div style="margin-top: 20px;">
            <h3>Vacunación (${vacunas.length} dosis)</h3>
            ${vacunas.length === 0 ? '<p>Sin vacunas aplicadas.</p>' : `
              <ul>
                ${vacunas.map((v) => `<li>Dosis #${v.numeroDosis || v.dosis || 1}: Vacuna ${escapar(v.nombreVacuna || v.vacunaId)} (Lote: ${escapar(v.lote || 'N/A')})</li>`).join('')}
              </ul>
            `}
          </div>

          ${esPediatra && historial?.historial?.estado === 'activo' ? `
            <div style="margin-top: 25px; padding: 15px; border-top: 1px solid #eee;">
              <h3>Archivado Formal de Expediente</h3>
              ${formulario('form-archivar-paciente', `
                ${selectSimple('tipoMotivo', 'Tipo de motivo', opcionesArchivo)}
                ${campo('detalleMotivo', 'Detalle de la causal', 'text', true)}
              `, 'Archivar expediente')}
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

      if (seccion === 'crecimiento-vacunas' || seccion === 'crecimiento' || seccion === 'vacunas') {
        const params = new URLSearchParams(query ?? '');
        const idParam = params.get('paciente') || params.get('id') || pacienteId;

        const lista = await api.listar({ estado: 'activo', limite: 50 }, signal);
        if (actual !== version) return;

        if (!lista.items || lista.items.length === 0) {
          contenido.innerHTML = `
            <div class="view-crecimiento-vacunas">
              <h2>Control de Crecimiento y Carnet de Vacunación</h2>
              <p>No se encontraron pacientes activos registrados en el sistema.</p>
            </div>
          `;
          return;
        }

        const idActivo = (idParam && lista.items.some((p) => String(p.id) === String(idParam)))
          ? idParam
          : lista.items[0].id;

        const [paciente, catalogos] = await Promise.all([
          api.paciente(idActivo, signal),
          api.catalogos(signal).catch(() => ({ vacunas: [], medicamentos: [] })),
        ]);
        if (actual !== version) return;

        const tutor = paciente.detallesInstitucion?.tutorPrincipal;
        const controles = paciente.detallesInstitucion?.controlesCrecimiento ?? [];
        const vacunas = paciente.detallesInstitucion?.vacunasAplicadas ?? [];
        const alergias = paciente.detallesInstitucion?.alergias ?? [];
        const ultimo = controles[0];
        const puedeEscribir = esPediatra || esEnfermeria;
        const esArchivado = paciente.historial?.estado === 'archivado';

        contenido.innerHTML = `
          <div class="view-crecimiento-vacunas">
            <div class="section-block">
              <div class="section-header">
                <span class="welcome-badge">Salud Preventiva · Control Antropométrico e Inmunizaciones</span>
                <h1 class="welcome-title">Control de Crecimiento y Carnet de Vacunación</h1>
                <p class="section-desc">
                  Seguimiento de curvas de desarrollo (peso, talla, perímetro cefálico) y registro del esquema oficial de vacunas del menor.
                </p>
              </div>

              <div style="background-color: var(--bg-card, #ffffff); padding: 18px 22px; border-radius: 12px; border: 1px solid #dbe7ec; display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <div style="width: 42px; height: 42px; border-radius: 8px; background-color: #e6f3f8; color: #2e6987; display: flex; align-items: center; justify-content: center; font-weight: 700;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="7" r="4"/><path d="M5.5 21v-2a6.5 6.5 0 0 1 13 0v2"/></svg>
                  </div>
                  <div>
                    <label for="sel-paciente-crecimiento" style="font-size: 0.74rem; font-weight: 700; color: #64748b; text-transform: uppercase;">Seleccionar Menor:</label>
                    <select id="sel-paciente-crecimiento" class="form-control" style="font-weight: 700; color: #2e6987; min-width: 260px; margin-top: 3px;">
                      ${lista.items.map((p) => `
                        <option value="${escapar(p.id)}" ${String(p.id) === String(idActivo) ? 'selected' : ''}>
                          ${escapar(p.nombres || p.nombre)} ${escapar(p.apellidos)} (${escapar(p.id)})
                        </option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <div style="display: flex; gap: 10px;">
                  ${puedeEscribir && !esArchivado ? `
                    <button id="btn-nuevo-control-antropo" class="btn btn-cta btn-sm" type="button">
                      <span>Registrar Control</span>
                    </button>
                    <button id="btn-nueva-vacuna-aplicada" class="btn btn-secondary btn-sm" type="button">
                      <span>Aplicar Vacuna</span>
                    </button>
                  ` : ''}
                </div>
              </div>
            </div>

            <div id="crecimiento-vacunas-container">
              <div class="kpi-card" style="margin-bottom: 24px; padding: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                  <div>
                    <h2 style="margin: 0; color: #2e6987;">${escapar(paciente.nombres || paciente.nombre)} ${escapar(paciente.apellidos)}</h2>
                    <p style="margin: 4px 0 0; color: #64748b; font-size: 0.85rem;">
                      Expediente: <strong>${escapar(paciente.id)}</strong> · Nacimiento: <strong>${escapar(paciente.fechaNacimiento)}</strong> · Tutor: <strong>${escapar(tutor?.nombres || tutor?.nombre || 'N/A')} (${escapar(tutor?.parentesco || 'Tutor')})</strong>
                    </p>
                  </div>
                  ${alergias.length > 0 ? `
                    <div style="background-color: #fee2e2; border: 1px solid #fca5a5; padding: 6px 12px; border-radius: 6px; color: #991b1b; font-size: 0.82rem; font-weight: 700;">
                      Alergia: ${alergias.map((a) => escapar(typeof a === 'string' ? a : `${a.alergeno || a.nombre} (${a.severidad || 'media'})`)).join(', ')}
                    </div>
                  ` : `
                    <span style="font-size:0.82rem; color: #166534; background:#dcfce7; padding:4px 10px; border-radius:6px;">Sin alergias críticas</span>
                  `}
                </div>
              </div>

              <!-- Resumen Antropométrico Actual -->
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 1.3rem; font-weight: 800; color: #2e6987;">${ultimo?.pesoKg != null ? `${ultimo.pesoKg} kg` : '--'}</div>
                  <div style="font-size: 0.75rem; color: #64748b;">Peso Corporal</div>
                </div>
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 1.3rem; font-weight: 800; color: #2e6987;">${ultimo?.tallaCm != null || ultimo?.estaturaCm != null ? `${ultimo.tallaCm || ultimo.estaturaCm} cm` : '--'}</div>
                  <div style="font-size: 0.75rem; color: #64748b;">Talla / Estatura</div>
                </div>
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 1.3rem; font-weight: 800; color: #2e6987;">${ultimo?.perimetroCefalicoCm != null ? `${ultimo.perimetroCefalicoCm} cm` : '--'}</div>
                  <div style="font-size: 0.75rem; color: #64748b;">Perímetro Cefálico</div>
                </div>
                <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                  <div style="font-size: 1.3rem; font-weight: 800; color: #2e6987;">${ultimo?.imc != null ? ultimo.imc : (ultimo?.pesoKg && ultimo?.tallaCm ? (ultimo.pesoKg / Math.pow(ultimo.tallaCm / 100, 2)).toFixed(1) : '--')}</div>
                  <div style="font-size: 0.75rem; color: #64748b;">IMC</div>
                </div>
              </div>

              <!-- Tabla Histórica de Crecimiento -->
              <div style="margin-bottom: 30px;">
                <h3>Historial de Mediciones Antropométricas (${controles.length})</h3>
                ${controles.length === 0 ? '<p>No hay mediciones registradas.</p>' : `
                  <div class="api-table" style="overflow-x: auto;">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Edad (Meses)</th>
                          <th>Peso (kg)</th>
                          <th>Talla (cm)</th>
                          <th>P. Cefálico (cm)</th>
                          <th>IMC</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${controles.map((c) => `
                          <tr>
                            <td><strong>${escapar(c.fecha || c.fechaMedicion)}</strong></td>
                            <td>${c.edadMeses != null ? `${c.edadMeses} m` : 'N/A'}</td>
                            <td><strong>${c.pesoKg} kg</strong></td>
                            <td>${c.tallaCm || c.estaturaCm || 'N/A'} cm</td>
                            <td>${c.perimetroCefalicoCm ? `${c.perimetroCefalicoCm} cm` : 'N/A'}</td>
                            <td>${c.imc || (c.pesoKg && c.tallaCm ? (c.pesoKg / Math.pow(c.tallaCm / 100, 2)).toFixed(1) : 'N/A')}</td>
                            <td style="font-size:0.8rem; color:#64748b;">${escapar(c.observaciones || '')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>

              <!-- Carnet de Vacunación -->
              <div style="margin-bottom: 30px;">
                <h3>Carnet Oficial de Vacunación (${vacunas.length} dosis)</h3>
                ${vacunas.length === 0 ? '<p>No hay vacunas aplicadas registradas.</p>' : `
                  <div class="api-table" style="overflow-x: auto;">
                    <table>
                      <thead>
                        <tr>
                          <th>Dosis</th>
                          <th>Vacuna</th>
                          <th>Fecha Aplicación</th>
                          <th>Lote</th>
                          <th>Responsable / Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${vacunas.map((v) => `
                          <tr>
                            <td><strong>Dosis #${v.numeroDosis || v.dosis || 1}</strong></td>
                            <td><strong>${escapar(v.nombreVacuna || v.vacunaId)}</strong></td>
                            <td>${escapar(v.fechaAplicacion || v.fecha || 'N/A')}</td>
                            <td><code>${escapar(v.lote || 'N/A')}</code></td>
                            <td style="font-size:0.8rem; color:#64748b;">${escapar(v.responsable || v.reaccionAdversa || v.observaciones || 'Aplicada')}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>

              ${puedeEscribir && !esArchivado ? `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px;">
                  <!-- Formulario Registro de Crecimiento -->
                  <div style="background: white; border: 1px solid #dbe7ec; border-radius: 8px; padding: 18px;">
                    <h4 style="margin-top:0;">Registrar Control Antropométrico</h4>
                    ${formulario('form-registrar-crecimiento', `
                      ${campo('pesoKg', 'Peso Corporal (kg)', 'number', true, 'step="0.01" min="0.1" max="300"')}
                      ${campo('tallaCm', 'Talla / Estatura (cm)', 'number', true, 'step="0.1" min="10" max="250"')}
                      ${campo('perimetroCefalicoCm', 'Perímetro Cefálico (cm)', 'number', false, 'step="0.1" min="10" max="100"')}
                      ${campo('edadMeses', 'Edad en Meses', 'number', false, 'min="0" max="240"')}
                      ${campo('observaciones', 'Observaciones del Desarrollo', 'text', false, 'maxlength="500"')}
                    `, 'Guardar Control')}
                  </div>

                  <!-- Formulario Aplicación de Vacuna -->
                  <div style="background: white; border: 1px solid #dbe7ec; border-radius: 8px; padding: 18px;">
                    <h4 style="margin-top:0;">Registrar Aplicación de Vacuna</h4>
                    ${formulario('form-aplicar-vacuna', `
                      <label>Vacuna Oficial
                        <select name="vacunaId" required>
                          <option value="">-- Seleccionar Vacuna --</option>
                          ${(catalogos.vacunas || []).map((v) => `
                            <option value="${escapar(v.id)}">${escapar(v.nombre)} (${v.dosisRequeridas || 1} dosis)</option>
                          `).join('')}
                        </select>
                      </label>
                      ${campo('numeroDosis', 'Número de Dosis', 'number', true, 'min="1" max="10" value="1"')}
                      ${campo('lote', 'Número de Lote Biológico', 'text', true, 'maxlength="80" value="L-VAC-01"')}
                      ${campo('fechaAplicacion', 'Fecha de Aplicación', 'date', false, `value="${new Date().toISOString().slice(0, 10)}"`)}
                      ${campo('observaciones', 'Observaciones / Reacción', 'text', false, 'maxlength="500"')}
                    `, 'Registrar Dosis')}
                  </div>
                </div>
              ` : esArchivado ? `
                <div style="padding: 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; color: #9f1239; margin-top: 18px;">
                  <strong>Expediente archivado:</strong> No es posible registrar nuevos controles ni vacunas en este menor.
                </div>
              ` : `
                <div style="padding: 12px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; color: #166534; margin-top: 18px;">
                  <strong>Modo consulta:</strong> Vista de solo lectura. Se requiere rol de Pediatra o Enfermería para registrar nuevos controles o vacunas.
                </div>
              `}
            </div>
          </div>
        `;

        const sel = contenido.querySelector('#sel-paciente-crecimiento');
        sel?.addEventListener('change', (e) => {
          ir(`crecimiento-vacunas?paciente=${e.target.value}`);
        });

        if (puedeEscribir && !esArchivado) {
          alEnviar('form-registrar-crecimiento', async (datos) => {
            const payload = {
              pesoKg: Number(datos.pesoKg),
              tallaCm: Number(datos.tallaCm),
            };
            if (datos.perimetroCefalicoCm) payload.perimetroCefalicoCm = Number(datos.perimetroCefalicoCm);
            if (datos.edadMeses) payload.edadMeses = Number(datos.edadMeses);
            if (datos.observaciones?.trim()) payload.observaciones = datos.observaciones.trim();

            await api.crecimiento(idActivo, payload);
            renderizar();
          });

          alEnviar('form-aplicar-vacuna', async (datos) => {
            const payload = {
              vacunaId: String(datos.vacunaId),
              numeroDosis: Number(datos.numeroDosis) || 1,
              lote: datos.lote?.trim() || 'LOTE-DEFAULT',
            };
            if (datos.fechaAplicacion) payload.fechaAplicacion = datos.fechaAplicacion;
            if (datos.observaciones?.trim()) payload.observaciones = datos.observaciones.trim();

            await api.vacuna(idActivo, payload);
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
      if (actual === version && error.name !== 'AbortError') aviso(error);
    }
  }

  window.addEventListener('hashchange', renderizar);
  renderizar();

  return () => {
    version++;
    controlador?.abort();
    window.removeEventListener('hashchange', renderizar);
  };
}
