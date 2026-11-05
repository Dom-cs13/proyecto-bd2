/**
 * @file reglasLaboratorio.js
 * Implementación pura (sin drivers ni infraestructura) de las 10 reglas de negocio
 * del Laboratorio Clínico especificadas en la sección 5 del documento.
 */

import { Validacion, Conflicto } from '../errores.js';
import {
  TiposLaboratorioEnum,
  ResultadoHematologiaSchema,
  ResultadoQuimicaSchema,
  ResultadoUrianalisisSchema,
  ResultadoInmunologiaSchema,
  ResultadoMicrobiologiaSchema,
  ResultadoCoagulacionSchema,
  ResultadoBancoSangreSchema,
  ResultadoBiologiaMolecularSchema,
} from '../entities/laboratorio.js';

/**
 * Matriz de compatibilidad entre tipos de laboratorio / exámenes y tipos de muestra.
 * Regla 9: El tipo de muestra debe ser compatible con el examen solicitado.
 */
export const COMPATIBILIDAD_MUESTRAS = {
  hematologia: ['sangre_venosa', 'sangre_capilar'],
  quimica: ['suero', 'plasma', 'sangre_venosa'],
  urianalisis: ['orina'],
  inmunologia: ['suero', 'plasma', 'sangre_venosa'],
  microbiologia: ['orina', 'heces', 'esputo', 'LCR', 'liquido_sinovial', 'secrecion', 'hisopado', 'tejido', 'sangre_venosa', 'otro'],
  coagulacion: ['plasma', 'sangre_venosa'],
  banco_sangre: ['sangre_venosa', 'sangre_capilar'],
  biologia_molecular: ['sangre_venosa', 'hisopado', 'LCR', 'tejido', 'secrecion'],
};

/**
 * Regla 1: Toda orden debe tener al menos un examen asociado a un tipo de laboratorio válido.
 * @param {Object} orden
 */
export function validarRegla1_ExamenesMinimos(orden) {
  if (!Array.isArray(orden.examenesSolicitados) || orden.examenesSolicitados.length === 0) {
    throw new Validacion('ORDEN_SIN_EXAMENES', 'Toda orden debe tener al menos un examen');
  }
  for (const ex of orden.examenesSolicitados) {
    const parsed = TiposLaboratorioEnum.safeParse(ex.tipoLaboratorio || orden.tipoLaboratorio);
    if (!parsed.success) {
      throw new Validacion('TIPO_LABORATORIO_INVALIDO', `Tipo de laboratorio inválido en el examen ${ex.codigo || ex.nombre}`);
    }
  }
  return true;
}

/**
 * Regla 2: Toda muestra debe estar vinculada a una orden y tener código de barras único.
 * @param {Object} muestra
 * @param {Array<string>} codigosExistentes
 */
export function validarRegla2_MuestraVinculada(muestra, codigosExistentes = []) {
  if (!muestra.ordenId) {
    throw new Validacion('MUESTRA_SIN_ORDEN', 'La muestra debe estar vinculada a una orden');
  }
  if (!muestra.codigoBarras || String(muestra.codigoBarras).trim() === '') {
    throw new Validacion('MUESTRA_SIN_CODIGO_BARRAS', 'La muestra debe tener un código de barras');
  }
  if (codigosExistentes.includes(muestra.codigoBarras)) {
    throw new Conflicto('CODIGO_BARRAS_DUPLICADO', `El código de barras ${muestra.codigoBarras} ya existe en el sistema`);
  }
  return true;
}

/**
 * Regla 3: Un resultado no puede validarse si la muestra está en estado 'rechazada' o condición 'insuficiente'/'rechazada'.
 * @param {Object} muestra
 */
export function validarRegla3_CondicionParaValidar(muestra) {
  if (!muestra) return true;
  if (muestra.estadoMuestra === 'rechazada') {
    throw new Validacion('MUESTRA_RECHAZADA', 'No se puede validar un resultado si la muestra fue rechazada');
  }
  if (muestra.condicionMuestra === 'rechazada' || muestra.condicionMuestra === 'insuficiente') {
    throw new Validacion('MUESTRA_INSUFICIENTE', `No se puede validar un resultado con condición de muestra '${muestra.condicionMuestra}'`);
  }
  return true;
}

/**
 * Regla 4: Rangos de referencia ajustados por sexo y edad del paciente.
 * @param {string} examenCodigo
 * @param {'Femenino'|'Masculino'|'Otro'} sexo
 * @param {number} edad
 * @returns {{ min: number, max: number, unidad: string }}
 */
export function obtenerRangoReferencia(examenCodigo, sexo = 'Otro', edad = 30) {
  const normCod = String(examenCodigo).toLowerCase();

  // Rangos fisiológicos de referencia
  if (normCod.includes('hemoglobina') || normCod === 'hb') {
    if (edad < 1) return { min: 11.0, max: 18.0, criticoBajo: 8.0, criticoAlto: 20.0, unidad: 'g/dL' };
    if (sexo === 'Femenino') return { min: 12.0, max: 15.5, criticoBajo: 7.0, criticoAlto: 18.0, unidad: 'g/dL' };
    return { min: 13.5, max: 17.5, criticoBajo: 7.0, criticoAlto: 19.0, unidad: 'g/dL' };
  }
  if (normCod.includes('glucosa')) {
    return { min: 70, max: 100, criticoBajo: 50, criticoAlto: 300, unidad: 'mg/dL' };
  }
  if (normCod.includes('leucocitos') || normCod === 'wbc') {
    return { min: 4500, max: 11000, criticoBajo: 2000, criticoAlto: 30000, unidad: '/µL' };
  }
  if (normCod.includes('plaquetas') || normCod === 'plt') {
    return { min: 150000, max: 450000, criticoBajo: 50000, criticoAlto: 1000000, unidad: '/µL' };
  }
  if (normCod.includes('creatinina')) {
    if (sexo === 'Femenino') return { min: 0.6, max: 1.1, criticoBajo: 0.3, criticoAlto: 4.0, unidad: 'mg/dL' };
    return { min: 0.7, max: 1.3, criticoBajo: 0.3, criticoAlto: 4.0, unidad: 'mg/dL' };
  }

  return { min: 0, max: 100, criticoBajo: null, criticoAlto: null, unidad: '' };
}

/**
 * Calcula el flag de anormalidad automáticamente comparando el valor numérico con el rango.
 * @param {number} valor
 * @param {{ min: number, max: number, criticoBajo?: number, criticoAlto?: number }} rango
 * @returns {'normal'|'alto'|'bajo'|'critico_alto'|'critico_bajo'}
 */
export function calcularFlagAnormalidad(valor, rango) {
  if (valor == null || isNaN(valor)) return 'normal';
  if (rango.criticoAlto != null && valor >= rango.criticoAlto) return 'critico_alto';
  if (rango.criticoBajo != null && valor <= rango.criticoBajo) return 'critico_bajo';
  if (valor > rango.max) return 'alto';
  if (valor < rango.min) return 'bajo';
  return 'normal';
}

/**
 * Regla 5: Los resultados críticos deben generar una alerta inmediata al médico.
 * @param {'normal'|'alto'|'bajo'|'critico_alto'|'critico_bajo'} flag
 * @returns {{ esCritico: boolean, alerta: string|null }}
 */
export function evaluarAlertaCritica(flag) {
  const esCritico = flag === 'critico_alto' || flag === 'critico_bajo';
  return {
    esCritico,
    alerta: esCritico
      ? `🚨 ALERTA CRÍTICA INMEDIATA: Valor de resultado en umbral ${flag.toUpperCase()}. Notificar urgentemente al médico solicitante.`
      : null,
  };
}

/**
 * Regla 6: El antibiograma solo aplica a resultados de Microbiología con microorganismo aislado.
 * @param {string} tipoLaboratorio
 * @param {string|null} microorganismoAislado
 * @param {Array<any>} antibiograma
 */
export function validarRegla6_Antibiograma(tipoLaboratorio, microorganismoAislado, antibiograma) {
  const tieneAntibiograma = Array.isArray(antibiograma) && antibiograma.length > 0;
  if (!tieneAntibiograma) return true;

  if (tipoLaboratorio !== 'microbiologia') {
    throw new Validacion('ANTIBIOGRAMA_INVALIDO', 'El antibiograma solo aplica a resultados de Microbiología');
  }
  if (!microorganismoAislado || String(microorganismoAislado).trim() === '') {
    throw new Validacion('MICROORGANISMO_REQUERIDO', 'No se puede registrar antibiograma sin haber aislado un microorganismo');
  }
  return true;
}

/**
 * Regla 7: La validación técnica requiere usuario con rol 'validador' y fecha/hora de validación.
 * @param {Object} validacion
 */
export function validarRegla7_ValidacionTecnica(validacion) {
  if (validacion.estadoResultado === 'validado') {
    if (!validacion.tecnicoValido || String(validacion.tecnicoValido).trim() === '') {
      throw new Validacion('VALIDADOR_REQUERIDO', 'La validación técnica requiere un usuario validador');
    }
    if (!validacion.fechaValidacion) {
      throw new Validacion('FECHA_VALIDACION_REQUERIDA', 'La validación técnica requiere fecha y hora de validación');
    }
  }
  return true;
}

/**
 * Regla 8: Los resultados corregidos deben mantener historial de versiones (auditoría).
 * @param {Object} resultadoActual
 * @param {Object} datosNuevos
 * @returns {Object} Resultado con versión incrementada y snapshot guardado en historialVersiones
 */
export function aplicarRegla8_VersionadoResultado(resultadoActual, datosNuevos) {
  const copiaHistorial = Array.isArray(resultadoActual.historialVersiones)
    ? [...resultadoActual.historialVersiones]
    : [];

  // Snapshot de la versión previa
  copiaHistorial.push({
    version: resultadoActual.version || 1,
    valorResultado: resultadoActual.valorResultado,
    flagAnormalidad: resultadoActual.flagAnormalidad,
    estadoResultado: resultadoActual.estadoResultado,
    fechaResultado: resultadoActual.fechaResultado,
    tecnicoIngreso: resultadoActual.tecnicoIngreso,
    fechaCambio: new Date().toISOString(),
  });

  return {
    ...resultadoActual,
    ...datosNuevos,
    version: (resultadoActual.version || 1) + 1,
    estadoResultado: 'corregido',
    historialVersiones: copiaHistorial,
  };
}

/**
 * Regla 9: El tipo de muestra debe ser compatible con el examen solicitado.
 * @param {string} tipoLaboratorio
 * @param {string} tipoMuestra
 */
export function validarRegla9_CompatibilidadMuestra(tipoLaboratorio, tipoMuestra) {
  const permitidas = COMPATIBILIDAD_MUESTRAS[tipoLaboratorio];
  if (!permitidas) return true;
  if (!permitidas.includes(tipoMuestra)) {
    throw new Validacion(
      'MUESTRA_INCOMPATIBLE',
      `El tipo de muestra '${tipoMuestra}' no es compatible con el laboratorio de ${tipoLaboratorio}. Muestras permitidas: ${permitidas.join(', ')}`
    );
  }
  return true;
}

/**
 * Regla 10: Cada tipo de laboratorio tiene su propio conjunto de campos específicos;
 * valida que los campos obligatorios estén presentes antes de permitir la validación.
 * @param {string} tipoLaboratorio
 * @param {Object} valorResultado
 */
export function validarRegla10_CamposPorTipo(tipoLaboratorio, valorResultado) {
  const esquemasPorTipo = {
    hematologia: ResultadoHematologiaSchema,
    quimica: ResultadoQuimicaSchema,
    urianalisis: ResultadoUrianalisisSchema,
    inmunologia: ResultadoInmunologiaSchema,
    microbiologia: ResultadoMicrobiologiaSchema,
    coagulacion: ResultadoCoagulacionSchema,
    banco_sangre: ResultadoBancoSangreSchema,
    biologia_molecular: ResultadoBiologiaMolecularSchema,
  };

  const schema = esquemasPorTipo[tipoLaboratorio];
  if (!schema) {
    throw new Validacion('TIPO_DESCONOCIDO', `Tipo de laboratorio desconocido: ${tipoLaboratorio}`);
  }

  const parsed = schema.safeParse(valorResultado);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Validacion('CAMPOS_OBLIGATORIOS_FALTANTES', `Faltan campos obligatorios para ${tipoLaboratorio}: ${errorMsg}`);
  }

  return parsed.data;
}
