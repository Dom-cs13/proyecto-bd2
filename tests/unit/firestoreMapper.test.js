import { describe, it, expect } from 'vitest';
import {
  pacienteToDomain,
  pacienteToFirestore,
  ordenToDomain,
  muestraToDomain,
  resultadoToDomain,
  aFechaIso,
} from '../../src/infrastructure/adapters/firestore/mapper.js';

describe('Firestore Data Mapper · LSP y Contratos', () => {
  it('convierte objetos Timestamp o Date a strings ISO-8601', () => {
    const d = new Date('2026-10-30T15:30:00.000Z');
    expect(aFechaIso(d)).toBe('2026-10-30T15:30:00.000Z');

    const fakeFirestoreTimestamp = {
      toDate: () => new Date('2026-10-30T15:30:00.000Z'),
    };
    expect(aFechaIso(fakeFirestoreTimestamp)).toBe('2026-10-30T15:30:00.000Z');
  });

  it('pacienteToDomain devuelve estructura LSP (id como string, camelCase, detallesInstitucion)', () => {
    const rawDoc = {
      id: 'doc-123',
      data: () => ({
        cui: '2987654320101',
        nombre: 'Mariana',
        apellidos: 'Soto Hernández',
        fechaNacimiento: '1992-04-18',
        genero: 'Femenino',
        activo: true,
      }),
    };

    const domain = pacienteToDomain(rawDoc);
    expect(domain.id).toBe('doc-123');
    expect(domain.documentoIdentidad).toBe('2987654320101');
    expect(domain.detallesInstitucion.institucionId).toBe('I3');
    expect(domain.detallesInstitucion.nombreInstitucion).toBe('Laboratorio Clínico');
  });

  it('pacienteToFirestore prepara documento con timestamps y atributos normalizados', () => {
    const entidad = {
      documentoIdentidad: '2987654320101',
      nombre: 'Mariana',
      apellidos: 'Soto',
      fechaNacimiento: '1992-04-18',
      genero: 'Femenino',
      tipoSangre: 'O+',
    };

    const doc = pacienteToFirestore(entidad);
    expect(doc.documentoIdentidad).toBe('2987654320101');
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('ordenToDomain y muestraToDomain generan modelos limpios en camelCase', () => {
    const orden = ordenToDomain({
      id: 'ORD-001',
      data: () => ({
        pacienteId: 'pac-1',
        tipoLaboratorio: 'hematologia',
        estadoOrden: 'completada',
      }),
    });
    expect(orden.id).toBe('ORD-001');
    expect(orden.tipoLaboratorio).toBe('hematologia');

    const muestra = muestraToDomain({
      id: 'MUE-001',
      data: () => ({
        ordenId: 'ORD-001',
        codigoBarras: 'BAR-001-HEM',
        tipoMuestra: 'sangre_venosa',
      }),
    });
    expect(muestra.id).toBe('MUE-001');
    expect(muestra.codigoBarras).toBe('BAR-001-HEM');

    const resultado = resultadoToDomain({
      id: 'RES-001',
      data: () => ({
        ordenId: 'ORD-001',
        muestraId: 'MUE-001',
        tipoLaboratorio: 'hematologia',
        valorResultado: { hemoglobina: 14.5 },
      }),
    });
    expect(resultado.id).toBe('RES-001');
    expect(resultado.valorResultado.hemoglobina).toBe(14.5);
  });
});
