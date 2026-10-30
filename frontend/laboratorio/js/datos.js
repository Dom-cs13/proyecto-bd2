/* ============================================================
   datos.js · Capa de datos del Laboratorio Clínico
   ------------------------------------------------------------
   Contiene:
   - Catálogos (géneros, tipos de sangre, estados, motivos)
   - Definición de TIPOS de examen y sus campos
   - Arrays mutables `pacientes` y `examenes` (identidad estable)
   - Persistencia en localStorage
   - Helpers puros (sin DOM)

   Uso típico desde app.js:
       import { cargarEstado, guardarEstado } from './datos.js';
       cargarEstado();        // al arrancar
       // ...mutar arrays...
       guardarEstado();       // tras cada mutación
   ============================================================ */

const STORAGE_KEY = 'lab-clinico:demo:v1';

/* ---------- Catálogos ---------- */
export const GENEROS = ['Femenino', 'Masculino', 'Otro'];
export const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
export const PARASITOS = [
  'Ascaris lumbricoides',
  'Giardia lamblia',
  'Entamoeba histolytica',
  'Trichuris trichiura',
];
export const ESTADOS = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
};
export const MOTIVOS_BAJA = [
  'Traslado a otra institución',
  'Fallecimiento',
  'Baja administrativa',
];

/* ---------- Tipos de examen ---------- */
/* Formato de campo: [clave, etiqueta, unidad, tipo de input, opciones?] */
export const TIPOS = {
  hematologia: {
    nombre: 'Hematología',
    icono: '🩸',
    campos: [
      ['hemoglobina', 'Hemoglobina', 'g/dL', 'number'],
      ['hematocrito', 'Hematocrito', '%', 'number'],
      ['eritrocitos', 'Eritrocitos', 'M/µL', 'number'],
      ['leucocitos', 'Leucocitos', '/µL', 'number'],
      ['plaquetas', 'Plaquetas', '/µL', 'number'],
      ['vcm', 'VCM', 'fL', 'number'],
      ['hcm', 'HCM', 'pg', 'number'],
      ['chcm', 'CHCM', 'g/dL', 'number'],
    ],
  },
  orina: {
    nombre: 'Orina',
    icono: '🧪',
    campos: [
      ['proteinas', 'Proteínas', '', 'text'],
      ['color', 'Color', '', 'text'],
      ['densidad', 'Densidad', '', 'number'],
      ['ph', 'pH', '', 'number'],
      ['sangre', 'Sangre', '', 'select', ['Negativo', 'Positivo']],
    ],
  },
  heces: {
    nombre: 'Heces',
    icono: '🧫',
    campos: [
      ['mucosidad', 'Mucosidad', '', 'select', ['Ausente', 'Presente']],
      ['color', 'Color', '', 'text'],
      ['ph', 'pH', '', 'number'],
      ['parasitos', 'Parásitos', '', 'multi', PARASITOS],
    ],
  },
  cultivo: {
    nombre: 'Cultivo',
    icono: '🦠',
    campos: [
      ['tipoMuestra', 'Tipo de muestra', '', 'text'],
      ['microorganismo', 'Microorganismo aislado', '', 'text'],
      ['recuentoUfc', 'Recuento', 'UFC', 'number'],
      ['antibiograma', 'Antibiograma', '', 'text'],
      ['sensibleA', 'Sensible a', '', 'text'],
      ['resistenteA', 'Resistente a', '', 'text'],
    ],
  },
};

/* ---------- Datos semilla (sólo la primera vez o tras reiniciar) ---------- */
const SEED_PACIENTES = [
  { cui: '2987654320101', nombre: 'Mariana', apellidos: 'Soto Hernández', fechaNacimiento: '1992-04-18', genero: 'Femenino', tipoSangre: 'O+', telefono: '+502 5555 1234', direccion: 'Zona 1, Quetzaltenango', alergias: ['Penicilina'], activo: true },
  { cui: '2456789010901', nombre: 'Carlos', apellidos: 'Pérez López', fechaNacimiento: '1985-11-02', genero: 'Masculino', tipoSangre: 'A+', telefono: '+502 4444 9876', direccion: 'Zona 3, Quetzaltenango', alergias: [], activo: true },
  { cui: '3012345670901', nombre: 'Ana Lucía', apellidos: 'Ramírez Díaz', fechaNacimiento: '2015-07-09', genero: 'Femenino', tipoSangre: 'B+', telefono: '', direccion: 'Salcajá, Quetzaltenango', alergias: ['Látex'], activo: true },
  { cui: '1987654320901', nombre: 'Jorge', apellidos: 'Tzoc Xicay', fechaNacimiento: '1970-01-25', genero: 'Masculino', tipoSangre: 'AB+', telefono: '+502 3333 2211', direccion: 'Olintepeque, Quetzaltenango', alergias: ['Sulfas', 'Polen'], activo: false, motivoBaja: 'Traslado a otra institución', fechaBaja: '2026-09-12' },
];

const SEED_EXAMENES = [
  { id: 'ORD-0001', pacienteCui: '2987654320101', tipo: 'hematologia', fechaSolicitud: '2026-10-26', fechaResultado: '2026-10-27', medicoSolicitante: 'Dr. Rodrigo Palma', estado: 'completado',
    resultados: { hemoglobina: 13.2, hematocrito: 40, eritrocitos: 4.5, leucocitos: 7200, plaquetas: 250000, vcm: 88, hcm: 29, chcm: 33 } },
  { id: 'ORD-0002', pacienteCui: '2456789010901', tipo: 'orina', fechaSolicitud: '2026-10-27', fechaResultado: '2026-10-28', medicoSolicitante: 'Dra. Elena Ruiz', estado: 'completado',
    resultados: { proteinas: 'Trazas', color: 'Amarillo', densidad: 1.02, ph: 6, sangre: 'Negativo' } },
  { id: 'ORD-0003', pacienteCui: '3012345670901', tipo: 'heces', fechaSolicitud: '2026-10-28', fechaResultado: null, medicoSolicitante: 'Dra. Elena Ruiz', estado: 'en_proceso',
    resultados: { mucosidad: 'Presente', color: 'Marrón', ph: 6.5, parasitos: ['Giardia lamblia'] } },
  { id: 'ORD-0004', pacienteCui: '2987654320101', tipo: 'cultivo', fechaSolicitud: '2026-10-29', fechaResultado: null, medicoSolicitante: 'Dr. Rodrigo Palma', estado: 'pendiente', resultados: {} },
  { id: 'ORD-0005', pacienteCui: '2456789010901', tipo: 'cultivo', fechaSolicitud: '2026-10-25', fechaResultado: '2026-10-28', medicoSolicitante: 'Dr. Rodrigo Palma', estado: 'completado',
    resultados: { tipoMuestra: 'Urocultivo', microorganismo: 'Escherichia coli', recuentoUfc: 100000, antibiograma: 'Realizado', sensibleA: 'Nitrofurantoína, Ceftriaxona', resistenteA: 'Ampicilina' } },
];

/* ---------- Arrays mutables (la identidad NUNCA cambia) ---------- */
export const pacientes = [];
export const examenes = [];

/* ---------- Persistencia ---------- */
function hydrate(data) {
  const cloned = JSON.parse(JSON.stringify(data));
  pacientes.length = 0;
  pacientes.push(...cloned.pacientes);
  examenes.length = 0;
  examenes.push(...cloned.examenes);
}

function snapshot() {
  return JSON.parse(JSON.stringify({ pacientes, examenes }));
}

function hayStorage() {
  try {
    const k = '__lab_probe__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

/**
 * Carga el estado guardado o los datos semilla.
 * @returns {'storage'|'seed'}
 */
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
  hydrate({ pacientes: SEED_PACIENTES, examenes: SEED_EXAMENES });
  return 'seed';
}

/**
 * Guarda el estado actual. Silencioso si localStorage no está disponible.
 * @returns {boolean}
 */
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

/** Borra localStorage y restaura los datos semilla (sin recargar). */
export function reiniciarDemo() {
  if (hayStorage()) {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  hydrate({ pacientes: SEED_PACIENTES, examenes: SEED_EXAMENES });
}

/* ---------- Helpers puros ---------- */
export const buscarPaciente = (cui) => pacientes.find((p) => p.cui === cui);
export const existeCui     = (cui) => pacientes.some((p) => p.cui === cui);
export const nombreDeCui   = (cui) => {
  const p = buscarPaciente(cui);
  return p ? `${p.nombre} ${p.apellidos}` : cui;
};

/** Próximo `ORD-####` basado en el máximo existente. No muta nada. */
export function generarIdOrden() {
  const nums = examenes
    .map((e) => { const m = String(e.id).match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; })
    .filter((n) => n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `ORD-${String(max + 1).padStart(4, '0')}`;
}