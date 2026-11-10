/**
 * Cliente HTTP y lector de vistas compartidas
 * Centraliza los fetch permitidos por la regla ESLint de AGENTS.md
 */

// Express sirve interfaz y API desde el mismo origen, también con PORT distinto
// de 3000. Un servidor de vistas separado requiere una base explícita.
const API_BASE = globalThis.ALBA_API_BASE ?? (
  typeof location !== 'undefined' && location.protocol === 'file:' ? 'http://localhost:3000' : ''
);

export async function fetchPlantillaHtml(rutaRelativa) {
  const resp = await fetch(rutaRelativa);
  if (!resp.ok) {
    throw new Error(`Error HTTP ${resp.status} al solicitar ${rutaRelativa}`);
  }
  return await resp.text();
}

export async function apiClient(endpoint, opciones = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('token') : null;

  try {
    const res = await fetch(url, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opciones.headers || {})
      }
    });

    // Una sesión vencida debe volver al login, conservando el aislamiento institucional.
    if (res.status === 401 && endpoint !== '/auth/login') {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('token');
    }

    return res;
  } catch (error) {
    if (API_BASE && error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con el servidor API configurado. Abre la aplicación desde el servidor Express o revisa ALBA_API_BASE.',
        { cause: error }
      );
    }
    throw error;
  }
}

