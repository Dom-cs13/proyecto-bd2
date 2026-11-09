/**
 * @file statusRepositoryFactory.js
 * Resolución de adaptadores para diagnóstico de salud del sistema (/system/status).
 * Permite resolución segura y aislada de cada motor sin interrumpir el arranque del servidor.
 */

import { obtenerRepositorio as obtenerGeneral } from './RepositoryFactory.js';
import { obtenerRepositorio as obtenerOdontologia } from './odontologiaRepositoryFactory.js';
import { obtenerRepositorio as obtenerPediatria } from './pediatriaRepositoryFactory.js';

export function obtenerRepositoriosStatus() {
  const repos = {};

  try {
    repos.hospital = obtenerGeneral('hospital');
  } catch {
    repos.hospital = null;
  }

  try {
    repos.odontologia = obtenerOdontologia('odontologia');
  } catch {
    repos.odontologia = null;
  }

  try {
    repos.laboratorio = obtenerGeneral('laboratorio');
  } catch {
    repos.laboratorio = null;
  }

  try {
    repos.pediatria = obtenerPediatria('pediatria');
  } catch {
    repos.pediatria = null;
  }

  return repos;
}
