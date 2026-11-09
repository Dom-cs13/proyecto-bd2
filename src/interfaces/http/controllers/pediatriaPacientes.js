import { casosPacientesPediatria } from '../../../application/useCases/pediatriaPacientes.js';
import { Conflicto, ErrorDominio, MotorNoDisponible, Validacion } from '../../../domain/errores.js';
import {
  archivoPediatria,
  consultaPediatria,
  controlCrecimientoPediatria,
  diagnosticoPediatria,
  filtroPediatria,
  idPediatria,
  pacientePediatria,
  recetaPediatria,
  tratamientoPediatria,
  vacunaPediatria,
} from '../validators/pediatria.js';

export function controladoresPediatria(obtenerRepositorio) {
  const ejecutar = (operacion, status = 200, duplicado = 'CONFLICTO') => async (req, res, next) => {
    try {
      const casos = casosPacientesPediatria(obtenerRepositorio(req.user.institucion));
      res.status(status).json(await operacion(casos, req));
    } catch (error) {
      if (error instanceof ErrorDominio || error?.name === 'ZodError') return next(error);
      if (error.errno === 1142 || error.code === 'ER_TABLEACCESS_DENIED_ERROR') {
        return next(new MotorNoDisponible('pediatria', 'La cuenta de base de datos no tiene los permisos requeridos para esta operación'));
      }
      if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) return next(new Conflicto(duplicado));
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452 || error.errno === 1451) {
        return next(new Validacion('REFERENCIA_INVALIDA', 'El registro asociado no existe o no corresponde al paciente'));
      }
      if (error.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || error.errno === 4025 || error.errno === 1406) {
        return next(new Validacion());
      }
      if (['HISTORIAL_NO_DISPONIBLE', 'HISTORIAL_NO_ACTIVO', 'CONSULTA_NO_DISPONIBLE', 'PACIENTE_ARCHIVADO'].includes(error.codigo)) {
        return next(new Conflicto(error.codigo));
      }
      if (
        error instanceof MotorNoDisponible ||
        ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH'].includes(error.code) ||
        error.errno === 1045 ||
        error.errno === 1049 ||
        /connection.*(timeout|terminated|refused)|timeout.*connect|refused/i.test(error.message ?? '')
      ) {
        return next(new MotorNoDisponible('pediatria'));
      }
      next(error);
    }
  };

  return {
    crearConsulta: ejecutar((casos, req) => casos.crearConsulta(consultaPediatria.parse(req.body), idPediatria.parse(req.user.sub)), 201),
    diagnostico: ejecutar((casos, req) => casos.agregarDiagnostico(idPediatria.parse(req.params.id), diagnosticoPediatria.parse(req.body)), 201),
    tratamiento: ejecutar((casos, req) => casos.registrarTratamiento(idPediatria.parse(req.params.id), tratamientoPediatria.parse(req.body)), 201),
    receta: ejecutar((casos, req) => casos.recetarMedicamento(idPediatria.parse(req.params.id), recetaPediatria.parse(req.body)), 201),
    registrarCrecimiento: ejecutar(
      (casos, req) => casos.registrarControlCrecimiento(idPediatria.parse(req.params.id), controlCrecimientoPediatria.parse(req.body)),
      201,
    ),
    registrarVacuna: ejecutar(
      (casos, req) => casos.registrarVacunaAplicada(idPediatria.parse(req.params.id), vacunaPediatria.parse(req.body)),
      201,
      'VACUNA_DUPLICADA',
    ),
    catalogos: ejecutar((casos) => casos.catalogos()),
    estado: ejecutar((casos) => casos.estado()),
    registrar: ejecutar((casos, req) => casos.registrar(pacientePediatria.parse(req.body)), 201, 'PACIENTE_DUPLICADO'),
    listar: ejecutar((casos, req) => casos.listar(filtroPediatria.parse(req.query))),
    consultar: ejecutar((casos, req) => casos.consultar(idPediatria.parse(req.params.id))),
    historial: ejecutar((casos, req) => casos.historial(idPediatria.parse(req.params.id))),
    archivar: ejecutar((casos, req) => casos.archivar(idPediatria.parse(req.params.id), archivoPediatria.parse(req.body).motivo)),
  };
}
