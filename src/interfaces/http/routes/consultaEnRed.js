import { Router } from 'express';
import { obtenerTodos } from '../../../infrastructure/config/redRepositoryFactory.js';
import { verificarRedJwt } from '../middleware/redJwt.js';
import { controladoresRed } from '../controllers/consultaEnRed.js';
import { Prohibido } from '../../../domain/errores.js';

export function crearRouterRed(opciones = {}) {
  const router = Router();
  const c = controladoresRed(opciones.obtenerTodos ?? obtenerTodos, { timeoutMs: opciones.timeoutMs });
  router.use('/red', verificarRedJwt(opciones.obtenerClave));
  router.get('/red/pacientes', c.buscar);
  router.get('/red/:institucion/pacientes/:id/historial', c.historial);
  // También impide que una ruta posterior convierta una escritura en red en local.
  router.use('/red', (req, res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next(new Prohibido('ESCRITURA_EN_RED_PROHIBIDA'));
    next();
  });
  return router;
}
