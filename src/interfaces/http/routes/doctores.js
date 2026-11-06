import { Router } from 'express';
import { autenticar } from '../middleware/auth.js';
import { resolverRepositorio } from '../middleware/resolverRepositorio.js';
import { Validacion, NoEncontrado } from '../../../domain/errores.js';

const router = Router();
router.use(autenticar);
router.use(resolverRepositorio);

// GET /doctores · Listar médicos registrados
router.get('/', async (req, res, next) => {
  try {
    const { estado, especialidad, texto } = req.query;
    const items = await req.repo.listarDoctores({ estado, especialidad, texto });
    res.json({ items, total: items.length });
  } catch (err) {
    next(err);
  }
});

// POST /doctores · Registrar nuevo médico / doctor
router.post('/', async (req, res, next) => {
  try {
    const datos = req.body;
    if (!datos || !datos.nombre || !datos.apellidos || !datos.idColegiado) {
      throw new Validacion('DATOS_INCOMPLETOS', 'Nombre, apellidos y número de colegiado son obligatorios');
    }
    const nuevo = await req.repo.crearDoctor(datos);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
});

// GET /doctores/:id · Obtener detalle de médico
router.get('/:id', async (req, res, next) => {
  try {
    const doctor = await req.repo.obtenerDoctor(req.params.id);
    if (!doctor) {
      throw new NoEncontrado('DOCTOR_NO_ENCONTRADO', `No se encontró el médico con identificador ${req.params.id}`);
    }
    res.json(doctor);
  } catch (err) {
    next(err);
  }
});

export default router;
