import { apiClient } from './client.js';

export async function solicitarJson(ruta, opciones) {
  const respuesta = await apiClient(ruta, opciones);
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos?.error?.mensaje || `Error HTTP ${respuesta.status}`);
  return datos;
}
