/* ============================================================
   datos.js · Capa de Persistencia y Estado del Laboratorio Clínico
   ============================================================ */

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

/* ---------- Datos semilla con los 8 tipos de laboratorio ---------- */
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

/* ---------- Arrays mutables de identidad estable ---------- */
export const pacientes = [];
export const examenes = [];
export const muestras = [];

/* ---------- Persistencia LocalStorage ---------- */
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

export function cargarEstado() {
  if (hayStorage()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data?.pacientes) && Array.isArray(data?.examenes)) {
          hydrate(data);
          return 'storage';
        }
      }
    } catch (e) {
      console.warn('[datos] No se pudo leer localStorage, usando semilla:', e);
    }
  }
  hydrate({ pacientes: SEED_PACIENTES, examenes: SEED_EXAMENES, muestras: SEED_MUESTRAS });
  return 'seed';
}

export function guardarEstado() {
  if (!hayStorage()) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    return true;
  } catch (e) {
    console.warn('[datos] No se pudo guardar en localStorage:', e);
    return false;
  }
}

export function reiniciarDemo() {
  if (hayStorage()) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorar si el almacenamiento local no está disponible */
    }
  }
  hydrate({ pacientes: SEED_PACIENTES, examenes: SEED_EXAMENES, muestras: SEED_MUESTRAS });
}

/* ---------- Helpers de consulta y generación de claves ---------- */
export const buscarPaciente = (cui) => pacientes.find((p) => p.cui === cui || p.documentoIdentidad === cui);
export const existeCui = (cui) => pacientes.some((p) => p.cui === cui || p.documentoIdentidad === cui);
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
