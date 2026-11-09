import { ObjectId } from 'mongodb';
import { obtenerConexionMongo } from './connection.js';
import {
  pacienteToDomain,
  consultaToDomain,
  historialToDomain,
  polizaToDomain,
  doctorToDomain,
  laboratorioToDomain,
  tipoExamenToDomain,
  ordenLaboratorioToDomain,
} from './mapper.js';
import { NoEncontrado, Conflicto } from '../../../domain/errores.js';

export class MongoAdapter {
  constructor(db = null, cliente = null) {
    this.institucion = 'Hospital General';
    this.motor = 'MongoDB Atlas';
    this._dbInyectada = db;
    this._clienteInyectado = cliente;
  }

  async _getDb() {
    if (this._dbInyectada) return this._dbInyectada;
    const { db } = await obtenerConexionMongo();
    return db;
  }

  _parseId(id) {
    if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
      return new ObjectId(id);
    }
    return id;
  }

  async ping() {
    const inicio = Date.now();
    const db = await this._getDb();
    await db.command({ ping: 1 });
    return {
      ok: true,
      motor: this.motor,
      institucion: this.institucion,
      latenciaMs: Date.now() - inicio,
    };
  }

  async crearPaciente(datos) {
    const db = await this._getDb();
    const documentoIdentidad = datos.documentoIdentidad || datos.curp;

    if (documentoIdentidad) {
      const duplicado = await db.collection('pacientes').findOne({
        $or: [{ documentoIdentidad }, { curp: documentoIdentidad }],
      });
      if (duplicado) {
        throw new Conflicto('PACIENTE_DUPLICADO', `Ya existe un paciente con documento ${documentoIdentidad}`);
      }
    }

    const doc = {
      ...datos,
      documentoIdentidad,
      estado: 'activo',
      fechaCreacion: new Date(),
    };

    const resultado = await db.collection('pacientes').insertOne(doc);
    doc._id = resultado.insertedId;
    return pacienteToDomain(doc);
  }

  async obtenerPaciente(id) {
    const db = await this._getDb();
    const query = {
      $or: [
        { _id: this._parseId(id) },
        { expediente: id },
        { documentoIdentidad: id },
      ],
    };

    const doc = await db.collection('pacientes').findOne(query);
    return doc ? pacienteToDomain(doc) : null;
  }

  async listarPacientes(filtro = {}) {
    const db = await this._getDb();
    const query = {};

    if (filtro.estado) {
      query.estado = filtro.estado;
    }

    if (filtro.documento) {
      query.$or = [
        { documentoIdentidad: filtro.documento },
        { curp: filtro.documento },
      ];
    }

    if (filtro.texto) {
      const regex = new RegExp(filtro.texto, 'i');
      query.$or = [
        { nombre: regex },
        { apellidos: regex },
        { expediente: regex },
        { documentoIdentidad: regex },
      ];
    }

    const limite = filtro.limite ? Number(filtro.limite) : 50;
    const pagina = filtro.pagina ? Number(filtro.pagina) : 1;
    const saltar = (pagina - 1) * limite;

    const total = await db.collection('pacientes').countDocuments(query);
    const docs = await db.collection('pacientes')
      .find(query)
      .skip(saltar)
      .limit(limite)
      .toArray();

    return {
      items: docs.map(pacienteToDomain),
      total,
      pagina,
      limite,
    };
  }

  async obtenerHistorial(pacienteId) {
    const db = await this._getDb();
    const pacienteDoc = await db.collection('pacientes').findOne({
      $or: [
        { _id: this._parseId(pacienteId) },
        { expediente: pacienteId },
        { documentoIdentidad: pacienteId },
      ],
    });

    if (!pacienteDoc) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `No se encontró el paciente ${pacienteId}`);
    }

    const pidString = pacienteDoc._id.toString();
    const consultasDocs = await db.collection('consultas')
      .find({
        $or: [
          { pacienteId: pidString },
          { pacienteId: pacienteDoc._id },
          { expediente: pacienteDoc.expediente },
        ],
      })
      .sort({ fecha: -1 })
      .toArray();

    return historialToDomain(pacienteDoc, consultasDocs);
  }

  async archivarHistorial(pacienteId, motivo) {
    const db = await this._getDb();
    const query = {
      $or: [
        { _id: this._parseId(pacienteId) },
        { expediente: pacienteId },
      ],
    };

    const pacienteDoc = await db.collection('pacientes').findOne(query);
    if (!pacienteDoc) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `No se encontró el paciente ${pacienteId}`);
    }

    const fechaArchivo = new Date();
    await db.collection('pacientes').updateOne(query, {
      $set: {
        estado: 'archivado',
        fechaArchivo,
        motivoArchivo: motivo,
      },
    });

    pacienteDoc.estado = 'archivado';
    pacienteDoc.fechaArchivo = fechaArchivo;
    pacienteDoc.motivoArchivo = motivo;

    const pidString = pacienteDoc._id.toString();
    const consultasDocs = await db.collection('consultas')
      .find({
        $or: [
          { pacienteId: pidString },
          { expediente: pacienteDoc.expediente },
        ],
      })
      .toArray();

    return historialToDomain(pacienteDoc, consultasDocs);
  }

  async crearConsulta(datos) {
    const db = await this._getDb();
    const paciente = await this.obtenerPaciente(datos.pacienteId);

    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `No existe el paciente con ID ${datos.pacienteId}`);
    }

    if (paciente.estado === 'archivado') {
      throw new Conflicto('PACIENTE_ARCHIVADO', 'No se pueden crear consultas para un paciente archivado');
    }

    const doc = {
      ...datos,
      pacienteId: paciente.id,
      expediente: paciente.expediente,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
    };

    const cliente = this._clienteInyectado;
    if (cliente && typeof cliente.startSession === 'function') {
      const session = cliente.startSession();
      try {
        await session.withTransaction(async () => {
          const resultado = await db.collection('consultas').insertOne(doc, { session });
          doc._id = resultado.insertedId;
        });
      } finally {
        await session.endSession();
      }
    } else {
      const resultado = await db.collection('consultas').insertOne(doc);
      doc._id = resultado.insertedId;
    }

    return consultaToDomain(doc);
  }

  async agregarDiagnostico(consultaId, datos) {
    const db = await this._getDb();
    const query = { _id: this._parseId(consultaId) };

    const consulta = await db.collection('consultas').findOne(query);
    if (!consulta) {
      throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `No existe la consulta ${consultaId}`);
    }

    const diagnostico = {
      idDiagnostico: `diag-${Date.now()}`,
      ...datos,
      codigoCie: datos.codigoCie || datos.codigo || null,
      tratamiento: null,
    };

    const cliente = this._clienteInyectado;
    if (cliente && typeof cliente.startSession === 'function') {
      const session = cliente.startSession();
      try {
        await session.withTransaction(async () => {
          await db.collection('consultas').updateOne(query, { $set: { diagnostico } }, { session });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await db.collection('consultas').updateOne(query, { $set: { diagnostico } });
    }

    return {
      id: diagnostico.idDiagnostico,
      codigoCie: diagnostico.codigoCie,
      descripcion: diagnostico.descripcion,
      observaciones: diagnostico.observaciones || '',
    };
  }

  async registrarTratamiento(diagnosticoId, datos) {
    const db = await this._getDb();
    const query = {
      $or: [
        { 'diagnostico.idDiagnostico': diagnosticoId },
        { 'diagnostico.id': diagnosticoId },
      ],
    };

    const consulta = await db.collection('consultas').findOne(query);
    if (!consulta) {
      throw new NoEncontrado('DIAGNOSTICO_NO_ENCONTRADO', `No existe el diagnóstico ${diagnosticoId}`);
    }

    const tratamiento = {
      idTratamiento: `trat-${Date.now()}`,
      ...datos,
      fechaInicio: datos.fechaInicio || new Date().toISOString().slice(0, 10),
    };

    const cliente = this._clienteInyectado;
    if (cliente && typeof cliente.startSession === 'function') {
      const session = cliente.startSession();
      try {
        await session.withTransaction(async () => {
          await db.collection('consultas').updateOne(query, { $set: { 'diagnostico.tratamiento': tratamiento } }, { session });
        });
      } finally {
        await session.endSession();
      }
    } else {
      await db.collection('consultas').updateOne(query, { $set: { 'diagnostico.tratamiento': tratamiento } });
    }

    return {
      id: tratamiento.idTratamiento,
      descripcion: tratamiento.descripcion,
      observaciones: tratamiento.observaciones || '',
      fechaInicio: tratamiento.fechaInicio,
      fechaFin: tratamiento.fechaFin || null,
    };
  }

  async recetarMedicamento(consultaId, datos) {
    const db = await this._getDb();
    const query = { _id: this._parseId(consultaId) };

    const consulta = await db.collection('consultas').findOne(query);
    if (!consulta) {
      throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `No existe la consulta ${consultaId}`);
    }

    const medicamentos = datos.medicamentos || datos.detalles || [];
    const receta = {
      idReceta: `rec-${Date.now()}`,
      fecha: new Date(),
      medicamentos,
      detalles: medicamentos,
    };

    const cliente = this._clienteInyectado;
    if (cliente && typeof cliente.startSession === 'function') {
      const session = cliente.startSession();
      try {
        await session.withTransaction(async () => {
          await db.collection('consultas').updateOne(
            query,
            { $set: { 'diagnostico.tratamiento.receta': receta } },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
    } else {
      await db.collection('consultas').updateOne(query, {
        $set: { 'diagnostico.tratamiento.receta': receta },
      });
    }

    return {
      id: receta.idReceta,
      fecha: receta.fecha.toISOString(),
      detalles: receta.detalles,
      medicamentos: receta.medicamentos,
    };
  }

  async crearPoliza(datos) {
    const db = await this._getDb();
    const idPoliza = datos.idPoliza;

    if (idPoliza) {
      const duplicada = await db.collection('polizas').findOne({ idPoliza });
      if (duplicada) {
        throw new Conflicto('POLIZA_DUPLICADA', `Ya existe una póliza con identificador ${idPoliza}`);
      }
    }

    const doc = {
      ...datos,
      estado: datos.estado || 'vigente',
      fechaCreacion: new Date(),
    };

    const resultado = await db.collection('polizas').insertOne(doc);
    doc._id = resultado.insertedId;

    if (datos.pacienteId) {
      await this.asociarPolizaPaciente(doc.idPoliza, datos.pacienteId);
    }

    return polizaToDomain(doc);
  }

  async listarPolizas(filtro = {}) {
    const db = await this._getDb();
    const query = {};

    if (filtro.estado) {
      query.estado = filtro.estado;
    }

    if (filtro.texto) {
      const regex = new RegExp(filtro.texto, 'i');
      query.$or = [
        { idPoliza: regex },
        { 'aseguradora.nombreEmpresa': regex },
        { cobertura: regex },
        { pacienteNombre: regex },
        { expediente: regex },
      ];
    }

    const docs = await db.collection('polizas').find(query).toArray();
    return docs.map(polizaToDomain);
  }

  async asociarPolizaPaciente(idPoliza, pacienteId) {
    const db = await this._getDb();
    const queryPoliza = {
      $or: [
        { _id: this._parseId(idPoliza) },
        { idPoliza },
      ],
    };

    const poliza = await db.collection('polizas').findOne(queryPoliza);
    if (!poliza) {
      throw new NoEncontrado('POLIZA_NO_ENCONTRADA', `No existe la póliza ${idPoliza}`);
    }

    const queryPaciente = {
      $or: [
        { _id: this._parseId(pacienteId) },
        { expediente: pacienteId },
        { documentoIdentidad: pacienteId },
      ],
    };

    const paciente = await db.collection('pacientes').findOne(queryPaciente);
    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `No existe el paciente ${pacienteId}`);
    }

    const polizaSeguro = {
      idPoliza: poliza.idPoliza,
      cobertura: poliza.cobertura,
      porcentajeCobertura: poliza.porcentajeCobertura,
      fechaInicio: poliza.fechaInicio,
      fechaVencimiento: poliza.fechaVencimiento,
      estado: poliza.estado,
      aseguradora: { ...poliza.aseguradora },
    };

    await db.collection('pacientes').updateOne(queryPaciente, {
      $set: {
        polizaSeguro,
        'detallesInstitucion.seguro': {
          aseguradora: poliza.aseguradora?.nombreEmpresa || '',
          poliza: poliza.idPoliza,
          cobertura: poliza.porcentajeCobertura,
        },
      },
    });

    await db.collection('polizas').updateOne(queryPoliza, {
      $set: {
        pacienteId: paciente._id.toString(),
        expediente: paciente.expediente,
        pacienteNombre: `${paciente.nombre} ${paciente.apellidos}`,
      },
    });

    poliza.pacienteId = paciente._id.toString();
    poliza.expediente = paciente.expediente;
    poliza.pacienteNombre = `${paciente.nombre} ${paciente.apellidos}`;

    return polizaToDomain(poliza);
  }

  async crearDoctor(datos) {
    const db = await this._getDb();
    const idColegiado = datos.idColegiado;

    if (idColegiado) {
      const duplicado = await db.collection('doctores').findOne({ idColegiado });
      if (duplicado) {
        throw new Conflicto('DOCTOR_DUPLICADO', `Ya existe un médico con número de colegiado ${idColegiado}`);
      }
    }

    const doc = {
      ...datos,
      estado: datos.estado || 'activo',
      institucionId: 'I1',
      fechaCreacion: new Date(),
    };

    const resultado = await db.collection('doctores').insertOne(doc);
    doc._id = resultado.insertedId;
    return doctorToDomain(doc);
  }

  async listarDoctores(filtro = {}) {
    const db = await this._getDb();
    const query = {};

    if (filtro.estado) {
      query.estado = filtro.estado;
    }

    if (filtro.especialidad) {
      query.especialidad = filtro.especialidad;
    }

    if (filtro.texto) {
      const regex = new RegExp(filtro.texto, 'i');
      query.$or = [
        { nombre: regex },
        { apellidos: regex },
        { idColegiado: regex },
        { especialidad: regex },
      ];
    }

    const docs = await db.collection('doctores').find(query).toArray();
    return docs.map(doctorToDomain);
  }

  async obtenerDoctor(id) {
    const db = await this._getDb();
    const query = {
      $or: [
        { _id: this._parseId(id) },
        { idColegiado: id },
      ],
    };

    const doc = await db.collection('doctores').findOne(query);
    return doc ? doctorToDomain(doc) : null;
  }

  // --- MÓDULO DE LABORATORIOS Y EXÁMENES ---

  async crearLaboratorio(datos) {
    const db = await this._getDb();
    const codigo = datos.codigo;

    if (codigo) {
      const duplicado = await db.collection('laboratorios').findOne({ codigo });
      if (duplicado) {
        throw new Conflicto('LABORATORIO_DUPLICADO', `Ya existe una unidad de laboratorio con el código ${codigo}`);
      }
    }

    const doc = {
      ...datos,
      estado: datos.estado || 'activo',
      institucionId: 'I1',
      fechaCreacion: new Date(),
    };

    const resultado = await db.collection('laboratorios').insertOne(doc);
    doc._id = resultado.insertedId;
    return laboratorioToDomain(doc);
  }

  async listarLaboratorios(filtro = {}) {
    const db = await this._getDb();
    const query = {};

    if (filtro.tipo) {
      query.tipo = filtro.tipo;
    }

    if (filtro.estado) {
      query.estado = filtro.estado;
    }

    if (filtro.texto) {
      const regex = new RegExp(filtro.texto, 'i');
      query.$or = [
        { nombre: regex },
        { codigo: regex },
        { responsable: regex },
        { tipo: regex },
      ];
    }

    const docs = await db.collection('laboratorios').find(query).toArray();
    return docs.map(laboratorioToDomain);
  }

  async obtenerLaboratorio(id) {
    const db = await this._getDb();
    const query = {
      $or: [
        { _id: this._parseId(id) },
        { codigo: id },
      ],
    };

    const doc = await db.collection('laboratorios').findOne(query);
    return doc ? laboratorioToDomain(doc) : null;
  }

  async crearTipoExamen(datos) {
    const db = await this._getDb();
    const codigoExamen = datos.codigoExamen;

    if (codigoExamen) {
      const duplicado = await db.collection('tipos_examenes').findOne({ codigoExamen });
      if (duplicado) {
        throw new Conflicto('EXAMEN_DUPLICADO', `Ya existe un tipo de examen con el código ${codigoExamen}`);
      }
    }

    let labNombre = datos.laboratorioNombre || '';
    if (datos.laboratorioId && !labNombre) {
      const lab = await this.obtenerLaboratorio(datos.laboratorioId);
      if (lab) labNombre = lab.nombre;
    }

    const doc = {
      ...datos,
      laboratorioNombre: labNombre,
      tiempoEstimadoHoras: Number(datos.tiempoEstimadoHoras) || 4,
      parametrosBase: Array.isArray(datos.parametrosBase) ? datos.parametrosBase : [],
      estado: datos.estado || 'activo',
      institucionId: 'I1',
      fechaCreacion: new Date(),
    };

    const resultado = await db.collection('tipos_examenes').insertOne(doc);
    doc._id = resultado.insertedId;
    return tipoExamenToDomain(doc);
  }

  async listarTiposExamenes(filtro = {}) {
    const db = await this._getDb();
    const query = {};

    if (filtro.laboratorioId) {
      query.$or = [
        { laboratorioId: filtro.laboratorioId },
        { laboratorioCodigo: filtro.laboratorioId },
      ];
    }

    if (filtro.categoria) {
      query.categoria = filtro.categoria;
    }

    if (filtro.estado) {
      query.estado = filtro.estado;
    }

    if (filtro.texto) {
      const regex = new RegExp(filtro.texto, 'i');
      query.$or = [
        { nombre: regex },
        { codigoExamen: regex },
        { categoria: regex },
        { laboratorioNombre: regex },
      ];
    }

    const docs = await db.collection('tipos_examenes').find(query).toArray();
    return docs.map(tipoExamenToDomain);
  }

  async crearOrdenLaboratorio(datos) {
    const db = await this._getDb();
    const paciente = await this.obtenerPaciente(datos.pacienteId);

    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `No existe el paciente con ID ${datos.pacienteId}`);
    }

    const expNum = Math.floor(1000 + Math.random() * 9000);
    const codigoOrden = datos.codigoOrden || `ORD-${expNum}`;

    const doc = {
      ...datos,
      codigoOrden,
      pacienteId: paciente.id,
      expediente: paciente.expediente,
      pacienteNombre: `${paciente.nombre} ${paciente.apellidos}`,
      fechaOrden: datos.fechaOrden ? new Date(datos.fechaOrden) : new Date(),
      fechaResultado: datos.fechaResultado ? new Date(datos.fechaResultado) : null,
      estado: datos.estado || 'En proceso',
      prioridad: datos.prioridad || 'Normal',
      valores: Array.isArray(datos.valores) ? datos.valores : [],
      institucionId: 'I1',
    };

    const resultado = await db.collection('ordenes_laboratorio').insertOne(doc);
    doc._id = resultado.insertedId;
    return ordenLaboratorioToDomain(doc);
  }

  async listarOrdenesLaboratorio(filtro = {}) {
    const db = await this._getDb();
    const query = {};

    if (filtro.pacienteId) {
      query.pacienteId = filtro.pacienteId;
    }

    if (filtro.laboratorioId) {
      query.laboratorioId = filtro.laboratorioId;
    }

    if (filtro.estado) {
      query.estado = filtro.estado;
    }

    if (filtro.texto) {
      const regex = new RegExp(filtro.texto, 'i');
      query.$or = [
        { codigoOrden: regex },
        { pacienteNombre: regex },
        { expediente: regex },
        { tipoExamen: regex },
        { solicitante: regex },
        { laboratorioNombre: regex },
      ];
    }

    const docs = await db.collection('ordenes_laboratorio').find(query).sort({ fechaOrden: -1 }).toArray();
    return docs.map(ordenLaboratorioToDomain);
  }

  async obtenerPacientesPorLaboratorio() {
    const db = await this._getDb();
    const ordenes = await db.collection('ordenes_laboratorio').find({}).toArray();

    const agrupado = {};
    for (const ord of ordenes) {
      const labKey = ord.laboratorioNombre || ord.laboratorioId || 'Laboratorio Central';
      if (!agrupado[labKey]) {
        agrupado[labKey] = {
          laboratorio: labKey,
          laboratorioId: ord.laboratorioId || '',
          pacientes: {},
          totalOrdenes: 0,
        };
      }
      agrupado[labKey].totalOrdenes++;

      const pacKey = ord.pacienteId || ord.expediente;
      if (!agrupado[labKey].pacientes[pacKey]) {
        agrupado[labKey].pacientes[pacKey] = {
          pacienteId: ord.pacienteId,
          pacienteNombre: ord.pacienteNombre,
          expediente: ord.expediente,
          examenes: [],
        };
      }
      agrupado[labKey].pacientes[pacKey].examenes.push({
        codigoOrden: ord.codigoOrden,
        tipoExamen: ord.tipoExamen,
        fechaOrden: ord.fechaOrden,
        estado: ord.estado,
      });
    }

    return Object.values(agrupado).map(g => ({
      ...g,
      pacientes: Object.values(g.pacientes),
      totalPacientes: Object.keys(g.pacientes).length,
    }));
  }
}

