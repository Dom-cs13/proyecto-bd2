import { MongoAdapter } from '../adapters/mongodb/MongoAdapter.js';
import { Prohibido } from '../../domain/errores.js';

const mongoAdapter = new MongoAdapter();

const adaptadores = {
  hospital: mongoAdapter,
  // Los adaptadores de odontologia, laboratorio y pediatria se vincularan en sus respectivas tareas
};

export function obtenerRepositorio(institucion = 'hospital') {
  const normalizada = String(institucion).toLowerCase();
  const repo = adaptadores[normalizada];
  if (!repo) {
    throw new Prohibido('INSTITUCION_INVALIDA', `Institución no autorizada o no disponible: ${institucion}`);
  }
  return repo;
}

export function obtenerTodos() {
  return adaptadores;
}

