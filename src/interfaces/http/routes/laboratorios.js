import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { resolverRepositorio } from '../middleware/resolverRepositorio.js';
import { Validacion, NoEncontrado } from '../../../domain/errores.js';

const router = Router();
router.use(autenticar);
router.use(resolverRepositorio);

// GET /laboratorios · Listar unidades de laboratorios
router.get('/', async (req, res, next) => {
  try {
    const { tipo, estado, texto } = req.query;
    const items = await req.repo.listarLaboratorios({ tipo, estado, texto });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /laboratorios · Registrar nueva unidad de laboratorio
router.post('/', async (req, res, next) => {
  try {
    const datos = req.body;
    if (!datos || !datos.nombre || !datos.codigo || !datos.responsable) {
      throw new Validacion('DATOS_INCOMPLETOS', 'Nombre, código y responsable son obligatorios para registrar el laboratorio');
    }
    const nuevo = await req.repo.crearLaboratorio(datos);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// GET /laboratorios/catalogo-examenes · Listar tipos de exámenes disponibles
router.get('/catalogo-examenes', async (req, res, next) => {
  try {
    const { laboratorioId, categoria, estado, texto } = req.query;
    const items = await req.repo.listarTiposExamenes({ laboratorioId, categoria, estado, texto });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /laboratorios/catalogo-examenes · Registrar nuevo tipo de examen en un laboratorio
router.post('/catalogo-examenes', async (req, res, next) => {
  try {
    const datos = req.body;
    if (!datos || !datos.nombre || !datos.codigoExamen || !datos.laboratorioId) {
      throw new Validacion('DATOS_INCOMPLETOS', 'Código de examen, nombre y laboratorio responsable son obligatorios');
    }
    const nuevo = await req.repo.crearTipoExamen(datos);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// GET /laboratorios/ordenes · Listar órdenes de laboratorio emitidas
router.get('/ordenes', async (req, res, next) => {
  try {
    const { pacienteId, laboratorioId, estado, texto } = req.query;
    const items = await req.repo.listarOrdenesLaboratorio({ pacienteId, laboratorioId, estado, texto });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /laboratorios/ordenes · Emitir nueva orden de laboratorio para un paciente
router.post('/ordenes', async (req, res, next) => {
  try {
    const datos = req.body;
    if (!datos || !datos.pacienteId || !datos.tipoExamen) {
      throw new Validacion('DATOS_INCOMPLETOS', 'El paciente y el tipo de examen son obligatorios');
    }
    const nueva = await req.repo.crearOrdenLaboratorio(datos);
    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

// GET /laboratorios/pacientes-asociados · Resumen de pacientes asociados por laboratorio
router.get('/pacientes-asociados', async (req, res, next) => {
  try {
    const grupos = await req.repo.obtenerPacientesPorLaboratorio();
    res.json({ grupos, totalGrupos: grupos.length });
  } catch (err) {
    next(err);
  }
});

// GET /laboratorios/:id · Obtener detalle de laboratorio
router.get('/:id', async (req, res, next) => {
  try {
    const lab = await req.repo.obtenerLaboratorio(req.params.id);
    if (!lab) {
      throw new NoEncontrado('LABORATORIO_NO_ENCONTRADO', `No se encontró el laboratorio con identificador ${req.params.id}`);
    }
    res.json(lab);
  } catch (err) {
    next(err);
  }
});

export default router;
