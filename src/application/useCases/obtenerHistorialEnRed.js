import { MotorNoDisponible, NoEncontrado } from '../../domain/errores.js';
import { PacienteSchema } from '../../domain/entities/paciente.js';
import { institucionesRed } from './buscarEnRed.js';

const identidadPaciente = PacienteSchema.pick({ id: true, nombre: true, apellidos: true });

export async function obtenerHistorialEnRed(repositorios, institucion, pacienteId, { timeoutMs = 5000 } = {}) {
  if (!institucionesRed.includes(institucion)) throw new NoEncontrado('INSTITUCION_NO_ENCONTRADA');
  const repo = repositorios[institucion];
  if (!repo) throw new MotorNoDisponible(institucion);
  const historial = await conLimite(() => repo.obtenerHistorial(pacienteId), institucion, timeoutMs);
  if (!historial) throw new NoEncontrado('HISTORIAL_NO_ENCONTRADO');
  if (!identidadPaciente.safeParse(historial.paciente).success) throw new MotorNoDisponible(institucion);
  return historial;
}

function conLimite(operacion, institucion, timeoutMs) {
  let temporizador;
  return Promise.race([
    Promise.resolve().then(operacion),
    new Promise((_, rechazar) => { temporizador = setTimeout(() => rechazar(new MotorNoDisponible(institucion)), timeoutMs); }),
  ]).finally(() => clearTimeout(temporizador));
}
