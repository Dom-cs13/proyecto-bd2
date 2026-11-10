// Componentes puros: no consultan APIs ni toman decisiones de permisos.
export const escapar = (valor) => String(valor ?? '').replace(/[&<>"']/g,
  (caracter) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[caracter]);
export const datoRegistrado = (valor) => valor == null || String(valor).trim() === '' ? 'No registrado' : String(valor);
export const datoSeguro = (valor) => escapar(datoRegistrado(valor));
export const campo = (nombre, etiqueta, tipo = 'text', requerido = true, extra = '') =>
  `<label>${etiqueta}<input name="${nombre}" type="${tipo}" ${requerido ? 'required' : ''} ${extra}></label>`;
export const formulario = (id, campos, texto) => `<form id="${id}" class="api-form">${campos}<button class="button primary" type="submit">${texto}</button></form>`;
export const enlace = (hash, texto) => `<a class="button" href="#${escapar(hash)}">${escapar(texto)}</a>`;
export const selectSimple = (nombre, etiqueta, valores) => `<label>${etiqueta}<select name="${nombre}">${valores.map((v) => `<option value="${escapar(v)}">${escapar(v) || 'Sin especificar'}</option>`).join('')}</select></label>`;

export function registroPaciente() {
  return formulario('registro-api', campo('documentoIdentidad', 'Documento de identidad', 'text', true, 'maxlength="50"') +
    campo('nombre', 'Nombres', 'text', true, 'maxlength="100"') + campo('apellidos', 'Apellidos', 'text', true, 'maxlength="100"') +
    campo('fechaNacimiento', 'Fecha de nacimiento', 'date', true, `max="${new Date().toISOString().slice(0, 10)}"`) +
    '<label>Género<select name="genero" required><option value="">Selecciona</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></label>' +
    campo('telefono', 'Teléfono', 'tel', false, 'maxlength="20"') + campo('correo', 'Correo', 'email', false, 'maxlength="150"') +
    campo('direccion', 'Dirección', 'text', false, 'maxlength="200"'), 'Registrar');
}

export function busquedaPacientes() {
  return formulario('buscar-api', campo('texto', 'Buscar por nombre o apellido', 'search', false) +
    campo('documento', 'Documento exacto', 'search', false, 'maxlength="50"') + selectSimple('estado', 'Estado', ['', 'activo', 'archivado']), 'Buscar');
}

export function detallePaciente(paciente) {
  return `<h2>${datoSeguro(paciente.nombre ?? paciente.nombres)} ${datoSeguro(paciente.apellidos)}</h2><dl class="detail-grid">${[
    ['Expediente', paciente.id], ['Documento', paciente.documentoIdentidad], ['Nacimiento', paciente.fechaNacimiento],
    ['Género', paciente.genero ?? paciente.sexo], ['Teléfono', paciente.telefono], ['Correo', paciente.correo], ['Dirección', paciente.direccion],
  ].map(([nombre, valor]) => `<div><dt>${nombre}</dt><dd>${datoSeguro(valor)}</dd></div>`).join('')}</dl>`;
}

export function tablaPacientes(items, clinica = false) {
  if (!items.length) return '<p>No se encontraron pacientes.</p>';
  return `<div class="api-table"><table><thead><tr><th>Expediente</th><th>Paciente</th><th>Acciones</th></tr></thead><tbody>${items.map((paciente) =>
    `<tr><td>${escapar(paciente.id)}</td><td>${datoSeguro(paciente.nombre ?? paciente.nombres)} ${datoSeguro(paciente.apellidos)}</td><td>${enlace(`${clinica ? 'expediente' : 'ficha'}/${paciente.id}`, clinica ? 'Abrir expediente' : 'Ver ficha')}</td></tr>`).join('')}</tbody></table></div>`;
}
