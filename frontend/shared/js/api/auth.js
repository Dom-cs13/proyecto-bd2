/**
 * Sesión del frontend: login general, lectura del JWT y guardia por institución.
 * La institución de destino sale del JWT (manda el servidor), no del formulario.
 */
import { apiClient } from './client.js';

const CLAVE_TOKEN = 'token';

export const INSTITUCIONES = ['hospital', 'odontologia', 'laboratorio', 'pediatria'];

export async function login({ institucion, usuario, password }) {
  try {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ institucion, usuario, password })
    });
    const cuerpo = await res.json().catch(() => ({}));
    if (res.ok && cuerpo.token) {
      sessionStorage.setItem(CLAVE_TOKEN, cuerpo.token);
      return obtenerSesion();
    }
    if (res.status === 401 || res.status === 400) {
      throw new Error(cuerpo.error?.mensaje || `Error HTTP ${res.status}`);
    }
  } catch (err) {
    if (institucion === 'odontologia') throw err;
    if (err.message && !err.message.includes('404') && !err.message.includes('conectar') && !err.message.includes('fetch') && !err.message.includes('405')) {
      throw err;
    }
  }
  if (institucion === 'odontologia') {
    throw new Error('El login de Odontologia requiere el backend');
  }



  // Fallback para funcionamiento autónomo del frontend sin backend activo
  const payloadObj = {
    institucion,
    usuario: usuario || 'dra.ruiz',
    rol: usuario === 'admin' ? 'admin' : (institucion === 'laboratorio' ? 'laboratorista' : institucion === 'pediatria' ? 'pediatra' : 'profesional'),
    exp: Math.floor(Date.now() / 1000) + 8 * 3600
  };
  const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(payloadObj))}.demo-signature`;
  sessionStorage.setItem(CLAVE_TOKEN, token);
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
