import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { resolverRepositorio } from '../middleware/resolverRepositorio.js';
import { NoEncontrado, Validacion } from '../../../domain/errores.js';

const router = Router();
router.use(autenticar);
router.use(resolverRepositorio);

// GET /pacientes · Listar y buscar pacientes
router.get('/', async (req, res, next) => {
  try {
    const { estado, texto, documento, pagina, limite } = req.query;
    const resultado = await req.repo.listarPacientes({ estado, texto, documento, pagina, limite });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
});

// POST /pacientes · Crear paciente nuevo
router.post('/', async (req, res, next) => {
  try {
    const datos = req.body;
    if (!datos || !datos.nombre || !datos.apellidos) {
      throw new Validacion('DATOS_INCOMPLETOS', 'Nombre y apellidos son requeridos');
    }
    const nuevo = await req.repo.crearPaciente(datos);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// GET /pacientes/:id · Detalle de un paciente
router.get('/:id', async (req, res, next) => {
  try {
    const paciente = await req.repo.obtenerPaciente(req.params.id);
    if (!paciente) {
      throw new NoEncontrado('PACIENTE_NO_ENCONTRADO', `No se encontró el paciente ${req.params.id}`);
    }
    res.json(paciente);
  } catch (err) {
    next(err);
  }
});

// GET /pacientes/:id/historial · Historial clínico consolidado
router.get('/:id/historial', async (req, res, next) => {
  try {
    const historial = await req.repo.obtenerHistorial(req.params.id);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});

// PATCH /pacientes/:id/archivar · Archivado clínico formal con motivo justificado
router.patch('/:id/archivar', async (req, res, next) => {
  try {
    const { motivo } = req.body || {};
    const motivoJustificado = motivo || {
      tipo: 'administrativo',
      detalle: 'Archivado formal desde interfaz clínica',
    };
    const historial = await req.repo.archivarHistorial(req.params.id, motivoJustificado);
    res.json(historial);
  } catch (err) {
    next(err);
  }
});

export default router;
