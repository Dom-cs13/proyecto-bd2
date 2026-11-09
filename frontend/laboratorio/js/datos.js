/* ============================================================
   datos.js · Capa de Persistencia y Estado del Laboratorio Clínico
   ============================================================
   Conectado a la API Express y persistencia real en Firestore.
   Cumple con la regla de oro: fetch solo a través de apiClient en shared.
   ============================================================ */

import { apiClient } from '../../shared/js/api/client.js';
import { obtenerSesion } from '../../shared/js/api/auth.js';
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

const STORAGE_KEY = 'lab-clinico:demo:v2';

/* ---------- Datos semilla con los 8 tipos de laboratorio (Fallback local) ---------- */
const SEED_PACIENTES = [
  {
    cui: '2987654320101',
    documentoIdentidad: '2987654320101',
    nombre: 'Mariana',
    apellidos: 'Soto Hernández',
    fechaNacimiento: '1992-04-18',
    genero: 'Femenino',
    tipoSangre: 'O+',
    telefono: '+502 5555 1234',
    correo: 'mariana.soto@correo.gt',
    direccion: 'Zona 1, Quetzaltenango',
    alergias: ['Penicilina'],
    activo: true,
    detallesInstitucion: { tipoPaciente: 'ambulatorio', servicioProcedencia: 'Consulta Externa' },
  },
  {
    cui: '2456789010901',
    documentoIdentidad: '2456789010901',
    nombre: 'Carlos',
    apellidos: 'Pérez López',
    fechaNacimiento: '1985-11-02',
    genero: 'Masculino',
    tipoSangre: 'A+',
    telefono: '+502 4444 9876',
    correo: 'carlos.perez@correo.gt',
    direccion: 'Zona 3, Quetzaltenango',
    alergias: [],
    activo: true,
    detallesInstitucion: { tipoPaciente: 'hospitalizado', servicioProcedencia: 'Medicina Interna' },
  },
  {
    cui: '3012345670901',
    documentoIdentidad: '3012345670901',
    nombre: 'Ana Lucía',
    apellidos: 'Ramírez Díaz',
    fechaNacimiento: '2015-07-09',
    genero: 'Femenino',
    tipoSangre: 'B+',
    telefono: '+502 5511 2233',
    correo: 'tutor.ramirez@correo.gt',
    direccion: 'Salcajá, Quetzaltenango',
    alergias: ['Látex'],
    activo: true,
    detallesInstitucion: { tipoPaciente: 'emergencia', servicioProcedencia: 'Emergencia Pediátrica' },
  },
  {
    cui: '1987654320901',
    documentoIdentidad: '1987654320901',
    nombre: 'Jorge',
    apellidos: 'Tzoc Xicay',
    fechaNacimiento: '1970-01-25',
    genero: 'Masculino',
    tipoSangre: 'AB+',
    telefono: '+502 3333 2211',
    correo: '',
    direccion: 'Olintepeque, Quetzaltenango',
    alergias: ['Sulfas', 'Polen'],
    activo: false,
    motivoBaja: 'Traslado a otra institución',
    fechaBaja: '2026-09-12',
    detallesInstitucion: { tipoPaciente: 'ambulatorio', servicioProcedencia: 'Traslado' },
  },
];

const SEED_MUESTRAS = [
  {
    id: 'MUE-0001',
    ordenId: 'ORD-0001',
    codigoBarras: 'BAR-0001-HEM',
    tipoMuestra: 'sangre_venosa',
    fechaToma: '2026-10-26T08:00:00.000Z',
    condicionMuestra: 'optima',
    estadoMuestra: 'completada',
  },
  {
    id: 'MUE-0002',
    ordenId: 'ORD-0002',
    codigoBarras: 'BAR-0002-URI',
    tipoMuestra: 'orina',
    fechaToma: '2026-10-27T09:00:00.000Z',
    condicionMuestra: 'optima',
    estadoMuestra: 'completada',
  },
  {
    id: 'MUE-0003',
    ordenId: 'ORD-0003',
    codigoBarras: 'BAR-0003-MIC',
    tipoMuestra: 'orina',
    fechaToma: '2026-10-28T10:00:00.000Z',
    condicionMuestra: 'optima',
    estadoMuestra: 'en_proceso',
  },
];

const SEED_EXAMENES = [
  {
    id: 'ORD-0001',
    pacienteCui: '2987654320101',
    tipo: 'hematologia',
    tipoLaboratorio: 'hematologia',
    fechaSolicitud: '2026-10-26',
    fechaResultado: '2026-10-27',
    medicoSolicitante: 'Dr. Rodrigo Palma',
    prioridad: 'rutina',
    estado: 'completado',
    flagAnormalidad: 'normal',
    tecnicoValido: 'Dra. Sofía Cordero',
    fechaValidacion: '2026-10-27T10:00:00.000Z',
    resultados: {
      hemoglobina: 13.5,
      hematocrito: 41,
      eritrocitos: 4.5,
      leucocitos: 6800,
      plaquetas: 240000,
      neutrofilos_pct: 60,
      linfocitos_pct: 32,
      vcm: 89,
      hcm: 29,
    },
  },
  {
    id: 'ORD-0002',
    pacienteCui: '2456789010901',
    tipo: 'urianalisis',
    tipoLaboratorio: 'urianalisis',
    fechaSolicitud: '2026-10-27',
    fechaResultado: '2026-10-28',
    medicoSolicitante: 'Dra. Elena Ruiz',
    prioridad: 'urgente',
    estado: 'completado',
    flagAnormalidad: 'alto',
    tecnicoValido: 'Dra. Sofía Cordero',
    fechaValidacion: '2026-10-28T11:00:00.000Z',
    resultados: {
      color: 'Amarillo claro',
      aspecto: 'Ligeramente turbio',
      densidad: 1.025,
      ph: 6.0,
      proteinas: 'trazas',
      glucosa: 'negativo',
      cetonas: 'negativo',
      sangre: 'negativo',
      leucocitos_esterasa: '+',
      nitritos: 'positivo',
      sedimento_leucocitos: 10,
      sedimento_bacterias: 'Moderadas',
    },
  },
  {
    id: 'ORD-0003',
    pacienteCui: '3012345670901',
    tipo: 'microbiologia',
    tipoLaboratorio: 'microbiologia',
    fechaSolicitud: '2026-10-28',
    fechaResultado: null,
    medicoSolicitante: 'Dra. Elena Ruiz',
    prioridad: 'rutina',
    estado: 'en_proceso',
    flagAnormalidad: 'normal',
    resultados: {
      tipo_muestra: 'Orina en chorro medio',
      tincion_gram: 'Bacilos gram negativos',
      microorganismo_aislado: 'Escherichia coli',
      recuento_colonias: '> 100,000 UFC/mL',
      antibiograma: [
        { antibiotico_nombre: 'Nitrofurantoína', antibiotico_sensibilidad: 'sensible', antibiotico_cmi: 16 },
        { antibiotico_nombre: 'Ciprofloxacino', antibiotico_sensibilidad: 'resistente', antibiotico_cmi: 4 },
      ],
    },
  },
  {
    id: 'ORD-0004',
    pacienteCui: '2456789010901',
    tipo: 'quimica',
    tipoLaboratorio: 'quimica',
    fechaSolicitud: '2026-10-29',
    fechaResultado: '2026-10-29',
    medicoSolicitante: 'Dr. Rodrigo Palma',
    prioridad: 'rutina',
    estado: 'completado',
    flagAnormalidad: 'normal',
    tecnicoValido: 'Dra. Sofía Cordero',
    fechaValidacion: '2026-10-29T16:00:00.000Z',
    resultados: {
      valor_numerico: 95,
      unidad_medida: 'mg/dL',
      rango_referencia_min: 70,
      rango_referencia_max: 100,
      flag_anormalidad: 'normal',
      metodo_analitico: 'Enzimático Hexoquinasa',
      equipo_utilizado: 'Roche Cobas c311',
    },
  },
  {
    id: 'ORD-0005',
    pacienteCui: '2987654320101',
    tipo: 'inmunologia',
    tipoLaboratorio: 'inmunologia',
    fechaSolicitud: '2026-10-30',
    fechaResultado: null,
    medicoSolicitante: 'Dr. Rodrigo Palma',
    prioridad: 'rutina',
    estado: 'pendiente',
    flagAnormalidad: 'normal',
    resultados: {
      metodo: 'ELISA',
      resultado_cualitativo: 'negativo',
    },
  },
  {
    id: 'ORD-0006',
    pacienteCui: '2456789010901',
    tipo: 'coagulacion',
    tipoLaboratorio: 'coagulacion',
    fechaSolicitud: '2026-10-30',
    fechaResultado: '2026-10-30',
    medicoSolicitante: 'Dr. Rodrigo Palma',
    prioridad: 'urgente',
    estado: 'completado',
    flagAnormalidad: 'normal',
    tecnicoValido: 'Dra. Sofía Cordero',
    fechaValidacion: '2026-10-30T17:00:00.000Z',
    resultados: {
      tp_segundos: 12.5,
      inr: 1.05,
      ttpa_segundos: 29.0,
      fibrinogeno: 280,
    },
  },
];

/* ---------- Arrays mutables de identidad estable para la UI ---------- */
export const pacientes = [];
export const examenes = [];
export const muestras = [];

let datosListener = null;
export function registrarListenerActualizacion(fn) {
  datosListener = fn;
}

function headersAuth() {
  const sesion = obtenerSesion();
  return sesion?.token ? { Authorization: `Bearer ${sesion.token}` } : {};
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
  const primerRes = ord.resultados?.[0] || {};
  return {
    id: ord.numeroOrden || ord.id,
    pacienteCui: ord.pacienteId,
    tipo: ord.tipoLaboratorio,
    tipoLaboratorio: ord.tipoLaboratorio,
    fechaSolicitud: ord.fechaSolicitud?.slice(0, 10) || ord.fechaSolicitud,
    fechaResultado: primerRes.fechaResultado?.slice(0, 10) || null,
    medicoSolicitante: ord.medicoSolicitante,
    prioridad: ord.prioridad || 'rutina',
    estado: ord.estadoOrden === 'completada' ? 'completado' : ord.estadoOrden,
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

function snapshot() {
  return JSON.parse(JSON.stringify({ pacientes, examenes, muestras }));
}

function hayStorage() {
  try {
    const k = '__lab_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function cargarDesdeStorage() {
  if (hayStorage()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data?.pacientes) && Array.isArray(data?.examenes)) {
          if (data.pacientes.length === 0 && data.examenes.length === 0) {
            return false;
          }
          hydrate(data);
          return true;
        }
      }
    } catch {
      // Ignorar error al leer storage
    }
  }
  return false;
}

/**
 * Carga el estado general: primero del almacenamiento local para inicio rápido
 * y luego sincroniza en vivo con la API Express conectada a Firestore.
 */
export async function cargarEstado() {
  const teniaLocal = cargarDesdeStorage();
  if (!teniaLocal) {
    hydrate({ pacientes: SEED_PACIENTES, examenes: SEED_EXAMENES, muestras: SEED_MUESTRAS });
  }

  // Consulta en segundo plano hacia la API
  try {
    const headers = headersAuth();
    const [resPac, resOrd] = await Promise.allSettled([
      apiClient('/pacientes', { headers }),
      apiClient('/laboratorio/ordenes', { headers }),
    ]);

    let cambiado = false;

    if (resPac.status === 'fulfilled' && resPac.value.ok) {
      const dataPac = await resPac.value.json();
      const lista = Array.isArray(dataPac.items) ? dataPac.items : (Array.isArray(dataPac) ? dataPac : []);
      if (lista.length > 0) {
        pacientes.length = 0;
        pacientes.push(...lista.map(adaptarPacienteParaUi));
        cambiado = true;
      }
    }

    if (resOrd.status === 'fulfilled' && resOrd.value.ok) {
      const listaOrd = await resOrd.value.json();
      if (Array.isArray(listaOrd) && listaOrd.length > 0) {
        examenes.length = 0;
        examenes.push(...listaOrd.map(adaptarOrdenParaUi));
        cambiado = true;
      }
    }

    if (cambiado) {
      guardarEstado();
      datosListener?.();
      return 'api';
    }
  } catch (err) {
    console.warn('[datos] API no accesible, conservando modo local:', err.message);
  }

  return teniaLocal ? 'storage' : 'seed';
}

export function guardarEstado() {
  if (!hayStorage()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    return true;
  } catch (e) {
    console.warn('[datos] Error al guardar en localStorage:', e);
    return false;
  }
}

export function reiniciarDemo() {
  if (hayStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignorar si el almacenamiento no está disponible
    }
  }
  hydrate({ pacientes: SEED_PACIENTES, examenes: SEED_EXAMENES, muestras: SEED_MUESTRAS });
}

/* ---------- Operaciones Conectadas a la API ---------- */

export async function crearPacienteApi(datosPaciente) {
  try {
    const res = await apiClient('/pacientes', {
      method: 'POST',
      headers: headersAuth(),
      body: JSON.stringify(datosPaciente),
    });
    if (res.ok) {
      const creado = await res.json();
      const uiPaciente = adaptarPacienteParaUi(creado);
      const existe = pacientes.findIndex((p) => p.cui === uiPaciente.cui);
      if (existe >= 0) {
        pacientes[existe] = uiPaciente;
      } else {
        pacientes.push(uiPaciente);
      }
      guardarEstado();
      return uiPaciente;
    }
  } catch (err) {
    console.warn('[datos] Error al crear paciente en API, guardando local:', err.message);
  }
  return null;
}

export async function archivarPacienteApi(cui, motivo) {
  try {
    const res = await apiClient(`/pacientes/${encodeURIComponent(cui)}/archivar`, {
      method: 'PATCH',
      headers: headersAuth(),
      body: JSON.stringify({ motivo }),
    });
    if (res.ok) {
      const p = buscarPaciente(cui);
      if (p) {
        p.activo = false;
        p.motivoBaja = motivo;
        p.fechaBaja = new Date().toISOString().slice(0, 10);
      }
      guardarEstado();
      return true;
    }
  } catch (err) {
    console.warn('[datos] Error al archivar paciente en API:', err.message);
  }
  return false;
}

export async function crearOrdenApi(ordenDatos) {
  try {
    const res = await apiClient('/laboratorio/ordenes', {
      method: 'POST',
      headers: headersAuth(),
      body: JSON.stringify(ordenDatos),
    });
    if (res.ok) {
      const ordenCreada = await res.json();
      return ordenCreada;
    }
  } catch (err) {
    console.warn('[datos] Error al crear orden en API:', err.message);
  }
  return null;
}

export async function registrarMuestraApi(muestraDatos) {
  try {
    const res = await apiClient('/laboratorio/muestras', {
      method: 'POST',
      headers: headersAuth(),
      body: JSON.stringify(muestraDatos),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[datos] Error al registrar muestra en API:', err.message);
  }
  return null;
}

export async function registrarResultadoApi(resultadoDatos) {
  try {
    const res = await apiClient('/laboratorio/resultados', {
      method: 'POST',
      headers: headersAuth(),
      body: JSON.stringify(resultadoDatos),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[datos] Error al registrar resultado en API:', err.message);
  }
  return null;
}

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
