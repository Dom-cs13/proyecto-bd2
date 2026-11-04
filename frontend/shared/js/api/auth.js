/**
 * Sesión del frontend: login general, lectura del JWT y guardia por institución.
 * La institución de destino sale del JWT (manda el servidor), no del formulario.
 */
import { apiClient } from './client.js';

const CLAVE_TOKEN = 'token';

export const INSTITUCIONES = ['hospital', 'odontologia', 'laboratorio', 'pediatria'];

export async function login({ institucion, usuario, password }) {
  const res = await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ institucion, usuario, password })
  });
  let cuerpo = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Si el backend no tiene implementado /auth/login aun (Fase 1 I1-03) o responde 404 en desarrollo local:
    const esLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (esLocal && (res.status === 404 || res.status === 503)) {
      const payloadFalso = {
        institucion,
        rol: institucion === 'pediatria' ? 'pediatra' : 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const headerB64 = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payloadB64 = btoa(JSON.stringify(payloadFalso));
      const fakeToken = `${headerB64}.${payloadB64}.firmaSimuladaLocal`;
      sessionStorage.setItem(CLAVE_TOKEN, fakeToken);
      return obtenerSesion();
    }
    throw new Error(cuerpo.error?.mensaje || `Error HTTP ${res.status}`);
  }
  sessionStorage.setItem(CLAVE_TOKEN, cuerpo.token);
  return obtenerSesion();
}

export function obtenerSesion() {
  const token = sessionStorage.getItem(CLAVE_TOKEN);
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    if (payload.exp && payload.exp * 1000 < Date.now()) return cerrarSesion();
    return { token, institucion: payload.institucion, rol: payload.rol };
  } catch {
    return cerrarSesion();
  }
}

export function cerrarSesion() {
  sessionStorage.removeItem(CLAVE_TOKEN);
  return null;
}

/** Ruta del frontend de la institución, relativa a `frontend/`. */
export function rutaInstitucion(institucion) {
  return INSTITUCIONES.includes(institucion) ? `${institucion}/index.html` : 'index.html';
}

/**
 * Se llama al cargar cada frontend institucional. Sin sesión vuelve al login general;
 * con sesión de otra institución, la manda a su propio frontend.
 */
export function exigirSesion(institucionDeLaPagina) {
  const sesion = obtenerSesion();
  if (!sesion) {
    location.replace('../index.html');
    return null;
  }
  if (sesion.institucion !== institucionDeLaPagina) {
    location.replace(`../${rutaInstitucion(sesion.institucion)}`);
    return null;
  }
  return sesion;
}
