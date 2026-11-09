/**
 * @file systemStatus.js
 * Controlador HTTP para el diagnóstico y salud de motores (/system/status).
 */

import { obtenerEstadoSistema } from '../../../application/useCases/obtenerEstadoSistema.js';

export function controladoresStatus(obtenerRepositorios, opciones = {}) {
  return {
    async estado(req, res, next) {
      try {
        const repos = typeof obtenerRepositorios === 'function' ? obtenerRepositorios() : obtenerRepositorios;
        const resultado = await obtenerEstadoSistema(repos, opciones);
        res.status(200).json(resultado);
      } catch (error) {
        next(error);
      }
    },
  };
}
