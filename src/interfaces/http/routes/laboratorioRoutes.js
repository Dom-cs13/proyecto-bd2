/**
 * @file laboratorioRoutes.js
 * Endpoints HTTP para el Laboratorio Clínico (I3):
 * - Gestión de pacientes e historial clínico (puerto HistorialRepository)
 * - Órdenes, muestras y resultados con soporte para los 8 laboratorios y las 10 reglas clínicas.
 */

import { Router } from 'express';
import { obtenerRepositorio, obtenerLaboratorioRepo } from '../../../infrastructure/config/RepositoryFactory.js';
import { NoEncontrado, Validacion, Prohibido } from '../../../domain/errores.js';
import { requerirAutenticacion } from '../middleware/auth.js';
import { editarPacienteLocal, motivoArchivoLocal, pacienteLocal } from '../validators/pacientesLocales.js';
import { validarPacienteLaboratorio } from '../../../application/useCases/validarPacienteLaboratorio.js';
import { calcularEdad } from '../../../domain/entities/paciente.js';

export const routerLaboratorio = Router();

routerLaboratorio.use((req, res, next) => {
  const pacientes = /^\/pacientes(?:\/|$)/.test(req.path);
  const especializado = /^\/laboratorio(?:\/|$)/.test(req.path);
  if (!pacientes && !especializado) return next();
  if (pacientes && req.user && req.user.institucion !== 'laboratorio') return next('router');
  requerirAutenticacion(req, res, (error) => {
    if (error) return next(error);
    if (req.user.institucion !== 'laboratorio' || !['laboratorista', 'tecnico', 'validador', 'admin'].includes(req.user.rol)) return next(new Prohibido());
    if (/\/(validar|corregir)$/.test(req.path) && !['validador', 'admin'].includes(req.user.rol)) return next(new Prohibido());
    next();
  });
});

/* Helper para obtener el repositorio de la institución según JWT o laboratorio por defecto */
function resolverRepo(req) {
  const institucion = req.user.institucion;
  return obtenerRepositorio(institucion);
}

routerLaboratorio.patch('/pacientes/:id', async (req, res, next) => {
  try {
    const datos = editarPacienteLocal.parse(req.body);
    if (['estadoClinico', 'ubicacion', 'medicoTratante'].some((campo) => campo in datos)) throw new Validacion();
    res.json(await resolverRepo(req).actualizarPaciente(req.params.id, datos));
  } catch (error) { next(error); }
});

// ============================================================================
// 1. Rutas de Pacientes e Historiales (Núcleo)
// ============================================================================

/**
 * GET /pacientes
 * Lista pacientes con filtros opcionales de búsqueda.
 */
routerLaboratorio.get('/pacientes', async (req, res, next) => {
  try {
    const repo = resolverRepo(req);
    const { documento, estado, texto, pagina, limite } = req.query;
    const resultado = await repo.listarPacientes({
      documento,
      estado,
      texto,
      pagina: pagina ? parseInt(pagina, 10) : 1,
      limite: limite ? parseInt(limite, 10) : 50,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /pacientes
 * Registra un nuevo paciente en el repositorio correspondiente.
 */
routerLaboratorio.post('/pacientes', async (req, res, next) => {
  try {
    const datos = pacienteLocal.parse({ ...req.body, documentoIdentidad: req.body?.documentoIdentidad || req.body?.cui });

    const repo = resolverRepo(req);
    const paciente = await repo.crearPaciente(datos);
    res.status(201).json(paciente);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /pacientes/:id
 * Obtiene el detalle de un paciente por su ID o CUI.
 */
routerLaboratorio.get('/pacientes/:id', async (req, res, next) => {
  try {
    const repo = resolverRepo(req);
    const paciente = await repo.obtenerPaciente(req.params.id);
    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `Paciente ${req.params.id} no encontrado`);
    }
    res.json(paciente);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /pacientes/:id/historial
 * Consulta el historial consolidado del paciente.
 */
routerLaboratorio.get('/pacientes/:id/historial', async (req, res, next) => {
  try {
    const repo = resolverRepo(req);
    const historial = await repo.obtenerHistorial(req.params.id);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /pacientes/:id/archivar
 * Archiva el expediente del paciente con motivo formal.
 */
routerLaboratorio.patch('/pacientes/:id/archivar', async (req, res, next) => {
  try {
    const repo = resolverRepo(req);
    const motivo = motivoArchivoLocal.parse(req.body?.motivo);
    const historial = await repo.archivarHistorial(req.params.id, motivo);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. Rutas Especializadas de Laboratorio (Órdenes, Muestras, Resultados)
// ============================================================================

/**
 * GET /laboratorio/ordenes
 * Lista las órdenes de examen registradas.
 */
routerLaboratorio.get('/laboratorio/ordenes', async (req, res, next) => {
  try {
    const labRepo = obtenerLaboratorioRepo();
    const ordenes = await labRepo.listarOrdenes(req.query);
    res.json(ordenes);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /laboratorio/ordenes
 * Registra una nueva orden con al menos un examen (Regla 1).
 */
routerLaboratorio.post('/laboratorio/ordenes', async (req, res, next) => {
  try {
    await validarPacienteLaboratorio(resolverRepo(req), req.body?.pacienteId);
    const labRepo = obtenerLaboratorioRepo();
    const orden = await labRepo.crearOrden(req.body);
    res.status(201).json(orden);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /laboratorio/ordenes/:id
 * Consulta una orden y sus muestras y resultados vinculados.
 */
routerLaboratorio.get('/laboratorio/ordenes/:id', async (req, res, next) => {
  try {
    const labRepo = obtenerLaboratorioRepo();
    const orden = await labRepo.obtenerOrden(req.params.id);
    if (!orden) {
      throw new NoEncontrado('ORDEN_NO_ENCONTRADA', `Orden ${req.params.id} no encontrada`);
    }
    res.json(orden);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /laboratorio/muestras
 * Registra una muestra con código de barras y compatibilidad (Reglas 2 y 9).
 */
routerLaboratorio.post('/laboratorio/muestras', async (req, res, next) => {
  try {
    const labRepo = obtenerLaboratorioRepo();
    const muestra = await labRepo.registrarMuestra(req.body);
    res.status(201).json(muestra);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /laboratorio/resultados
 * Registra un resultado con validación de campos polimórficos y evaluación de anormalidad (Reglas 4, 5, 6, 10).
 */
routerLaboratorio.post('/laboratorio/resultados', async (req, res, next) => {
  try {
    const labRepo = obtenerLaboratorioRepo();
    const orden = await labRepo.obtenerOrden(req.body?.ordenId);
    if (!orden) throw new NoEncontrado('ORDEN_NO_ENCONTRADA');
    const paciente = await validarPacienteLaboratorio(resolverRepo(req), orden.pacienteId);
    if (!orden.muestras?.some(m => m.id === req.body.muestraId) || orden.tipoLaboratorio !== req.body.tipoLaboratorio) throw new Validacion('REFERENCIA_INVALIDA');
    const resultado = await labRepo.registrarResultado({ ...req.body, tecnicoIngreso: req.user.usuario }, { genero: paciente.genero, edad: calcularEdad(paciente.fechaNacimiento) });
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /laboratorio/resultados/:id/validar
 * Validación técnica por personal autorizado (Reglas 3 y 7).
 */
routerLaboratorio.patch('/laboratorio/resultados/:id/validar', async (req, res, next) => {
  try {
    const labRepo = obtenerLaboratorioRepo();
    const { fechaValidacion } = req.body;
    const resultado = await labRepo.validarResultado(req.params.id, {
      tecnicoValido: req.user.usuario,
      fechaValidacion,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /laboratorio/resultados/:id/corregir
 * Corrige un resultado manteniendo auditoría y versionado (Regla 8).
 */
routerLaboratorio.patch('/laboratorio/resultados/:id/corregir', async (req, res, next) => {
  try {
    const labRepo = obtenerLaboratorioRepo();
    const { nuevoValor, motivo } = req.body;
    const resultado = await labRepo.corregirResultado(req.params.id, {
      valorResultado: nuevoValor, motivoCorreccion: motivo, corregidoPor: req.user.usuario,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /laboratorio/status
 * Diagnóstico de conexión y latencia de Firestore.
 */
routerLaboratorio.get('/laboratorio/status', async (req, res, next) => {
  try {
    const adapter = obtenerRepositorio('laboratorio');
    const pingRes = await adapter.ping();
    if (!pingRes.ok) {
      return res.status(503).json({ error: { codigo: 'MOTOR_NO_DISPONIBLE', mensaje: pingRes.error } });
    }
    res.json(pingRes);
  } catch (err) {
    next(err);
  }
});
