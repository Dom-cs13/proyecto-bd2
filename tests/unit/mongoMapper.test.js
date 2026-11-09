import { describe, expect, test } from 'vitest';
import { ObjectId } from 'mongodb';
import {
  pacienteToDomain,
  consultaToDomain,
  historialToDomain,
  polizaToDomain,
  doctorToDomain,
  laboratorioToDomain,
  tipoExamenToDomain,
  ordenLaboratorioToDomain,
} from '../../src/infrastructure/adapters/mongodb/mapper.js';

describe('MongoDB Mapper (Hospital General · I1)', () => {
  test('pacienteToDomain convierte _id a string y asegura camelCase', () => {
    const oid = new ObjectId('650000000000000000000001');
    const docMongo = {
      _id: oid,
      expediente: 'EXP-01842',
      nombre: 'Mariana',
      apellidos: 'Soto Hernández',
      fechaNacimiento: new Date('1990-04-18T00:00:00.000Z'),
      sexo: 'Femenino',
      direccion: 'Av. Central 45',
      telefono: 12345678,
      correo: 'mariana.soto@hospital.com',
      alergias: 'Penicilina',
      documentoIdentidad: 'DOC-12345',
      polizaSeguro: {
        idPoliza: 'POL-98421',
        porcentajeCobertura: 85,
        aseguradora: {
          nombreEmpresa: 'Seguros Universales',
        },
      },
      detallesInstitucion: {
        institucionId: 'I1',
        tipoSangre: 'O+',
      },
    };

    const dominio = pacienteToDomain(docMongo);

    expect(dominio.id).toBe('650000000000000000000001');
    expect(dominio._id).toBeUndefined();
    expect(dominio.fechaNacimiento).toBe('1990-04-18');
    expect(dominio.telefono).toBe('12345678');
    expect(dominio.polizaSeguro.aseguradora.nombreEmpresa).toBe('Seguros Universales');
    expect(dominio.detallesInstitucion.tipoSangre).toBe('O+');
  });

  test('consultaToDomain convierte la cadena completa de diagnósticos y recetas', () => {
    const oid = new ObjectId('651000000000000000000001');
    const docConsulta = {
      _id: oid,
      pacienteId: '650000000000000000000001',
      expediente: 'EXP-01842',
      fecha: new Date('2026-10-26T09:15:00.000Z'),
      motivos: 'Revisión de herida',
      observaciones: 'Evolución normal',
      servicios: [{ idServicio: 'srv-01', nombre: 'Cirugía' }],
      diagnostico: {
        idDiagnostico: 'diag-01',
        descripcion: 'Apendicitis en remisión',
        tratamiento: {
          idTratamiento: 'trat-01',
          descripcion: 'Reposo',
          fechaInicio: '2026-10-26',
          receta: {
            idReceta: 'rec-01',
            fecha: new Date('2026-10-26T09:15:00.000Z'),
            detalles: [
              {
                idDetalleR: 'det-01',
                medicamento: { nombre: 'Paracetamol' },
                dosis: '500 mg',
                frecuencia: 'Cada 8 horas',
                cantidad: 10,
              },
            ],
          },
        },
      },
    };

    const dominio = consultaToDomain(docConsulta);

    expect(dominio.id).toBe('651000000000000000000001');
    expect(dominio._id).toBeUndefined();
    expect(dominio.diagnostico.descripcion).toBe('Apendicitis en remisión');
    expect(dominio.diagnostico.tratamiento.descripcion).toBe('Reposo');
    expect(dominio.diagnostico.tratamiento.receta.detalles[0].medicamento).toBe('Paracetamol');
  });

  test('historialToDomain consolida paciente y consultas ordenadas', () => {
    const pacienteDoc = {
      _id: new ObjectId('650000000000000000000001'),
      nombre: 'Mariana',
      apellidos: 'Soto',
      estado: 'activo',
    };
    const consultasDocs = [
      {
        _id: new ObjectId('651000000000000000000001'),
        pacienteId: '650000000000000000000001',
        motivos: 'Consulta 1',
      },
    ];

    const historial = historialToDomain(pacienteDoc, consultasDocs);

    expect(historial.estado).toBe('activo');
    expect(historial.paciente.nombre).toBe('Mariana');
    expect(historial.consultas).toHaveLength(1);
    expect(historial.consultas[0].motivos).toBe('Consulta 1');
  });

  test('polizaToDomain mapea póliza y aseguradora con fecha ISO y porcentaje numérico', () => {
    const oid = new ObjectId('652000000000000000000001');
    const docPoliza = {
      _id: oid,
      idPoliza: 'POL-98421',
      cobertura: 'Hospitalaria completa',
      porcentajeCobertura: 85,
      fechaInicio: new Date('2026-01-01T00:00:00.000Z'),
      fechaVencimiento: new Date('2026-12-31T00:00:00.000Z'),
      estado: 'vigente',
      pacienteId: '650000000000000000000001',
      expediente: 'EXP-01842',
      pacienteNombre: 'Mariana Soto Hernández',
      aseguradora: {
        idAseguradora: 'ASEG-01',
        nombreEmpresa: 'Seguros Universales',
        nitIdentificador: '1234567-8',
        telefono: 23456789,
      },
    };

    const dominio = polizaToDomain(docPoliza);

    expect(dominio.id).toBe('652000000000000000000001');
    expect(dominio._id).toBeUndefined();
    expect(dominio.idPoliza).toBe('POL-98421');
    expect(dominio.porcentajeCobertura).toBe(85);
    expect(dominio.fechaInicio).toBe('2026-01-01');
    expect(dominio.fechaVencimiento).toBe('2026-12-31');
    expect(dominio.aseguradora.nombreEmpresa).toBe('Seguros Universales');
    expect(dominio.aseguradora.telefono).toBe('23456789');
    expect(dominio.pacienteNombre).toBe('Mariana Soto Hernández');
  });

  test('doctorToDomain mapea médico y colegiado cumpliendo LSP', () => {
    const oid = new ObjectId('653000000000000000000001');
    const docDoctor = {
      _id: oid,
      idColegiado: 'COL-07412',
      nombre: 'Rodrigo',
      apellidos: 'Palma',
      especialidad: 'Cirugía General',
      telefono: 23456789,
      correo: 'rodrigo.palma@hospital.com',
      horario: 'Turno Completo',
      estado: 'activo',
    };

    const dominio = doctorToDomain(docDoctor);

    expect(dominio.id).toBe('653000000000000000000001');
    expect(dominio._id).toBeUndefined();
    expect(dominio.idColegiado).toBe('COL-07412');
    expect(dominio.nombre).toBe('Rodrigo');
    expect(dominio.especialidad).toBe('Cirugía General');
    expect(dominio.telefono).toBe('23456789');
  });

  test('laboratorioToDomain y tipoExamenToDomain mapean entidades de laboratorio cumpliendo LSP', () => {
    const labOid = new ObjectId('654000000000000000000001');
    const docLab = {
      _id: labOid,
      codigo: 'LAB-HEM',
      nombre: 'Laboratorio de Hematología',
      tipo: 'Hematología',
      responsable: 'Licda. Karla Monroy',
      ubicacion: 'Nivel 2',
      telefono: 23456781,
      correo: 'lab@hospital.com',
      horario: '24 Horas',
      estado: 'activo',
    };

    const labDominio = laboratorioToDomain(docLab);
    expect(labDominio.id).toBe('654000000000000000000001');
    expect(labDominio._id).toBeUndefined();
    expect(labDominio.codigo).toBe('LAB-HEM');
    expect(labDominio.telefono).toBe('23456781');

    const exOid = new ObjectId('655000000000000000000001');
    const docExamen = {
      _id: exOid,
      codigoExamen: 'EX-HEM-01',
      laboratorioId: labOid,
      laboratorioNombre: 'Laboratorio de Hematología',
      nombre: 'Hematología Completa',
      categoria: 'Hematología',
      tipoMuestra: 'Sangre venosa',
      tiempoEstimadoHoras: 2,
      parametrosBase: ['Hemoglobina', 'Plaquetas'],
      estado: 'activo',
    };

    const examenDominio = tipoExamenToDomain(docExamen);
    expect(examenDominio.id).toBe('655000000000000000000001');
    expect(examenDominio.laboratorioId).toBe('654000000000000000000001');
    expect(examenDominio.tiempoEstimadoHoras).toBe(2);

    const ordOid = new ObjectId('656000000000000000000001');
    const docOrden = {
      _id: ordOid,
      codigoOrden: 'ORD-9921',
      pacienteId: 'pac-01',
      pacienteNombre: 'Mariana Soto',
      tipoExamen: 'Hematología Completa',
      fechaOrden: new Date('2026-10-25T10:00:00.000Z'),
      estado: 'Completado',
      valores: [{ parametro: 'Hemoglobina', valor: '13.2', referencia: '12-15', estado: 'normal' }],
    };

    const ordenDominio = ordenLaboratorioToDomain(docOrden);
    expect(ordenDominio.id).toBe('656000000000000000000001');
    expect(ordenDominio.fechaOrden).toBe('2026-10-25T10:00:00.000Z');
    expect(ordenDominio.valores).toHaveLength(1);
  });
});
