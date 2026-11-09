/**
 * @file RepositoryFactory.js
 * Fábrica y selector de adaptadores de persistencia por institución (Patrón Factory/Strategy).
 * Cumple con la sección 4.2 del plan de arquitectura.
 */

import { Prohibido } from '../../domain/errores.js';
import { MongoAdapter } from '../adapters/mongodb/MongoAdapter.js';
import { FirestoreAdapter } from '../adapters/firestore/FirestoreAdapter.js';
import { LaboratorioFirestoreRepository } from '../adapters/firestore/laboratorioFirestoreRepository.js';

let mongoAdapterInstance = null;
let firestoreAdapterInstance = null;
let laboratorioRepoInstance = null;

const repositoriosRegistrados = {};

/**
 * Permite registrar instancias personalizadas (útil para pruebas unitarias y de integración).
 * @param {string} institucion
 * @param {object} repo
 */
export function registrarRepositorio(institucion, repo) {
  const normalizada = String(institucion).toLowerCase();
  repositoriosRegistrados[normalizada] = repo;
  if (normalizada === 'laboratorio') {
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
export function obtenerRepositorio(institucion = 'hospital') {
  const normalizada = String(institucion).toLowerCase();

  if (repositoriosRegistrados[normalizada]) {
    return repositoriosRegistrados[normalizada];
  }

  if (normalizada === 'hospital') {
    if (!mongoAdapterInstance) {
      mongoAdapterInstance = new MongoAdapter();
    }
    return mongoAdapterInstance;
  }

  if (normalizada === 'laboratorio') {
    if (!firestoreAdapterInstance) {
      firestoreAdapterInstance = new FirestoreAdapter();
    }
    return firestoreAdapterInstance;
  }

  throw new Prohibido('INSTITUCION_INVALIDA', `Institución no autorizada o no disponible: ${institucion}`);
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
    adaptadores.hospital = obtenerRepositorio('hospital');
  } catch {
    // Si no está disponible, se omite
  }
  try {
    adaptadores.laboratorio = obtenerRepositorio('laboratorio');
  } catch {
    // Si no está disponible, se omite
  }
  return adaptadores;
}
