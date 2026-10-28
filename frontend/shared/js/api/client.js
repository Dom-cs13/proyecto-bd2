/**
 * Cliente HTTP y lector de vistas compartidas
 * Centraliza los fetch permitidos por la regla ESLint de AGENTS.md
 */

export async function fetchPlantillaHtml(rutaRelativa) {
  const resp = await fetch(rutaRelativa);
  if (!resp.ok) {
    throw new Error(`Error HTTP ${resp.status} al solicitar ${rutaRelativa}`);
  }
  return await resp.text();
}

export async function apiClient(endpoint, opciones = {}) {
  const res = await fetch(endpoint, {
    headers: {
      'Content-Type': 'application/json',
      ...(opciones.headers || {})
    },
    ...opciones
  });
  return res;
}

