/**
 * @file laboratorioRoutes.js
 * Endpoints HTTP para el Laboratorio Clínico (I3):
 * - Gestión de pacientes e historial clínico (puerto HistorialRepository)
 * - Órdenes, muestras y resultados con soporte para los 8 laboratorios y las 10 reglas clínicas.
 */

import { Router } from 'express';
import { obtenerRepositorio, obtenerLaboratorioRepo } from '../../../infrastructure/config/RepositoryFactory.js';
import { NoEncontrado, Validacion } from '../../../domain/errores.js';

export const routerLaboratorio = Router();

/* Helper para obtener el repositorio de la institución según JWT o laboratorio por defecto */
function resolverRepo(req) {
  const institucion = req.user?.institucion || 'laboratorio';
  return obtenerRepositorio(institucion);
}

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
    const datos = req.body;
    if (!datos || (!datos.documentoIdentidad && !datos.cui) || !datos.nombre) {
      throw new Validacion('DATOS_INVALIDOS', 'El documentoIdentidad y nombre son obligatorios');
    }

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
    const motivo = req.body?.motivo || 'Archivado administrativo';
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
    const resultado = await labRepo.registrarResultado(req.body, req.body.paciente || null);
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
    const { tecnicoValido, fechaValidacion } = req.body;
    const resultado = await labRepo.validarResultado(req.params.id, {
      tecnicoValido: tecnicoValido || req.user?.usuario || 'tecnico.laboratorio',
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
    const usuario = req.user?.usuario || 'usuario_laboratorio';
    const resultado = await labRepo.corregirResultado(req.params.id, nuevoValor, motivo, usuario);
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
