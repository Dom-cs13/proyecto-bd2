import { casosPacientesOdontologia } from '../../../application/useCases/odontologiaPacientes.js';
import { Conflicto, ErrorDominio, MotorNoDisponible, Validacion } from '../../../domain/errores.js';
import { archivoOdontologia, filtroOdontologia, idOdontologia, pacienteOdontologia } from '../validators/odontologia.js';
import { consultaOdontologia, diagnosticoOdontologia, tratamientoOdontologia, recetaOdontologia } from '../validators/odontologia.js';
import { citaOdontologia, cambioCitaOdontologia, responsableOdontologia, alergiaOdontologia, agendaOdontologia } from '../validators/odontologia.js';
import { editarPacienteOdontologia } from '../validators/odontologia.js';

export function controladoresOdontologia(obtenerRepositorio) {
  const ejecutar = (operacion, status = 200, duplicado = 'CONFLICTO') => async (req, res, next) => {
    try {
      // Siempre se resuelve con la institución del JWT verificado.
      const casos = casosPacientesOdontologia(obtenerRepositorio(req.user.institucion));
      res.status(status).json(await operacion(casos, req));
    } catch (error) {
      if (error instanceof ErrorDominio || error?.name === 'ZodError') return next(error);
      if (['42703', '42P01', '42883', '42501', '28P01', '28000', '3D000'].includes(error.code)) return next(new MotorNoDisponible('odontologia', 'El servicio odontológico requiere revisar su configuración'));
      if (error.code === '23505') return next(new Conflicto(duplicado));
      if (error.codigo === 'HISTORIAL_NO_DISPONIBLE') return next(new Conflicto('HISTORIAL_NO_DISPONIBLE'));
      if (['HISTORIAL_NO_ACTIVO', 'CONSULTA_NO_DISPONIBLE', 'DIAGNOSTICO_NO_DISPONIBLE'].includes(error.codigo)) return next(new Conflicto(error.codigo));
      if (error.code === '23503') return next(new Validacion('REFERENCIA_INVALIDA', 'El registro asociado no existe o no corresponde al paciente'));
      if (['23514', '22001', '22007', '22008', '22P02'].includes(error.code)) return next(new Validacion());
      if (/^(08|53|57)/.test(error.code ?? '') ||
          ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(error.code) ||
          /connection.*(timeout|terminated)|timeout.*connect/i.test(error.message ?? '')) {
        return next(new MotorNoDisponible('odontologia'));
      }
      next(error);
    }
  };
  return {
    actualizarContacto: ejecutar((casos, req) => casos.actualizarContacto(idOdontologia.parse(req.params.id), editarPacienteOdontologia.parse(req.body))),
    agenda: ejecutar((casos, req) => casos.agenda(agendaOdontologia.parse(req.query).fecha, req.user.rol === 'odontologo' ? req.user.sub : undefined)),
    equipo: ejecutar((casos) => casos.equipo()),
    crearCita: ejecutar((casos, req) => casos.crearCita(citaOdontologia.parse(req.body)), 201),
    cambiarCita: ejecutar((casos, req) => casos.cambiarCita(idOdontologia.parse(req.params.id), cambioCitaOdontologia.parse(req.body))),
    responsables: ejecutar((casos, req) => casos.responsables(idOdontologia.parse(req.params.id))),
    responsable: ejecutar((casos, req) => casos.responsable(idOdontologia.parse(req.params.id), responsableOdontologia.parse(req.body)), 201),
    alergias: ejecutar((casos, req) => casos.alergias(idOdontologia.parse(req.params.id))),
    alergia: ejecutar((casos, req) => casos.alergia(idOdontologia.parse(req.params.id), alergiaOdontologia.parse(req.body)), 201),
    finalizar: ejecutar((casos, req) => casos.finalizar(idOdontologia.parse(req.params.id), req.user.sub)),
    crearConsulta: ejecutar((casos, req) => casos.crearConsulta(consultaOdontologia.parse(req.body), idOdontologia.parse(req.user.sub)), 201),
    diagnostico: ejecutar((casos, req) => casos.agregarDiagnostico(idOdontologia.parse(req.params.id), diagnosticoOdontologia.parse(req.body)), 201),
    tratamiento: ejecutar((casos, req) => casos.registrarTratamiento(idOdontologia.parse(req.params.id), tratamientoOdontologia.parse(req.body)), 201),
    receta: ejecutar((casos, req) => casos.recetarMedicamento(idOdontologia.parse(req.params.id), recetaOdontologia.parse(req.body)), 201),
    catalogos: ejecutar((casos) => casos.catalogos()),
    estado: ejecutar((casos) => casos.estado()),
    registrar: ejecutar((casos, req) => casos.registrar(pacienteOdontologia.parse(req.body)), 201, 'PACIENTE_DUPLICADO'),
    listar: ejecutar((casos, req) => casos.listar(filtroOdontologia.parse(req.query))),
    consultar: ejecutar((casos, req) => casos.consultar(idOdontologia.parse(req.params.id))),
    historial: ejecutar((casos, req) => casos.historial(idOdontologia.parse(req.params.id))),
    archivar: ejecutar((casos, req) => casos.archivar(idOdontologia.parse(req.params.id),
      archivoOdontologia.parse(req.body).motivo)),
  };
}
