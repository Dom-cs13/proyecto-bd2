/**
 * Cliente HTTP y lector de vistas compartidas
 * Centraliza los fetch permitidos por la regla ESLint de AGENTS.md
 */

const esDevServer = typeof window !== 'undefined' && (
  location.protocol === 'file:' ||
  (['localhost', '127.0.0.1', '::1'].includes(location.hostname) && Boolean(location.port) && location.port !== '3000')
);

const API_BASE = esDevServer
  ? `http://${location.hostname === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:3000`
  : '';

export async function fetchPlantillaHtml(rutaRelativa) {
  const resp = await fetch(rutaRelativa);
  if (!resp.ok) {
    throw new Error(`Error HTTP ${resp.status} al solicitar ${rutaRelativa}`);
  }
  return await resp.text();
}

export async function apiClient(endpoint, opciones = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(opciones.headers || {})
      },
      ...opciones
    });
    return res;
  } catch (error) {
    if (API_BASE && error instanceof TypeError) {
      throw new Error(
        'No se pudo conectar con el servidor backend (puerto 3000). Asegúrate de iniciar la API con "npm run dev" o abrir la aplicación desde http://localhost:3000',
        { cause: error }
      );
    }
    throw error;
  }
}

