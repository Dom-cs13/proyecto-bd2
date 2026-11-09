import { escapar } from './pacientes.js';

/**
 * Componente compartido de notificaciones y errores HTTP (I4-10)
 * Formato único de error (AGENTS.md): { error: { codigo, mensaje } }
 * Códigos soportados: 400, 401, 403, 404, 409 (PACIENTE_ARCHIVADO), 503 (MOTOR_NO_DISPONIBLE)
 */

const CATALOGO_CODIGOS_HTTP = {
  400: { codigo: 'VALIDACION_FALLIDA', titulo: 'Datos inválidos (400)' },
  401: { codigo: 'NO_AUTENTICADO', titulo: 'Sesión requerida (401)' },
  403: { codigo: 'ACCESO_DENEGADO', titulo: 'Permiso insuficiente (403)' },
  404: { codigo: 'RECURSO_NO_ENCONTRADO', titulo: 'No encontrado (404)' },
  409: { codigo: 'PACIENTE_ARCHIVADO', titulo: 'Conflicto de estado (409)' },
  503: { codigo: 'MOTOR_NO_DISPONIBLE', titulo: 'Institución no disponible (503)' }
};

function asegurarContenedorToast() {
  let contenedor = document.getElementById('shared-toast-container');
  if (!contenedor) {
    contenedor = document.createElement('div');
    contenedor.id = 'shared-toast-container';
    contenedor.setAttribute('aria-live', 'polite');
    contenedor.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:420px;width:calc(100% - 48px);pointer-events:none;';
    document.body.appendChild(contenedor);
  }
  return contenedor;
}

/**
 * Muestra un error con el formato canónico { error: { codigo, mensaje } }
 * @param {{ status?: number, error?: { codigo?: string, mensaje?: string }, codigo?: string, mensaje?: string }} payload
 */
export function mostrarErrorHttp(payload = {}) {
  const status = payload.status || 400;
  const meta = CATALOGO_CODIGOS_HTTP[status] || CATALOGO_CODIGOS_HTTP[400];
  const codigo = payload.error?.codigo || payload.codigo || meta.codigo;
  const mensaje = payload.error?.mensaje || payload.mensaje || payload.message || 'No se pudo completar la operación solicitada.';

  const contenedor = asegurarContenedorToast();
  const tarjeta = document.createElement('div');
  tarjeta.setAttribute('role', 'alert');
  tarjeta.style.cssText = 'pointer-events:auto;background:#ffffff;border-left:5px solid #fa5c60;border-top:1px solid #f8aba0;border-right:1px solid #f8aba0;border-bottom:1px solid #f8aba0;border-radius:10px;padding:14px 16px;box-shadow:0 8px 24px rgba(46,105,135,0.16);display:flex;align-items:flex-start;gap:12px;color:#1b3d50;font-family:inherit;';

  tarjeta.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa5c60" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <div style="flex:1;font-size:0.82rem;line-height:1.4;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;">
        <strong style="color:#8a2428;font-size:0.84rem;">${meta.titulo}</strong>
        <code style="font-size:0.7rem;background:#ffccc4;color:#7a1f22;padding:2px 6px;border-radius:4px;font-weight:700;">${escapar(codigo)}</code>
      </div>
      <p style="margin:0;color:#2e6987;">${escapar(mensaje)}</p>
    </div>
    <button type="button" aria-label="Cerrar aviso" style="background:none;border:0;color:#58798c;cursor:pointer;padding:2px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const btnCerrar = tarjeta.querySelector('button');
  btnCerrar.addEventListener('click', () => tarjeta.remove());
  contenedor.appendChild(tarjeta);
  setTimeout(() => {
    if (tarjeta.parentNode) tarjeta.remove();
  }, 6000);
}

/**
 * Muestra una notificación de operación exitosa sin usar alert() nativo ni emojis
 * @param {string} titulo
 * @param {string} detalle
 */
export function mostrarNotificacionExito(titulo, detalle = '') {
  const contenedor = asegurarContenedorToast();
  const tarjeta = document.createElement('div');
  tarjeta.setAttribute('role', 'status');
  tarjeta.style.cssText = 'pointer-events:auto;background:#ffffff;border-left:5px solid #4d978c;border-top:1px solid #c2e2dc;border-right:1px solid #c2e2dc;border-bottom:1px solid #c2e2dc;border-radius:10px;padding:14px 16px;box-shadow:0 8px 24px rgba(46,105,135,0.14);display:flex;align-items:flex-start;gap:12px;color:#1b3d50;font-family:inherit;';

  tarjeta.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4d978c" stroke-width="2.2" style="flex-shrink:0;margin-top:2px;" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
    <div style="flex:1;font-size:0.82rem;line-height:1.4;">
      <strong style="color:#2e6987;display:block;margin-bottom:2px;">${titulo}</strong>
      ${detalle ? `<p style="margin:0;color:#58798c;">${detalle}</p>` : ''}
    </div>
    <button type="button" aria-label="Cerrar notificación" style="background:none;border:0;color:#58798c;cursor:pointer;padding:2px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  const btnCerrar = tarjeta.querySelector('button');
  btnCerrar.addEventListener('click', () => tarjeta.remove());
  contenedor.appendChild(tarjeta);
  setTimeout(() => {
    if (tarjeta.parentNode) tarjeta.remove();
  }, 4500);
}
