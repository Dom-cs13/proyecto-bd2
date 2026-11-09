import { Conflicto, NoEncontrado } from '../../domain/errores.js';

export function casosPacientesPediatria(repo) {
  const historial = async (id) => {
    const resultado = await repo.obtenerHistorial(id);
    if (!resultado) throw new NoEncontrado('HISTORIAL_NO_ENCONTRADO');
    return resultado;
  };

  const verificarActivo = async (pacienteId) => {
    const actual = await historial(pacienteId);
    if (actual.historial.estado === 'archivado') {
      throw new Conflicto('PACIENTE_ARCHIVADO');
    }
    return actual;
  };

  return {
    async crearConsulta(datos, usuarioId) {
      await verificarActivo(datos.pacienteId);
      return repo.crearConsulta({ ...datos, usuarioId });
    },
    agregarDiagnostico: (id, datos) => repo.agregarDiagnostico(id, datos),
    registrarTratamiento: (id, datos) => repo.registrarTratamiento(id, datos),
    recetarMedicamento: (id, datos) => repo.recetarMedicamento(id, datos),
    async registrarControlCrecimiento(pacienteId, datos) {
      await verificarActivo(pacienteId);
      return repo.registrarControlCrecimiento(pacienteId, datos);
    },
    async registrarVacunaAplicada(pacienteId, datos) {
      await verificarActivo(pacienteId);
      return repo.registrarVacunaAplicada(pacienteId, datos);
    },
    catalogos: () => repo.obtenerCatalogos(),
    estado: () => repo.ping(),
    registrar: (datos) => repo.crearPaciente(datos),
    listar: (filtro) => repo.listarPacientes(filtro),
    async consultar(id) {
      const paciente = await repo.obtenerPaciente(id);
      if (!paciente) throw new NoEncontrado('PACIENTE_NO_ENCONTRADO');
      return paciente;
    },
    historial,
    async archivar(id, motivo) {
      const actual = await historial(id);
      if (actual.historial.estado === 'archivado') throw new Conflicto('PACIENTE_ARCHIVADO');
      return repo.archivarHistorial(id, motivo);
    },
  };
}
