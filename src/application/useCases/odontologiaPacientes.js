import { Conflicto, NoEncontrado, Validacion } from '../../domain/errores.js';
import { calcularEdad } from '../../domain/entities/paciente.js';

export function casosPacientesOdontologia(repo) {
  const historial = async (id) => {
    const resultado = await repo.obtenerHistorial(id);
    if (!resultado) throw new NoEncontrado('HISTORIAL_NO_ENCONTRADO');
    return resultado;
  };
  return {
    actualizarContacto: (id, datos) => repo.actualizarContacto(id, datos),
    agenda: (fecha, usuarioId) => repo.obtenerAgenda(fecha, usuarioId),
    equipo: () => repo.obtenerEquipo(),
    crearCita: (datos) => repo.crearCita(datos),
    cambiarCita: (id, datos) => repo.cambiarCita(id, datos),
    responsables: (id) => repo.obtenerResponsables(id),
    responsable: (id, datos) => repo.guardarResponsable(id, datos),
    alergias: (id) => repo.obtenerAlergias(id),
    alergia: (id, datos) => repo.guardarAlergia(id, datos),
    finalizar: (id, usuarioId) => repo.finalizarConsulta(id, usuarioId),
    crearConsulta: (datos, usuarioId) => repo.crearConsulta({ ...datos, usuarioId }),
    agregarDiagnostico: (id, datos) => repo.agregarDiagnostico(id, datos),
    registrarTratamiento: (id, datos) => repo.registrarTratamiento(id, datos),
    recetarMedicamento: (id, datos) => repo.recetarMedicamento(id, datos),
    catalogos: () => repo.obtenerCatalogos(),
    estado: () => repo.ping(),
    registrar: (datos) => {
      if (calcularEdad(datos.fechaNacimiento) < 18 && !datos.detallesInstitucion?.responsableLegal?.esPrincipal) {
        throw new Validacion('RESPONSABLE_REQUERIDO', 'Un menor requiere un responsable legal principal');
      }
      return repo.crearPaciente(datos);
    },
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
