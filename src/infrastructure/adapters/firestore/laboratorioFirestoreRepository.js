/**
 * @file laboratorioFirestoreRepository.js
 * Repositorio especializado para órdenes, muestras y resultados del Laboratorio Clínico.
 * Integra las 10 reglas de negocio con persistencia en Firebase Firestore.
 */

import { randomUUID } from 'node:crypto';
import { obtenerFirestore } from '../../config/firebase.js';
import { MotorNoDisponible, NoEncontrado, Validacion } from '../../../domain/errores.js';
import {
  ordenToDomain,
  muestraToDomain,
  resultadoToDomain,
} from './mapper.js';
import {
  validarRegla1_ExamenesMinimos,
  validarRegla2_MuestraVinculada,
  validarRegla3_CondicionParaValidar,
  validarRegla6_Antibiograma,
  validarRegla7_ValidacionTecnica,
  aplicarRegla8_VersionadoResultado,
  validarRegla9_CompatibilidadMuestra,
  validarRegla10_CamposPorTipo,
  evaluarAlertaCritica,
  obtenerRangoReferencia,
  calcularFlagAnormalidad,
} from '../../../domain/rules/reglasLaboratorio.js';

export class LaboratorioFirestoreRepository {
  /**
   * @param {import('firebase-admin').firestore.Firestore} [db]
   */
  constructor(db = null) {
    this._db = db;
  }

  get db() {
    if (!this._db) {
      this._db = obtenerFirestore();
    }
    return this._db;
  }

  async _ejecutar(operacion) {
    try {
      return await operacion(this.db);
    } catch (err) {
      if (err instanceof MotorNoDisponible || err instanceof NoEncontrado || err instanceof Validacion) {
        throw err;
      }
      throw new MotorNoDisponible('laboratorio', err.message);
    }
  }

  /**
   * Registra una orden de examen para un paciente.
   * Aplica Regla 1 (al menos un examen con tipo válido).
   */
  async crearOrden(datos) {
    return this._ejecutar(async (db) => {
      validarRegla1_ExamenesMinimos(datos);

      const id = datos.id || randomUUID();
      const numeroOrden = datos.numeroOrden || `ORD-${Date.now().toString().slice(-6)}`;
      const ahora = new Date().toISOString();

      const docData = {
        id,
        numeroOrden,
        pacienteId: datos.pacienteId || datos.pacienteCui,
        fechaSolicitud: datos.fechaSolicitud || ahora.slice(0, 10),
        medicoSolicitante: datos.medicoSolicitante,
        especialidadSolicitante: datos.especialidadSolicitante || 'Medicina General',
        tipoLaboratorio: datos.tipoLaboratorio,
        examenesSolicitados: datos.examenesSolicitados,
        prioridad: datos.prioridad || 'rutina',
        observacionesOrden: datos.observacionesOrden || '',
        estadoOrden: datos.estadoOrden || 'pendiente',
        createdAt: ahora,
        updatedAt: ahora,
      };

      await db.collection('ordenes').doc(id).set(docData);
      return ordenToDomain(docData);
    });
  }

  /**
   * Obtiene una orden con sus muestras y resultados vinculados.
   */
  async obtenerOrden(ordenId) {
    return this._ejecutar(async (db) => {
      const doc = await db.collection('ordenes').doc(ordenId).get();
      if (!doc.exists) return null;

      // Cargar muestras vinculadas
      const muestrasSnap = await db.collection('muestras').where('ordenId', '==', ordenId).get();
      const muestras = muestrasSnap.docs.map(muestraToDomain);

      // Cargar resultados vinculados
      const resSnap = await db.collection('resultados').where('ordenId', '==', ordenId).get();
      const resultados = resSnap.docs.map(resultadoToDomain);

      return ordenToDomain(doc, muestras, resultados);
    });
  }

  /**
   * Lista órdenes con filtros opcionales.
   */
  async listarOrdenes(filtro = {}) {
    return this._ejecutar(async (db) => {
      let q = db.collection('ordenes');
      if (filtro.pacienteId) q = q.where('pacienteId', '==', filtro.pacienteId);
      if (filtro.tipoLaboratorio) q = q.where('tipoLaboratorio', '==', filtro.tipoLaboratorio);
      if (filtro.estado) q = q.where('estadoOrden', '==', filtro.estado);

      const snapshot = await q.get();
      return Promise.all(snapshot.docs.map((d) => this.obtenerOrden(d.id)));
    });
  }

  /**
   * Registra una muestra asociada a una orden.
   * Aplica Regla 2 (vinculada y código de barras único) y Regla 9 (compatibilidad).
   */
  async registrarMuestra(datos) {
    return this._ejecutar(async (db) => {
      // Verificar si código de barras ya existe
      const existente = await db.collection('muestras')
        .where('codigoBarras', '==', datos.codigoBarras)
        .limit(1)
        .get();

      const codigosExistentes = existente.empty ? [] : [datos.codigoBarras];
      validarRegla2_MuestraVinculada(datos, codigosExistentes);

      // Verificar orden existente y compatibilidad
      const ordenDoc = await db.collection('ordenes').doc(datos.ordenId).get();
      if (!ordenDoc.exists) {
        throw new NoEncontrado('ORDEN_NO_ENCONTRADA', `La orden ${datos.ordenId} no existe`);
      }
      const tipoLab = ordenDoc.data().tipoLaboratorio;
      validarRegla9_CompatibilidadMuestra(tipoLab, datos.tipoMuestra);

      const id = datos.id || randomUUID();
      const ahora = new Date().toISOString();

      const muestraData = {
        id,
        ordenId: datos.ordenId,
        codigoBarras: datos.codigoBarras,
        tipoMuestra: datos.tipoMuestra,
        fechaToma: datos.fechaToma || ahora,
        fechaRecepcion: datos.fechaRecepcion || ahora,
        volumen: datos.volumen ?? null,
        contenedor: datos.contenedor || 'Tubo estándar',
        condicionMuestra: datos.condicionMuestra || 'optima',
        estadoMuestra: datos.estadoMuestra || 'registrada',
        observacionesMuestra: datos.observacionesMuestra || '',
        createdAt: ahora,
        updatedAt: ahora,
      };

      await db.collection('muestras').doc(id).set(muestraData);
      return muestraToDomain(muestraData);
    });
  }

  /**
   * Registra un resultado de examen en una orden y muestra.
   * Valida campos obligatorios por tipo (Regla 10), calcula anormalidad (Regla 4),
   * detecta alertas críticas (Regla 5) y valida antibiograma (Regla 6).
   */
  async registrarResultado(datos, paciente = null) {
    return this._ejecutar(async (db) => {
      // 1. Validar campos por tipo de laboratorio (Regla 10)
      validarRegla10_CamposPorTipo(datos.tipoLaboratorio, datos.valorResultado);

      // 2. Validar antibiograma si corresponde (Regla 6)
      if (datos.tipoLaboratorio === 'microbiologia') {
        const micro = datos.valorResultado?.microorganismo_aislado;
        const antibiograma = datos.valorResultado?.antibiograma;
        validarRegla6_Antibiograma('microbiologia', micro, antibiograma);
      }

      // 3. Rango de referencia y flag de anormalidad automático (Regla 4)
      let flag = datos.flagAnormalidad || 'normal';
      const valorNum = datos.valorResultado?.valor_numerico ?? datos.valorResultado?.hemoglobina;
      if (valorNum != null) {
        const sexo = paciente?.genero || 'Otro';
        const edad = paciente?.edad || 30;
        const rango = obtenerRangoReferencia(datos.examenCodigo || datos.tipoLaboratorio, sexo, edad);
        flag = calcularFlagAnormalidad(Number(valorNum), rango);
      }

      // 4. Evaluar alerta crítica (Regla 5)
      const { esCritico, alerta } = evaluarAlertaCritica(flag);

      const id = datos.id || randomUUID();
      const ahora = new Date().toISOString();

      const resultadoData = {
        id,
        ordenId: datos.ordenId,
        muestraId: datos.muestraId,
        examenCodigo: datos.examenCodigo,
        examenNombre: datos.examenNombre,
        tipoLaboratorio: datos.tipoLaboratorio,
        valorResultado: datos.valorResultado,
        unidadMedida: datos.unidadMedida || '',
        rangoReferencia: datos.rangoReferencia || '',
        flagAnormalidad: flag,
        alertaCritica: alerta,
        esCritico,
        metodo: datos.metodo || '',
        equipo: datos.equipo || '',
        fechaResultado: datos.fechaResultado || ahora,
        tecnicoIngreso: datos.tecnicoIngreso,
        tecnicoValido: null,
        fechaValidacion: null,
        estadoResultado: 'preliminar',
        comentarios: datos.comentarios || '',
        version: 1,
        historialVersiones: [],
        createdAt: ahora,
        updatedAt: ahora,
      };

      await db.collection('resultados').doc(id).set(resultadoData);
      return resultadoToDomain(resultadoData);
    });
  }

  /**
   * Valida técnicamente un resultado.
   * Aplica Regla 3 (muestra no rechazada/insuficiente) y Regla 7 (validador requerido).
   */
  async validarResultado(resultadoId, { tecnicoValido, fechaValidacion = new Date().toISOString() }) {
    return this._ejecutar(async (db) => {
      const resDoc = await db.collection('resultados').doc(resultadoId).get();
      if (!resDoc.exists) {
        throw new NoEncontrado('RESULTADO_NO_ENCONTRADO', `Resultado ${resultadoId} no encontrado`);
      }

      const resData = resDoc.data();

      // Regla 7
      validarRegla7_ValidacionTecnica({
        estadoResultado: 'validado',
        tecnicoValido,
        fechaValidacion,
      });

      // Regla 3
      if (resData.muestraId) {
        const mDoc = await db.collection('muestras').doc(resData.muestraId).get();
        if (mDoc.exists) {
          validarRegla3_CondicionParaValidar(mDoc.data());
        }
      }

      const patch = {
        tecnicoValido,
        fechaValidacion,
        estadoResultado: 'validado',
        updatedAt: new Date().toISOString(),
      };

      await db.collection('resultados').doc(resultadoId).update(patch);
      return resultadoToDomain({ ...resData, ...patch });
    });
  }

  /**
   * Corrige un resultado manteniendo auditoría de versiones.
   * Aplica Regla 8 (versionado e historial).
   */
  async corregirResultado(resultadoId, nuevosDatos) {
    return this._ejecutar(async (db) => {
      const resDoc = await db.collection('resultados').doc(resultadoId).get();
      if (!resDoc.exists) {
        throw new NoEncontrado('RESULTADO_NO_ENCONTRADO', `Resultado ${resultadoId} no encontrado`);
      }

      const actual = resDoc.data();
      const versionado = aplicarRegla8_VersionadoResultado(actual, nuevosDatos);

      await db.collection('resultados').doc(resultadoId).set(versionado);
      return resultadoToDomain(versionado);
    });
  }
}
