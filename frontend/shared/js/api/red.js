import { solicitarJson } from './persistencia.js';

export const buscarEnRed = (valor) => solicitarJson(`/red/pacientes?${new URLSearchParams({
  ...(/^\d+$/.test(valor) ? { documento: valor } : { texto: valor }), limite: 100,
})}`);
export const historialEnRed = (institucion, id) => solicitarJson(`/red/${encodeURIComponent(institucion)}/pacientes/${encodeURIComponent(id)}/historial`);
