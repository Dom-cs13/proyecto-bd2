import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { resolverRepositorio } from '../middleware/resolverRepositorio.js';
import { Validacion } from '../../../domain/errores.js';

const router = Router();
router.use(autenticar);
router.use(resolverRepositorio);

// GET /polizas · Listar pólizas registradas
router.get('/', async (req, res, next) => {
  try {
    const { estado, texto } = req.query;
    const items = await req.repo.listarPolizas({ estado, texto });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /polizas · Registrar nueva póliza
router.post('/', async (req, res, next) => {
  try {
    const datos = req.body;
    if (!datos || !datos.idPoliza || !datos.cobertura) {
      throw new Validacion('DATOS_INCOMPLETOS', 'Identificador de póliza y cobertura requeridos');
    }
    const nueva = await req.repo.crearPoliza(datos);
    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
});

// POST /polizas/:id/asociar · Asociar póliza a un paciente
router.post('/:id/asociar', async (req, res, next) => {
  try {
    const { pacienteId } = req.body || {};
    if (!pacienteId) {
      throw new Validacion('PACIENTE_REQUERIDO', 'Debe especificar el ID o expediente del paciente receptor');
    }
    const poliza = await req.repo.asociarPolizaPaciente(req.params.id, pacienteId);
    res.json(poliza);
  } catch (err) {
    next(err);
  }
});

export default router;

