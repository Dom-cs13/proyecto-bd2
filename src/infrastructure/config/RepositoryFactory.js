/**
 * @file RepositoryFactory.js
 * Fábrica y selector de adaptadores de persistencia por institución (Patrón Factory/Strategy).
 * Cumple con la sección 4.2 del plan de arquitectura.
 */

import { Prohibido } from '../../domain/errores.js';
import { FirestoreAdapter } from '../adapters/firestore/FirestoreAdapter.js';
import { LaboratorioFirestoreRepository } from '../adapters/firestore/laboratorioFirestoreRepository.js';

let firestoreAdapterInstance = null;
let laboratorioRepoInstance = null;

/**
 * Permite registrar instancias personalizadas (útil para pruebas unitarias y de integración).
 * @param {string} institucion
 * @param {object} repo
 */
export function registrarRepositorio(institucion, repo) {
  if (institucion === 'laboratorio') {
    firestoreAdapterInstance = repo;
  }
}

/**
 * Permite registrar instancia especializada para el Laboratorio Clínico.
 * @param {LaboratorioFirestoreRepository} repo
 */
export function registrarLaboratorioRepo(repo) {
  laboratorioRepoInstance = repo;
}

/**
 * Obtiene el adaptador de repositorio correspondiente a la institución indicada.
 * @param {string} institucion - 'hospital' | 'odontologia' | 'laboratorio' | 'pediatria'
 * @returns {import('../../domain/ports/HistorialRepository.js').HistorialRepository}
 */
export function obtenerRepositorio(institucion) {
  if (institucion === 'laboratorio') {
    if (!firestoreAdapterInstance) {
      firestoreAdapterInstance = new FirestoreAdapter();
    }
    return firestoreAdapterInstance;
  }

  throw new Prohibido('INSTITUCION_INVALIDA', `Institución no soportada o no configurada: ${institucion}`);
}

/**
 * Obtiene el repositorio especializado de órdenes, muestras y resultados del Laboratorio Clínico.
 * @returns {LaboratorioFirestoreRepository}
 */
export function obtenerLaboratorioRepo() {
  if (!laboratorioRepoInstance) {
    laboratorioRepoInstance = new LaboratorioFirestoreRepository();
  }
  return laboratorioRepoInstance;
}

/**
 * Retorna todos los adaptadores disponibles para lecturas en red (/red/...).
 */
export function obtenerTodos() {
  const adaptadores = {};
  try {
    adaptadores.laboratorio = obtenerRepositorio('laboratorio');
  } catch {
    // Si no está disponible, se omite o captura
  }
  return adaptadores;
}
