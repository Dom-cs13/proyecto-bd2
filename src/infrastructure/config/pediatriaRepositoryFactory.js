import { MariaDbAdapter } from '../adapters/mariadb/MariaDbAdapter.js';
import { crearPoolMariaDb } from '../adapters/mariadb/connection.js';
import { MotorNoDisponible, Prohibido } from '../../domain/errores.js';

let repositorio;

// Resolución local, sin registrar ni inicializar motores de otras instituciones.
export function obtenerRepositorio(institucion) {
  if (institucion !== 'pediatria') throw new Prohibido('INSTITUCION_INVALIDA');
  try {
    repositorio ??= new MariaDbAdapter(crearPoolMariaDb());
    return repositorio;
  } catch (error) {
    if (error instanceof MotorNoDisponible) throw error;
    throw new MotorNoDisponible('pediatria', error?.message);
  }
}
