import { MotorNoDisponible, NoEncontrado } from '../../domain/errores.js';
import { PacienteSchema } from '../../domain/entities/paciente.js';

// La vista autorizada reduce campos, pero no inventa alias que el mapper no entrega.
const identidadPaciente = PacienteSchema.pick({ id: true, nombre: true, apellidos: true });

export const institucionesRed = ['hospital', 'odontologia', 'laboratorio', 'pediatria'];

// Puerto existente, inyectado. La red no tiene acceso a operaciones de escritura.
export async function buscarEnRed(repositorios, filtro, { timeoutMs = 5000 } = {}) {
  const respuestas = await Promise.allSettled(institucionesRed.map((institucion) =>
    conLimite(() => {
      const repo = repositorios[institucion];
      if (!repo) throw new MotorNoDisponible(institucion);
      return repo.listarPacientes(filtro);
    }, institucion, timeoutMs)));
  const resultados = respuestas.map((respuesta, indice) => {
    const institucion = institucionesRed[indice];
    const datos = respuesta.status === 'fulfilled' ? respuesta.value : null;
    if (!datos || !Array.isArray(datos.items) || !Number.isInteger(datos.total) || datos.total < 0 ||
        datos.items.some((paciente) => !identidadPaciente.safeParse(paciente).success)) {
      return { institucion, estado: 'no_disponible', items: [], total: 0 };
    }
    return { institucion, estado: 'ok', items: datos.items, total: datos.total };
  });
  if (resultados.every((r) => r.estado === 'no_disponible')) throw new MotorNoDisponible('red');
  return { resultados };
}

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
