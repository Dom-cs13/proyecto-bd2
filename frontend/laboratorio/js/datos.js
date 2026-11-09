/* ============================================================
   datos.js · Capa de Persistencia y Estado del Laboratorio Clínico
   ============================================================
   Conectado a la API Express y persistencia real en Firestore.
   Cumple con la regla de oro: fetch solo a través de apiClient en shared.
   ============================================================ */

import { solicitarJson } from '../../shared/js/api/persistencia.js';
import {
  GENEROS,
  TIPOS_SANGRE,
  ESTADOS_ORDEN,
  ESTADOS_MUESTRA,
  CONDICIONES_MUESTRA,
  TIPOS_MUESTRA,
  FLAGS_ANORMALIDAD,
  ANTIBIOTICOS,
  MOTIVOS_BAJA,
  TIPOS_LABORATORIO,
} from './catalogo.js';

export {
  GENEROS,
  TIPOS_SANGRE,
  ESTADOS_ORDEN,
  ESTADOS_MUESTRA,
  CONDICIONES_MUESTRA,
  TIPOS_MUESTRA,
  FLAGS_ANORMALIDAD,
  ANTIBIOTICOS,
  MOTIVOS_BAJA,
  TIPOS_LABORATORIO,
};

// Compatibilidad hacia atrás
export const TIPOS = TIPOS_LABORATORIO;
export const ESTADOS = ESTADOS_ORDEN;

export const pacientes = [];
export const examenes = [];
export const muestras = [];

let datosListener = null;
export function registrarListenerActualizacion(fn) {
  datosListener = fn;
}

function adaptarPacienteParaUi(p) {
  const cui = p.documentoIdentidad || p.cui || p.id;
  return {
    id: p.id || cui,
    cui,
    documentoIdentidad: cui,
    nombre: p.nombre,
    apellidos: p.apellidos,
    fechaNacimiento: p.fechaNacimiento?.slice(0, 10) || p.fechaNacimiento,
    genero: p.genero || 'Otro',
    tipoSangre: p.tipoSangre || 'O+',
    telefono: p.telefono || '',
    correo: p.correo || '',
    direccion: p.direccion || '',
    alergias: Array.isArray(p.alergias) ? p.alergias : [],
    activo: p.activo !== false,
    motivoBaja: p.motivoBaja || null,
    fechaBaja: p.fechaBaja || null,
    detallesInstitucion: p.detallesInstitucion || { tipoPaciente: 'ambulatorio', servicioProcedencia: 'Consulta Externa' },
  };
}

function adaptarOrdenParaUi(ord) {
  const primerRes = [...(ord.resultados || [])].sort((a, b) => String(b.fechaResultado).localeCompare(String(a.fechaResultado)))[0] || {};
  return {
    id: ord.id,
    pacienteCui: pacientes.find(p => p.id === ord.pacienteId)?.cui || ord.pacienteId,
    tipo: ord.tipoLaboratorio,
    tipoLaboratorio: ord.tipoLaboratorio,
    fechaSolicitud: ord.fechaSolicitud?.slice(0, 10) || ord.fechaSolicitud,
    fechaResultado: primerRes.fechaResultado?.slice(0, 10) || null,
    medicoSolicitante: ord.medicoSolicitante,
    prioridad: ord.prioridad || 'rutina',
    estado: primerRes.estadoResultado === 'validado' || ord.estadoOrden === 'completada' ? 'completado' : (ord.muestras?.length || primerRes.id ? 'en_proceso' : ord.estadoOrden),
    flagAnormalidad: primerRes.flagAnormalidad || 'normal',
    tecnicoValido: primerRes.tecnicoValido || null,
    fechaValidacion: primerRes.fechaValidacion || null,
    resultados: primerRes.valorResultado || ord.resultados || {},
    muestras: ord.muestras || [],
  };
}

/* ---------- Hidratación ---------- */
function hydrate(data) {
  const cloned = JSON.parse(JSON.stringify(data));
  pacientes.length = 0;
  pacientes.push(...(cloned.pacientes || []));
  examenes.length = 0;
  examenes.push(...(cloned.examenes || []));
  muestras.length = 0;
  muestras.push(...(cloned.muestras || []));
}

export async function cargarEstado() {
  hydrate({ pacientes: [], examenes: [], muestras: [] });
  const [dataPac, ordenes] = await Promise.all([
    solicitarJson('/pacientes?limite=100'), solicitarJson('/laboratorio/ordenes')
  ]);
  pacientes.push(...dataPac.items.map(adaptarPacienteParaUi));
  examenes.push(...ordenes.map(adaptarOrdenParaUi));
  muestras.push(...ordenes.flatMap(o => o.muestras ?? []));
  datosListener?.();
  return 'api';
}

// Compatibilidad con las vistas: no persiste ni sustituye la API.
export function guardarEstado() { return false; }
export function reiniciarDemo() { throw new Error('Demostraci?n no disponible en el portal conectado'); }

export async function crearPacienteApi(datosPaciente) {
  const creado = await solicitarJson('/pacientes', { method: 'POST', body: JSON.stringify(datosPaciente) });
  const paciente = adaptarPacienteParaUi(creado);
  pacientes.push(paciente);
  return paciente;
}

export async function archivarPacienteApi(cui, motivo) {
  const p = buscarPaciente(cui);
  const historial = await solicitarJson(`/pacientes/${encodeURIComponent(p?.id || cui)}/archivar`, {
    method: 'PATCH', body: JSON.stringify({ motivo })
  });
  if (p) Object.assign(p, { activo: false, motivoBaja: historial.motivoArchivo?.detalle, fechaBaja: historial.fechaArchivo });
  return true;
}

export const crearOrdenApi = (datos) => solicitarJson('/laboratorio/ordenes', { method: 'POST', body: JSON.stringify(datos) });
export const registrarMuestraApi = (datos) => solicitarJson('/laboratorio/muestras', { method: 'POST', body: JSON.stringify(datos) });
export const registrarResultadoApi = (datos) => solicitarJson('/laboratorio/resultados', { method: 'POST', body: JSON.stringify(datos) });
/* ---------- Helpers de consulta y generación de claves ---------- */
export const buscarPaciente = (cui) => pacientes.find((p) => p.cui === cui || p.documentoIdentidad === cui || p.id === cui);
export const existeCui = (cui) => pacientes.some((p) => p.cui === cui || p.documentoIdentidad === cui || p.id === cui);
export const nombreDeCui = (cui) => {
  const p = buscarPaciente(cui);
  return p ? `${p.nombre} ${p.apellidos}` : cui;
};

export function generarIdOrden() {
  const nums = examenes
    .map((e) => {
      const m = String(e.id).match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `ORD-${String(max + 1).padStart(4, '0')}`;
}

export function generarCodigoBarras(ordenId, tipoLab) {
  const sub = String(tipoLab || 'EXA').slice(0, 3).toUpperCase();
  return `BAR-${ordenId.replace('ORD-', '')}-${sub}`;
}

export function obtenerMuestrasDeOrden(ordenId) {
  return muestras.filter((m) => m.ordenId === ordenId);
}

export const validarResultadoApi = (id) => solicitarJson(`/laboratorio/resultados/${encodeURIComponent(id)}/validar`, { method: 'PATCH', body: '{}' });
