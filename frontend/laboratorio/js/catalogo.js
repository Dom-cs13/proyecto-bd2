/* ============================================================
   catalogo.js · Catálogos y Definición de Tipos de Laboratorio
   ============================================================
   Define los 8 tipos de laboratorios, sus campos específicos
   y los catálogos del sistema clínico.
   ============================================================ */

export const GENEROS = ['Femenino', 'Masculino', 'Otro'];

export const TIPOS_SANGRE = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export const ESTADOS_ORDEN = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const ESTADOS_MUESTRA = {
  registrada: 'Registrada',
  recibida: 'Recibida',
  en_proceso: 'En proceso',
  completada: 'Completada',
  rechazada: 'Rechazada',
};

export const CONDICIONES_MUESTRA = [
  'optima',
  'hemolizada',
  'lipemica',
  'icterica',
  'insuficiente',
  'coagulada',
  'contaminada',
  'rechazada',
];

export const TIPOS_MUESTRA = [
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
];

export const FLAGS_ANORMALIDAD = {
  normal: { label: 'Normal', color: '#15803d', bg: '#dcfce7' },
  alto: { label: 'Alto', color: '#b45309', bg: '#fef3c7' },
  bajo: { label: 'Bajo', color: '#1d4ed8', bg: '#dbeafe' },
  critico_alto: { label: 'CRÍTICO ALTO 🚨', color: '#991b1b', bg: '#fee2e2' },
  critico_bajo: { label: 'CRÍTICO BAJO 🚨', color: '#991b1b', bg: '#fee2e2' },
};

export const ANTIBIOTICOS = [
  'Amoxicilina/Clavulánico',
  'Ampicilina',
  'Azitromicina',
  'Ceftriaxona',
  'Ciprofloxacino',
  'Gentamicina',
  'Meropenem',
  'Nitrofurantoína',
  'Trimetoprim/Sulfametoxazol',
  'Vancomicina',
];

export const MOTIVOS_BAJA = [
  'Traslado a otra institución',
  'Fallecimiento',
  'Baja administrativa',
  'Otro motivo justificado',
];

/**
 * Especificación de los 8 Tipos de Laboratorio
 * Formato de campo: [clave, etiqueta, unidad, tipo_control, opciones_o_config, obligatorio?]
 */
export const TIPOS_LABORATORIO = {
  hematologia: {
    nombre: 'Hematología',
    icono: '🩸',
    descripcion: 'Análisis de sangre y componentes celulares (Hemograma, Plaquetas, VSG).',
    muestrasCompatibles: ['sangre_venosa', 'sangre_capilar'],
    campos: [
      ['hemoglobina', 'Hemoglobina', 'g/dL', 'number', null, true],
      ['hematocrito', 'Hematocrito', '%', 'number', null, true],
      ['eritrocitos', 'Eritrocitos', 'M/µL', 'number', null, true],
      ['leucocitos', 'Leucocitos', '/µL', 'number', null, true],
      ['plaquetas', 'Plaquetas', '/µL', 'number', null, true],
      ['neutrofilos_pct', 'Neutrófilos', '%', 'number', null, false],
      ['linfocitos_pct', 'Linfocitos', '%', 'number', null, false],
      ['monocitos_pct', 'Monocitos', '%', 'number', null, false],
      ['eosinofilos_pct', 'Eosinófilos', '%', 'number', null, false],
      ['basofilos_pct', 'Basófilos', '%', 'number', null, false],
      ['vcm', 'VCM', 'fL', 'number', null, false],
      ['hcm', 'HCM', 'pg', 'number', null, false],
      ['reticulocitos_pct', 'Reticulocitos', '%', 'number', null, false],
    ],
  },

  quimica: {
    nombre: 'Química Clínica / Bioquímica',
    icono: '⚗️',
    descripcion: 'Glucosa, función renal, perfil lipídico, hepático y electrolitos.',
    muestrasCompatibles: ['suero', 'plasma', 'sangre_venosa'],
    campos: [
      ['valor_numerico', 'Valor Numérico', '', 'number', null, true],
      ['unidad_medida', 'Unidad de Medida', '', 'select', ['mg/dL', 'g/dL', 'mmol/L', 'U/L', 'µg/dL', 'mEq/L'], true],
      ['rango_referencia_min', 'Rango Referencia Mínimo', '', 'number', null, true],
      ['rango_referencia_max', 'Rango Referencia Máximo', '', 'number', null, true],
      ['flag_anormalidad', 'Flag de Anormalidad', '', 'select', ['normal', 'alto', 'bajo', 'critico_alto', 'critico_bajo'], true],
      ['metodo_analitico', 'Método Analítico', '', 'text', null, false],
      ['equipo_utilizado', 'Equipo Utilizado', '', 'text', null, false],
    ],
  },

  urianalisis: {
    nombre: 'Urianálisis',
    icono: '🧪',
    descripcion: 'Examen general de orina (EGO), tira reactiva y sedimento microscópico.',
    muestrasCompatibles: ['orina'],
    campos: [
      ['color', 'Color', '', 'select', ['Amarillo pajizo', 'Amarillo claro', 'Ámbar', 'Rojizo', 'Turbio'], true],
      ['aspecto', 'Aspecto', '', 'select', ['Limpio', 'Ligeramente turbio', 'Turbio'], true],
      ['densidad', 'Densidad', '', 'number', null, true],
      ['ph', 'pH', '', 'number', null, true],
      ['proteinas', 'Proteínas', '', 'select', ['negativo', 'trazas', '+', '++', '+++'], true],
      ['glucosa', 'Glucosa', '', 'select', ['negativo', 'trazas', '+', '++', '+++'], true],
      ['cetonas', 'Cetonas', '', 'select', ['negativo', 'trazas', '+', '++', '+++'], true],
      ['sangre', 'Sangre oculta', '', 'select', ['negativo', 'trazas', '+', '++', '+++'], true],
      ['leucocitos_esterasa', 'Leucocitos esterasa', '', 'select', ['negativo', 'trazas', '+', '++', '+++'], true],
      ['nitritos', 'Nitritos', '', 'select', ['negativo', 'positivo'], true],
      ['bilirrubina', 'Bilirrubina', '', 'select', ['negativo', 'positivo'], false],
      ['urobilinogeno', 'Urobilinógeno', '', 'select', ['normal', 'aumentado'], false],
      ['sedimento_eritrocitos', 'Eritrocitos / campo', '', 'number', null, false],
      ['sedimento_leucocitos', 'Leucocitos / campo', '', 'number', null, false],
      ['sedimento_bacterias', 'Bacterias en sedimento', '', 'select', ['Escasas', 'Moderadas', 'Abundantes'], false],
    ],
  },

  inmunologia: {
    nombre: 'Inmunología / Serología',
    icono: '🛡️',
    descripcion: 'Anticuerpos, marcadores virales, PCR, hCG y serologías infecciosas.',
    muestrasCompatibles: ['suero', 'plasma', 'sangre_venosa'],
    campos: [
      ['metodo', 'Método Analítico', '', 'select', ['ELISA', 'Quimioluminiscencia', 'Inmunocromatografía', 'Aglutinación'], true],
      ['resultado_cualitativo', 'Resultado Cualitativo', '', 'select', ['negativo', 'positivo', 'indeterminado'], false],
      ['resultado_cuantitativo', 'Resultado Cuantitativo', '', 'number', null, false],
      ['unidad_medida', 'Unidad de Medida', '', 'text', null, false],
      ['punto_corte', 'Punto de Corte (Cut-off)', '', 'number', null, false],
      ['interpretacion', 'Interpretación Técnica', '', 'text', null, false],
    ],
  },

  microbiologia: {
    nombre: 'Microbiología',
    icono: '🦠',
    descripcion: 'Cultivos bacteriológicos, identificación de patógenos y antibiogramas.',
    muestrasCompatibles: ['orina', 'heces', 'esputo', 'LCR', 'secrecion', 'hisopado', 'sangre_venosa'],
    campos: [
      ['tipo_muestra', 'Tipo de Muestra Aislada', '', 'text', null, true],
      ['tincion_gram', 'Tinción de Gram', '', 'text', null, false],
      ['microorganismo_aislado', 'Microorganismo Aislado', '', 'text', null, false],
      ['recuento_colonias', 'Recuento de Colonias', 'UFC/mL', 'text', null, false],
      ['observaciones', 'Observaciones del Cultivo', '', 'text', null, false],
    ],
  },

  coagulacion: {
    nombre: 'Coagulación',
    icono: '⏱️',
    descripcion: 'Tiempo de protrombina (TP), INR, TTPa, fibrinógeno y dímero D.',
    muestrasCompatibles: ['plasma', 'sangre_venosa'],
    campos: [
      ['tp_segundos', 'TP', 'seg', 'number', null, false],
      ['inr', 'INR', '', 'number', null, false],
      ['ttpa_segundos', 'TTPa', 'seg', 'number', null, false],
      ['fibrinogeno', 'Fibrinógeno', 'mg/dL', 'number', null, false],
      ['dimerod', 'Dímero D', 'ng/mL', 'number', null, false],
      ['tiempo_sangria', 'Tiempo de Sangría', 'min', 'number', null, false],
      ['tiempo_coagulacion', 'Tiempo de Coagulación', 'min', 'number', null, false],
    ],
  },

  banco_sangre: {
    nombre: 'Banco de Sangre',
    icono: '💉',
    descripcion: 'Tipaje ABO, factor Rh, Coombs directo/indirecto y pruebas cruzadas.',
    muestrasCompatibles: ['sangre_venosa', 'sangre_capilar'],
    campos: [
      ['grupo_abo', 'Grupo Sanguíneo ABO', '', 'select', ['A', 'B', 'AB', 'O'], true],
      ['factor_rh', 'Factor Rh', '', 'select', ['positivo', 'negativo'], true],
      ['coombs_directo', 'Coombs Directo', '', 'select', ['negativo', 'positivo'], false],
      ['coombs_indirecto', 'Coombs Indirecto', '', 'select', ['negativo', 'positivo'], false],
      ['prueba_cruzada', 'Prueba Cruzada', '', 'select', ['compatible', 'incompatible'], false],
    ],
  },

  biologia_molecular: {
    nombre: 'Biología Molecular',
    icono: '🧬',
    descripcion: 'PCR en tiempo real, cargas virales, secuenciación y genotipificación.',
    muestrasCompatibles: ['sangre_venosa', 'hisopado', 'LCR', 'secrecion', 'tejido'],
    campos: [
      ['tipo_tecnica', 'Técnica Utilizada', '', 'select', ['RT-PCR en tiempo real', 'PCR convencional', 'Secuenciación Sanger'], true],
      ['gen_diana', 'Gen o Región Diana', '', 'text', null, false],
      ['resultado_cualitativo', 'Resultado Cualitativo', '', 'select', ['no detectado', 'detectado', 'indeterminado'], false],
      ['carga_viral', 'Carga Viral', 'copias/mL', 'number', null, false],
      ['limite_deteccion', 'Límite de Detección', 'copias/mL', 'number', null, false],
      ['equipo_utilizado', 'Termociclador / Analizador', '', 'text', null, false],
    ],
  },
};
