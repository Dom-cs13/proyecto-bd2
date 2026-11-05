import { z } from 'zod';

/* ============================================================================
   Enums y Catálogos de Dominio del Laboratorio Clínico
   ============================================================================ */
export const TiposLaboratorioEnum = z.enum([
  'hematologia',
  'quimica',
  'urianalisis',
  'inmunologia',
  'microbiologia',
  'coagulacion',
  'banco_sangre',
  'biologia_molecular',
]);

export const TipoMuestraEnum = z.enum([
  'sangre_venosa',
  'sangre_capilar',
  'suero',
  'plasma',
  'orina',
  'heces',
  'esputo',
  'LCR',
  'liquido_sinovial',
  'secrecion',
  'hisopado',
  'tejido',
  'otro',
]);

export const CondicionMuestraEnum = z.enum([
  'optima',
  'hemolizada',
  'lipemica',
  'icterica',
  'insuficiente',
  'coagulada',
  'contaminada',
  'rechazada',
]);

export const EstadoMuestraEnum = z.enum([
  'registrada',
  'recibida',
  'en_proceso',
  'completada',
  'rechazada',
]);

export const FlagAnormalidadEnum = z.enum([
  'normal',
  'alto',
  'bajo',
  'critico_alto',
  'critico_bajo',
]);

export const EstadoResultadoEnum = z.enum([
  'preliminar',
  'final',
  'corregido',
  'validado',
]);

export const PrioridadOrdenEnum = z.enum(['rutina', 'urgente']);

export const EstadoOrdenEnum = z.enum([
  'pendiente',
  'en_proceso',
  'completada',
  'cancelada',
]);

export const SensibilidadAntibioticoEnum = z.enum([
  'sensible',
  'intermedio',
  'resistente',
]);

/* ============================================================================
   Auditoría estándar
   ============================================================================ */
export const AuditoriaSchema = z.object({
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  createdBy: z.string().optional().default('sistema'),
  updatedBy: z.string().optional().default('sistema'),
  deletedAt: z.string().nullable().optional().default(null),
});

/* ============================================================================
   Campos Específicos por Tipo de Laboratorio
   ============================================================================ */

// 1. Hematología
export const ResultadoHematologiaSchema = z.object({
  hemoglobina: z.number().describe('decimal (g/dL)'),
  hematocrito: z.number().describe('decimal (%)'),
  eritrocitos: z.number().describe('decimal (millones/µL)'),
  leucocitos: z.number().describe('decimal (miles/µL)'),
  plaquetas: z.number().int().describe('entero (miles/µL)'),
  neutrofilos_pct: z.number().optional(),
  linfocitos_pct: z.number().optional(),
  monocitos_pct: z.number().optional(),
  eosinofilos_pct: z.number().optional(),
  basofilos_pct: z.number().optional(),
  vcm: z.number().optional().describe('fL'),
  hcm: z.number().optional().describe('pg'),
  chcm: z.number().optional().describe('g/dL'),
  reticulocitos_pct: z.number().optional(),
});

// 2. Química Clínica / Bioquímica
export const ResultadoQuimicaSchema = z.object({
  valor_numerico: z.number().describe('decimal con unidad'),
  unidad_medida: z.string().min(1),
  rango_referencia_min: z.number(),
  rango_referencia_max: z.number(),
  flag_anormalidad: FlagAnormalidadEnum,
  metodo_analitico: z.string().optional(),
  equipo_utilizado: z.string().optional(),
});

// 3. Urianálisis
export const ProteinasGlucosaEnum = z.enum(['negativo', 'trazas', '+', '++', '+++']);
export const ResultadoUrianalisisSchema = z.object({
  color: z.string().min(1),
  aspecto: z.string().min(1),
  densidad: z.number(),
  ph: z.number(),
  proteinas: ProteinasGlucosaEnum,
  glucosa: ProteinasGlucosaEnum,
  cetonas: ProteinasGlucosaEnum,
  sangre: ProteinasGlucosaEnum,
  leucocitos_esterasa: ProteinasGlucosaEnum,
  nitritos: z.enum(['negativo', 'positivo']),
  bilirrubina: z.enum(['negativo', 'positivo']).optional(),
  urobilinogeno: z.enum(['normal', 'aumentado']).optional(),
  sedimento_eritrocitos: z.number().int().optional(),
  sedimento_leucocitos: z.number().int().optional(),
  sedimento_celulas_epiteliales: z.string().optional(),
  sedimento_cilindros: z.string().optional(),
  sedimento_cristales: z.string().optional(),
  sedimento_bacterias: z.string().optional(),
});

// 4. Inmunología / Serología
export const ResultadoInmunologiaSchema = z.object({
  metodo: z.string().min(1),
  resultado_cualitativo: z.enum(['positivo', 'negativo', 'indeterminado']).optional(),
  resultado_cuantitativo: z.number().optional(),
  unidad_medida: z.string().optional(),
  punto_corte: z.number().optional(),
  interpretacion: z.string().optional(),
});

// 5. Microbiología
export const DetalleAntibiogramaSchema = z.object({
  antibiotico_nombre: z.string().min(1),
  antibiotico_sensibilidad: SensibilidadAntibioticoEnum,
  antibiotico_cmi: z.number().optional(),
});

export const ResultadoMicrobiologiaSchema = z.object({
  tipo_muestra: z.string().min(1),
  tincion_gram: z.string().optional(),
  microorganismo_aislado: z.string().optional(),
  recuento_colonias: z.string().optional(),
  antibiograma: z.array(DetalleAntibiogramaSchema).optional().default([]),
  observaciones: z.string().optional(),
});

// 6. Coagulación
export const ResultadoCoagulacionSchema = z.object({
  tp_segundos: z.number().optional(),
  inr: z.number().optional(),
  ttpa_segundos: z.number().optional(),
  fibrinogeno: z.number().optional(),
  dimerod: z.number().optional(),
  tiempo_sangria: z.number().optional(),
  tiempo_coagulacion: z.number().optional(),
});

// 7. Banco de Sangre
export const ResultadoBancoSangreSchema = z.object({
  grupo_abo: z.enum(['A', 'B', 'AB', 'O']),
  factor_rh: z.enum(['positivo', 'negativo']),
  coombs_directo: z.enum(['positivo', 'negativo']).optional(),
  coombs_indirecto: z.enum(['positivo', 'negativo']).optional(),
  prueba_cruzada: z.enum(['compatible', 'incompatible']).optional(),
});

// 8. Biología Molecular
export const ResultadoBiologiaMolecularSchema = z.object({
  tipo_tecnica: z.string().min(1),
  gen_diana: z.string().optional(),
  resultado_cualitativo: z.enum(['detectado', 'no detectado', 'indeterminado']).optional(),
  carga_viral: z.number().optional(),
  limite_deteccion: z.number().optional(),
  equipo_utilizado: z.string().optional(),
});

/* ============================================================================
   Entidades del Sistema de Laboratorio
   ============================================================================ */

export const MuestraSchema = z.object({
  id: z.string().min(1),
  ordenId: z.string().min(1),
  codigoBarras: z.string().min(1),
  tipoMuestra: TipoMuestraEnum,
  fechaToma: z.string(),
  fechaRecepcion: z.string(),
  volumen: z.number().optional(),
  contenedor: z.string().optional().default('Tubo estándar'),
  condicionMuestra: CondicionMuestraEnum,
  estadoMuestra: EstadoMuestraEnum,
  observacionesMuestra: z.string().optional().default(''),
  auditoria: AuditoriaSchema.default(() => ({})),
});

export const ExamenSolicitadoItemSchema = z.object({
  codigo: z.string().min(1),
  nombre: z.string().min(1),
  tipoLaboratorio: TiposLaboratorioEnum,
});

export const OrdenSchema = z.object({
  id: z.string().min(1),
  numeroOrden: z.string().min(1),
  pacienteId: z.string().min(1),
  fechaSolicitud: z.string(),
  medicoSolicitante: z.string().min(1),
  especialidadSolicitante: z.string().optional().default('Medicina General'),
  tipoLaboratorio: TiposLaboratorioEnum,
  examenesSolicitados: z.array(ExamenSolicitadoItemSchema).min(1, 'La orden debe tener al menos un examen'),
  prioridad: PrioridadOrdenEnum.default('rutina'),
  observacionesOrden: z.string().optional().default(''),
  estadoOrden: EstadoOrdenEnum.default('pendiente'),
  muestras: z.array(MuestraSchema).optional().default([]),
  auditoria: AuditoriaSchema.default(() => ({})),
});

export const ResultadoSchema = z.object({
  id: z.string().min(1),
  ordenId: z.string().min(1),
  muestraId: z.string().min(1),
  examenCodigo: z.string().min(1),
  examenNombre: z.string().min(1),
  tipoLaboratorio: TiposLaboratorioEnum,
  valorResultado: z.record(z.unknown()), // Mapa polimórfico según tipo
  unidadMedida: z.string().optional().default(''),
  rangoReferencia: z.string().optional().default(''),
  flagAnormalidad: FlagAnormalidadEnum.default('normal'),
  metodo: z.string().optional().default(''),
  equipo: z.string().optional().default(''),
  fechaResultado: z.string(),
  tecnicoIngreso: z.string().min(1, 'El técnico que ingresa es obligatorio'),
  tecnicoValido: z.string().nullable().optional().default(null),
  fechaValidacion: z.string().nullable().optional().default(null),
  estadoResultado: EstadoResultadoEnum.default('preliminar'),
  comentarios: z.string().optional().default(''),
  version: z.number().int().default(1),
  historialVersiones: z.array(z.record(z.unknown())).optional().default([]),
  auditoria: AuditoriaSchema.default(() => ({})),
});
