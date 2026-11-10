/**
 * @file FirestoreAdapter.js
 * Adaptador de persistencia para Firebase Firestore (Institución I3: Laboratorio Clínico).
 * Implementa el puerto HistorialRepository respetando Liskov Substitution Principle (LSP).
 */

import { HistorialRepository } from '../../../domain/ports/HistorialRepository.js';
import { MotorNoDisponible, NoEncontrado, Conflicto } from '../../../domain/errores.js';
import { obtenerFirestore } from '../../config/firebase.js';
import { pacienteToDomain, pacienteToFirestore, aFechaIso } from './mapper.js';
import { randomUUID } from 'node:crypto';

export class FirestoreAdapter extends HistorialRepository {
  /**
   * @param {import('firebase-admin').firestore.Firestore} [db]
   */
  constructor(db = null) {
    super();
    this._db = db;
  }

  get db() {
    if (!this._db) {
      try {
        this._db = obtenerFirestore();
      } catch (err) {
        if (err instanceof MotorNoDisponible) throw err;
        throw new MotorNoDisponible('laboratorio', err.message);
      }
    }
    return this._db;
  }

  /**
   * Envuelve una llamada a Firestore para atrapar errores y lanzar MotorNoDisponible.
   * @private
   */
  async _ejecutar(operacion) {
    try {
      return await operacion(this.db);
    } catch (err) {
      if (err instanceof MotorNoDisponible || err instanceof NoEncontrado || err instanceof Conflicto) {
        throw err;
      }
      throw new MotorNoDisponible('laboratorio', err.message);
    }
  }

  /**
   * Crea un nuevo paciente en la colección 'pacientes'.
   */
  async crearPaciente(datos) {
    return this._ejecutar(async (db) => {
      const docIdentidad = datos.documentoIdentidad || datos.cui;
      // Verificar unicidad de documento de identidad
      const existente = await db.collection('pacientes')
        .where('documentoIdentidad', '==', docIdentidad)
        .limit(1)
        .get();

      if (!existente.empty) {
        throw new Conflicto('PACIENTE_DUPLICADO', `Ya existe un paciente con documento de identidad ${docIdentidad}`);
      }

      const id = datos.id || randomUUID();
      const docRef = db.collection('pacientes').doc(id);
      const dataFirestore = pacienteToFirestore({ ...datos, id });

      await docRef.set(dataFirestore);
      const snapshot = await docRef.get();
      return pacienteToDomain(snapshot);
    });
  }

  /**
   * Obtiene un paciente por su identificador.
   */
  async obtenerPaciente(id) {
    return this._ejecutar(async (db) => {
      const doc = await db.collection('pacientes').doc(id).get();
      if (!doc.exists) return null;
      return pacienteToDomain(doc);
    });
  }

  async actualizarPaciente(id, datos) {
    return this._ejecutar(async (db) => {
      const ref = db.collection('pacientes').doc(id);
      if (!(await ref.get()).exists) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
      await ref.update({ ...datos, updatedAt: new Date().toISOString() });
      return pacienteToDomain(await ref.get());
    });
  }

  /**
   * Lista pacientes con filtros opcionales.
   */
  async listarPacientes(filtro = {}) {
    return this._ejecutar(async (db) => {
      let query = db.collection('pacientes');

      if (filtro.documento) {
        query = query.where('documentoIdentidad', '==', filtro.documento);
      }

      if (filtro.estado === 'activo') {
        query = query.where('activo', '==', true);
      } else if (filtro.estado === 'archivado') {
        query = query.where('activo', '==', false);
      }

      const snapshot = await query.get();
      let docs = snapshot.docs.map(pacienteToDomain);

      if (filtro.texto) {
        const t = filtro.texto.toLowerCase();
        docs = docs.filter((p) =>
          p.nombre.toLowerCase().includes(t) ||
          p.apellidos.toLowerCase().includes(t) ||
          p.documentoIdentidad.includes(t)
        );
      }

      const total = docs.length;
      const pagina = Math.max(1, filtro.pagina || 1);
      const limite = Math.max(1, filtro.limite || 20);
      const inicio = (pagina - 1) * limite;
      const items = docs.slice(inicio, inicio + limite);

      return { items, total };
    });
  }

  /**
   * Obtiene el historial clínico consolidado de un paciente.
   */
  async obtenerHistorial(pacienteId) {
    return this._ejecutar(async (db) => {
      const pDoc = await db.collection('pacientes').doc(pacienteId).get();
      if (!pDoc.exists) {
        throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
      }

      const paciente = pacienteToDomain(pDoc);
      // Consultas / Estudios del paciente
      const consultasSnap = await db.collection('pacientes').doc(pacienteId)
        .collection('consultas')
        .orderBy('fecha', 'desc')
        .get();

      const consultas = consultasSnap.docs.map((d) => {
        const dat = d.data();
        return {
          id: d.id,
          fecha: aFechaIso(dat.fecha),
          motivo: dat.motivo || '',
          medico: dat.medico || '',
          observaciones: dat.observaciones || '',
          diagnosticos: Array.isArray(dat.diagnosticos) ? dat.diagnosticos : [],
          recetas: Array.isArray(dat.recetas) ? dat.recetas : [],
        };
      });

      return {
        paciente,
        estado: paciente.activo ? 'activo' : 'archivado',
        fechaArchivo: paciente.fechaBaja || null,
        motivoArchivo: paciente.motivoBaja
          ? { tipo: 'administrativo', detalle: paciente.motivoBaja }
          : null,
        consultas,
      };
    });
  }

  /**
   * Archiva el expediente de un paciente con motivo formal mediante writeBatch.
   */
  async archivarHistorial(pacienteId, motivo) {
    return this._ejecutar(async (db) => {
      const pRef = db.collection('pacientes').doc(pacienteId);
      const doc = await pRef.get();
      if (!doc.exists) {
        throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${pacienteId} no encontrado`);
      }

      const ahora = new Date().toISOString();
      const detalle = typeof motivo === 'string' ? motivo : (motivo?.detalle || motivo?.tipo || 'Archivado');

      const batch = db.batch();
      batch.update(pRef, {
        activo: false,
        motivoBaja: detalle,
        fechaBaja: ahora,
        updatedAt: ahora,
      });

      await batch.commit();
      return this.obtenerHistorial(pacienteId);
    });
  }

  /**
   * Registra una nueva consulta.
   */
  async crearConsulta(datos) {
    return this._ejecutar(async (db) => {
      const pacienteId = datos.pacienteId;
      const id = datos.id || randomUUID();
      const cRef = db.collection('pacientes').doc(pacienteId).collection('consultas').doc(id);

      const nueva = {
        fecha: datos.fecha || new Date().toISOString(),
        motivo: datos.motivo || '',
        medico: datos.medico || '',
        observaciones: datos.observaciones || '',
        diagnosticos: [],
        recetas: [],
        createdAt: new Date().toISOString(),
      };

      await cRef.set(nueva);
      return { id, pacienteId, ...nueva };
    });
  }

  /**
   * Agrega un diagnóstico a una consulta clínica de forma atómica.
   */
  async agregarDiagnostico(consultaId, datos) {
    return this._ejecutar(async (db) => {
      // Buscar la consulta en las subcolecciones
      const snap = await db.collectionGroup('consultas').get();
      const doc = snap.docs.find((d) => d.id === consultaId);
      if (!doc) {
        throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `Consulta ${consultaId} no encontrada`);
      }

      const id = datos.id || randomUUID();
      const diagnostico = {
        id,
        codigoCie: datos.codigoCie || '',
        descripcion: datos.descripcion || '',
        tratamientos: [],
      };

      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(doc.ref);
        const diags = fresh.data().diagnosticos || [];
        diags.push(diagnostico);
        transaction.update(doc.ref, { diagnosticos: diags, updatedAt: new Date().toISOString() });
      });

      return diagnostico;
    });
  }

  /**
   * Registra un tratamiento asociado a un diagnóstico.
   */
  async registrarTratamiento(diagnosticoId, datos) {
    return this._ejecutar(async (db) => {
      const snap = await db.collectionGroup('consultas').get();
      let targetDoc = null;
      let targetDiag = null;

      for (const d of snap.docs) {
        const diags = d.data().diagnosticos || [];
        const encontrado = diags.find((x) => x.id === diagnosticoId);
        if (encontrado) {
          targetDoc = d;
          targetDiag = encontrado;
          break;
        }
      }

      if (!targetDoc || !targetDiag) {
        throw new NoEncontrado('DIAGNOSTICO_NO_ENCONTRADO', `Diagnóstico ${diagnosticoId} no encontrado`);
      }

      const id = datos.id || randomUUID();
      const tratamiento = {
        id,
        descripcion: datos.descripcion || '',
        diasDuracion: datos.diasDuracion || 1,
        fechaInicio: datos.fechaInicio || new Date().toISOString().slice(0, 10),
        fechaFin: datos.fechaFin || null,
      };

      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(targetDoc.ref);
        const diags = fresh.data().diagnosticos || [];
        const d = diags.find((x) => x.id === diagnosticoId);
        if (d) {
          d.tratamientos = d.tratamientos || [];
          d.tratamientos.push(tratamiento);
          transaction.update(targetDoc.ref, { diagnosticos: diags, updatedAt: new Date().toISOString() });
        }
      });

      return tratamiento;
    });
  }

  /**
   * Emite una receta con sus medicamentos para una consulta.
   */
  async recetarMedicamento(consultaId, datos) {
    return this._ejecutar(async (db) => {
      const snap = await db.collectionGroup('consultas').get();
      const doc = snap.docs.find((d) => d.id === consultaId);
      if (!doc) {
        throw new NoEncontrado('CONSULTA_NO_ENCONTRADA', `Consulta ${consultaId} no encontrada`);
      }

      const id = datos.id || randomUUID();
      const receta = {
        id,
        medicamentos: Array.isArray(datos.medicamentos) ? datos.medicamentos : (datos.detalles || []),
        fechaEmision: new Date().toISOString(),
      };

      await db.runTransaction(async (transaction) => {
        const fresh = await transaction.get(doc.ref);
        const recetas = fresh.data().recetas || [];
        recetas.push(receta);
        transaction.update(doc.ref, { recetas, updatedAt: new Date().toISOString() });
      });

      return receta;
    });
  }

  /**
   * Diagnóstico de conexión y latencia para panel técnico y aislamiento.
   */
  async ping() {
    const inicio = Date.now();
    try {
      // Operación liviana de prueba
      await this.db.collection('pacientes').limit(1).get();
      return {
        ok: true,
        motor: 'firestore',
        latenciaMs: Date.now() - inicio,
      };
    } catch (err) {
      return {
        ok: false,
        motor: 'firestore',
        latenciaMs: Date.now() - inicio,
        error: err.message,
      };
    }
  }
}
