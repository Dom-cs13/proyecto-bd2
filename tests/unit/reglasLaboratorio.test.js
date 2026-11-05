import { describe, it, expect } from 'vitest';
import {
  validarRegla1_ExamenesMinimos,
  validarRegla2_MuestraVinculada,
  validarRegla3_CondicionParaValidar,
  obtenerRangoReferencia,
  calcularFlagAnormalidad,
  evaluarAlertaCritica,
  validarRegla6_Antibiograma,
  validarRegla7_ValidacionTecnica,
  aplicarRegla8_VersionadoResultado,
  validarRegla9_CompatibilidadMuestra,
  validarRegla10_CamposPorTipo,
} from '../../src/domain/rules/reglasLaboratorio.js';
import { Validacion, Conflicto } from '../../src/domain/errores.js';

describe('Reglas de Negocio del Laboratorio Clínico', () => {
  it('Regla 1: Falla si la orden no tiene exámenes', () => {
    expect(() => validarRegla1_ExamenesMinimos({ examenesSolicitados: [] })).toThrow(Validacion);
  });

  it('Regla 1: Pasa si tiene examen con tipo válido', () => {
    const orden = {
      tipoLaboratorio: 'hematologia',
      examenesSolicitados: [{ codigo: 'HEM-01', nombre: 'Hemograma', tipoLaboratorio: 'hematologia' }],
    };
    expect(validarRegla1_ExamenesMinimos(orden)).toBe(true);
  });

  it('Regla 2: Exige ordenId y código de barras único para muestras', () => {
    expect(() => validarRegla2_MuestraVinculada({ codigoBarras: 'BAR-123' })).toThrow(Validacion);
    expect(() => validarRegla2_MuestraVinculada({ ordenId: 'ORD-1', codigoBarras: '' })).toThrow(Validacion);
    expect(() => validarRegla2_MuestraVinculada({ ordenId: 'ORD-1', codigoBarras: 'BAR-DUP' }, ['BAR-DUP'])).toThrow(Conflicto);
    expect(validarRegla2_MuestraVinculada({ ordenId: 'ORD-1', codigoBarras: 'BAR-OK' }, ['BAR-OTRO'])).toBe(true);
  });

  it('Regla 3: No permite validar resultado si la muestra está rechazada o insuficiente', () => {
    expect(() => validarRegla3_CondicionParaValidar({ estadoMuestra: 'rechazada' })).toThrow(Validacion);
    expect(() => validarRegla3_CondicionParaValidar({ condicionMuestra: 'insuficiente' })).toThrow(Validacion);
    expect(validarRegla3_CondicionParaValidar({ estadoMuestra: 'completada', condicionMuestra: 'optima' })).toBe(true);
  });

  it('Regla 4: Rangos de referencia y cálculo automático de flag', () => {
    const rangoHbFemenino = obtenerRangoReferencia('hemoglobina', 'Femenino', 25);
    expect(rangoHbFemenino.min).toBe(12.0);
    expect(rangoHbFemenino.max).toBe(15.5);

    expect(calcularFlagAnormalidad(13.5, rangoHbFemenino)).toBe('normal');
    expect(calcularFlagAnormalidad(17.0, rangoHbFemenino)).toBe('alto');
    expect(calcularFlagAnormalidad(10.0, rangoHbFemenino)).toBe('bajo');
    expect(calcularFlagAnormalidad(6.5, rangoHbFemenino)).toBe('critico_bajo');
    expect(calcularFlagAnormalidad(19.5, rangoHbFemenino)).toBe('critico_alto');
  });

  it('Regla 5: Genera alerta médica inmediata para resultados críticos', () => {
    const normal = evaluarAlertaCritica('normal');
    expect(normal.esCritico).toBe(false);
    expect(normal.alerta).toBeNull();

    const critico = evaluarAlertaCritica('critico_alto');
    expect(critico.esCritico).toBe(true);
    expect(critico.alerta).toContain('ALERTA CRÍTICA INMEDIATA');
  });

  it('Regla 6: Antibiograma solo aplica a Microbiología con microorganismo aislado', () => {
    expect(() => validarRegla6_Antibiograma('quimica', 'E. coli', [{ antibiotico_nombre: 'Ampicilina' }])).toThrow(Validacion);
    expect(() => validarRegla6_Antibiograma('microbiologia', '', [{ antibiotico_nombre: 'Ampicilina' }])).toThrow(Validacion);
    expect(validarRegla6_Antibiograma('microbiologia', 'Klebsiella pneumoniae', [{ antibiotico_nombre: 'Meropenem' }])).toBe(true);
  });

  it('Regla 7: Validación técnica exige validador y fecha', () => {
    expect(() => validarRegla7_ValidacionTecnica({ estadoResultado: 'validado' })).toThrow(Validacion);
    expect(validarRegla7_ValidacionTecnica({ estadoResultado: 'validado', tecnicoValido: 'Dra. Ruiz', fechaValidacion: '2026-10-30T10:00:00Z' })).toBe(true);
  });

  it('Regla 8: Versiona y preserva historial en resultados corregidos', () => {
    const actual = {
      version: 1,
      valorResultado: { glucosa: 90 },
      flagAnormalidad: 'normal',
      estadoResultado: 'validado',
      tecnicoIngreso: 'Tec. Lopez',
      historialVersiones: [],
    };
    const corregido = aplicarRegla8_VersionadoResultado(actual, {
      valorResultado: { glucosa: 140 },
      flagAnormalidad: 'alto',
    });
    expect(corregido.version).toBe(2);
    expect(corregido.estadoResultado).toBe('corregido');
    expect(corregido.historialVersiones).toHaveLength(1);
    expect(corregido.historialVersiones[0].valorResultado.glucosa).toBe(90);
  });

  it('Regla 9: Valida compatibilidad entre tipo de laboratorio y tipo de muestra', () => {
    expect(() => validarRegla9_CompatibilidadMuestra('urianalisis', 'sangre_venosa')).toThrow(Validacion);
    expect(validarRegla9_CompatibilidadMuestra('urianalisis', 'orina')).toBe(true);
    expect(validarRegla9_CompatibilidadMuestra('hematologia', 'sangre_venosa')).toBe(true);
  });

  it('Regla 10: Valida campos obligatorios para los 8 tipos de laboratorio', () => {
    // 1. Hematología: faltan campos obligatorios
    expect(() => validarRegla10_CamposPorTipo('hematologia', { hemoglobina: 14 })).toThrow(Validacion);
    const hemOk = validarRegla10_CamposPorTipo('hematologia', {
      hemoglobina: 14,
      hematocrito: 42,
      eritrocitos: 4.8,
      leucocitos: 7000,
      plaquetas: 250000,
    });
    expect(hemOk.hemoglobina).toBe(14);

    // 2. Química Clínica
    expect(() => validarRegla10_CamposPorTipo('quimica', { valor_numerico: 90 })).toThrow(Validacion);
    const quiOk = validarRegla10_CamposPorTipo('quimica', {
      valor_numerico: 95,
      unidad_medida: 'mg/dL',
      rango_referencia_min: 70,
      rango_referencia_max: 100,
      flag_anormalidad: 'normal',
    });
    expect(quiOk.valor_numerico).toBe(95);

    // 3. Urianálisis
    expect(() => validarRegla10_CamposPorTipo('urianalisis', { color: 'Amarillo' })).toThrow(Validacion);

    // 4. Inmunología
    expect(() => validarRegla10_CamposPorTipo('inmunologia', {})).toThrow(Validacion);
    expect(validarRegla10_CamposPorTipo('inmunologia', { metodo: 'ELISA' }).metodo).toBe('ELISA');

    // 5. Microbiología
    expect(() => validarRegla10_CamposPorTipo('microbiologia', {})).toThrow(Validacion);
    expect(validarRegla10_CamposPorTipo('microbiologia', { tipo_muestra: 'Orina' }).tipo_muestra).toBe('Orina');

    // 6. Coagulación
    expect(validarRegla10_CamposPorTipo('coagulacion', { inr: 1.1 }).inr).toBe(1.1);

    // 7. Banco de Sangre
    expect(() => validarRegla10_CamposPorTipo('banco_sangre', { grupo_abo: 'O' })).toThrow(Validacion);
    expect(validarRegla10_CamposPorTipo('banco_sangre', { grupo_abo: 'O', factor_rh: 'positivo' }).factor_rh).toBe('positivo');

    // 8. Biología Molecular
    expect(() => validarRegla10_CamposPorTipo('biologia_molecular', {})).toThrow(Validacion);
    expect(validarRegla10_CamposPorTipo('biologia_molecular', { tipo_tecnica: 'RT-PCR' }).tipo_tecnica).toBe('RT-PCR');
  });
});
