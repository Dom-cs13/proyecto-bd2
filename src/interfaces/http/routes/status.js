/**
 * @file status.js
 * Ruta oficial para /system/status según la sección 3.3 de la planificación.
 */

import { Router } from 'express';
import { obtenerRepositoriosStatus } from '../../../infrastructure/config/statusRepositoryFactory.js';
import { controladoresStatus } from '../controllers/systemStatus.js';

export function crearRouterStatus(opciones = {}) {
  const router = Router();
  const c = controladoresStatus(opciones.obtenerRepositorios ?? obtenerRepositoriosStatus, {
    timeoutMs: opciones.timeoutMs,
  });

  router.get('/system/status', c.estado);
  return router;
}
