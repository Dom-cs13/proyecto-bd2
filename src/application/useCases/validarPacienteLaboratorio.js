import { Conflicto, NoEncontrado, Validacion } from '../../domain/errores.js';

export async function validarPacienteLaboratorio(repo, pacienteId) {
  if (typeof pacienteId !== 'string' || !pacienteId.trim()) throw new Validacion();
  const historial = await repo.obtenerHistorial(pacienteId);
  if (!historial) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
  if ((historial.historial ?? historial).estado === 'archivado') throw new Conflicto('PACIENTE_ARCHIVADO');
  return historial.paciente;
}
