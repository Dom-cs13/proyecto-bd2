/* ============================================================
   reglas.js · Reglas de Negocio en Cliente para Laboratorio
   ============================================================
   Valida las 10 reglas de la especificación clínica en la interfaz:
   - Campos obligatorios por tipo
   - Muestras no rechazadas para validar
   - Compatibilidad entre muestra y laboratorio
   - Antibiograma solo con germen aislado
   - Cálculo automático de flags y alertas críticas
   ============================================================ */

import { TIPOS_LABORATORIO } from './catalogo.js';

/**
 * Rangos de referencia rápidos según el tipo de examen y el paciente.
 */
export function obtenerRangoReferencia(examen, paciente = null) {
  const ex = String(examen || '').toLowerCase();
  const sexo = paciente?.genero || 'Femenino';

  if (ex.includes('hemoglobina')) {
    if (sexo === 'Masculino') return { min: 13.5, max: 17.5, criticoBajo: 7.0, criticoAlto: 19.0, unidad: 'g/dL' };
    return { min: 12.0, max: 15.5, criticoBajo: 7.0, criticoAlto: 18.0, unidad: 'g/dL' };
  }
  if (ex.includes('glucosa')) {
    return { min: 70, max: 100, criticoBajo: 50, criticoAlto: 300, unidad: 'mg/dL' };
  }
  if (ex.includes('leucocitos')) {
    return { min: 4500, max: 11000, criticoBajo: 2000, criticoAlto: 30000, unidad: '/µL' };
  }
  if (ex.includes('plaquetas')) {
    return { min: 150000, max: 450000, criticoBajo: 50000, criticoAlto: 1000000, unidad: '/µL' };
  }
  if (ex.includes('densidad')) {
    return { min: 1.005, max: 1.030, unidad: '' };
  }
  if (ex.includes('ph')) {
    return { min: 5.0, max: 8.0, unidad: '' };
  }
  return { min: 0, max: 100, unidad: '' };
}

/**
 * Calcula el flag de anormalidad automáticamente (Regla 4).
 * @param {number} valor
 * @param {Object} rango
 * @returns {'normal'|'alto'|'bajo'|'critico_alto'|'critico_bajo'}
 */
export function calcularFlagAnormalidad(valor, rango) {
  if (valor == null || isNaN(valor)) return 'normal';
  const num = Number(valor);
  if (rango.criticoAlto != null && num >= rango.criticoAlto) return 'critico_alto';
  if (rango.criticoBajo != null && num <= rango.criticoBajo) return 'critico_bajo';
  if (num > rango.max) return 'alto';
  if (num < rango.min) return 'bajo';
  return 'normal';
}

/**
 * Regla 3: Un resultado no puede validarse si la muestra está rechazada o insuficiente.
 */
export function puedeValidarConMuestra(muestra) {
  if (!muestra) return { ok: true };
  if (muestra.estadoMuestra === 'rechazada') {
    return { ok: false, error: 'No se puede validar: la muestra vinculada está rechazada.' };
  }
  if (muestra.condicionMuestra === 'rechazada' || muestra.condicionMuestra === 'insuficiente') {
    return { ok: false, error: `No se puede validar: la muestra tiene condición '${muestra.condicionMuestra}'.` };
  }
  return { ok: true };
}

/**
 * Regla 9: Compatibilidad de muestra con el tipo de laboratorio.
 */
export function esMuestraCompatible(tipoLab, tipoMuestra) {
  const def = TIPOS_LABORATORIO[tipoLab];
  if (!def || !def.muestrasCompatibles) return true;
  return def.muestrasCompatibles.includes(tipoMuestra);
}

/**
 * Regla 10: Validación de campos obligatorios según el tipo de laboratorio.
 */
export function validarCamposObligatorios(tipoLab, valores) {
  const def = TIPOS_LABORATORIO[tipoLab];
  if (!def) return { ok: true };

  const faltantes = [];
  for (const [clave, etiqueta, , , , obligatorio] of def.campos) {
    if (obligatorio) {
      const val = valores[clave];
      if (val === undefined || val === null || String(val).trim() === '') {
        faltantes.push(etiqueta);
      }
    }
  }

  if (faltantes.length > 0) {
    return {
      ok: false,
      error: `Campos obligatorios faltantes para ${def.nombre}: ${faltantes.join(', ')}`,
      faltantes,
    };
  }
  return { ok: true };
}

/**
 * Regla 6: El antibiograma solo aplica a Microbiología con microorganismo aislado.
 */
export function validarAntibiograma(tipoLab, microorganismo, tieneAntibiograma) {
  if (!tieneAntibiograma) return { ok: true };
  if (tipoLab !== 'microbiologia') {
    return { ok: false, error: 'El antibiograma solo es aplicable a estudios de Microbiología.' };
  }
  if (!microorganismo || String(microorganismo).trim() === '') {
    return { ok: false, error: 'No se puede emitir antibiograma sin haber aislado un microorganismo.' };
  }
  return { ok: true };
}
