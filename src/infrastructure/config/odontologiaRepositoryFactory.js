import { PostgresAdapter } from '../adapters/postgresql/PostgresAdapter.js';
import { crearPoolPostgres } from '../adapters/postgresql/connection.js';
import { MotorNoDisponible, Prohibido } from '../../domain/errores.js';

let repositorio;

// Resolución local, sin registrar ni inicializar motores de otras instituciones.
export function obtenerRepositorio(institucion) {
  if (institucion !== 'odontologia') throw new Prohibido('INSTITUCION_INVALIDA');
  try {
    const ssl = process.env.PGSSL_REJECT_UNAUTHORIZED === 'true'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false };
    repositorio ??= new PostgresAdapter(crearPoolPostgres({ ssl }));
    return repositorio;
  } catch {
    throw new MotorNoDisponible('odontologia');
  }
}
