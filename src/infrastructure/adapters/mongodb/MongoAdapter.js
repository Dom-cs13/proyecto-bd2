import { ObjectId } from 'mongodb';
import { obtenerConexionMongo } from './connection.js';
import { pacienteToDomain, consultaToDomain, historialToDomain } from './mapper.js';
import { NoEncontrado, Conflicto } from '../../../domain/errores.js';

export class MongoAdapter {
  constructor() {
    this.institucion = 'Hospital General';
    this.motor = 'MongoDB Atlas';
  }

  async _getDb() {
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

    const doc = {
      ...datos,
      pacienteId: paciente.id,
      expediente: paciente.expediente,
      fecha: datos.fecha ? new Date(datos.fecha) : new Date(),
    };

    const resultado = await db.collection('consultas').insertOne(doc);
    doc._id = resultado.insertedId;
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
      tratamiento: null,
    };

    await db.collection('consultas').updateOne(query, {
      $set: { diagnostico },
    });

    return {
      id: diagnostico.idDiagnostico,
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

    await db.collection('consultas').updateOne(query, {
      $set: { 'diagnostico.tratamiento': tratamiento },
    });

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

    const receta = {
      idReceta: `rec-${Date.now()}`,
      fecha: new Date(),
      detalles: datos.detalles || [],
    };

    await db.collection('consultas').updateOne(query, {
      $set: { 'diagnostico.tratamiento.receta': receta },
    });

    return {
      id: receta.idReceta,
      fecha: receta.fecha.toISOString(),
      detalles: receta.detalles,
    };
  }
}

