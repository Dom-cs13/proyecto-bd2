import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { obtenerRepositorio } from '../../../infrastructure/config/odontologiaRepositoryFactory.js';
import { controladoresOdontologia } from '../controllers/odontologiaPacientes.js';
import { permitirOdontologia, verificarOdontologiaJwt } from '../middleware/odontologiaJwt.js';

export function crearRouterOdontologia(opciones = {}) {
  const router = Router();
  const c = controladoresOdontologia(opciones.obtenerRepositorio ?? obtenerRepositorio);
  const verificar = verificarOdontologiaJwt(opciones.obtenerClave);
  const seleccionar = (req, res, next) => {
    const token = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '')?.[1];
    // Solo despacho: no autentica ni establece req.user. Un router posterior
    // debe verificar sus propios tokens. Todo acceso odontológico verifica firma.
    const destino = token ? jwt.decode(token)?.institucion : undefined;
    if (['hospital', 'laboratorio', 'pediatria'].includes(destino)) return next('route');
    next();
  };
  const ruta = (metodo, path, roles, controlador, generica = true) => {
    router[metodo](path, ...(generica ? [seleccionar] : []), verificar, permitirOdontologia(...roles), controlador);
  };
  ruta('post', '/consultas', ['odontologo'], c.crearConsulta);
  ruta('post', '/consultas/:id/diagnosticos', ['odontologo'], c.diagnostico);
  ruta('post', '/diagnosticos/:id/tratamientos', ['odontologo'], c.tratamiento);
  ruta('post', '/consultas/:id/recetas', ['odontologo'], c.receta);
  ruta('get', '/odontologia/catalogos', ['odontologo'], c.catalogos, false);
  ruta('get', '/odontologia/status', ['secretaria', 'odontologo'], c.estado, false);
  ruta('post', '/pacientes', ['secretaria'], c.registrar);
  ruta('get', '/pacientes', ['secretaria', 'odontologo'], c.listar);
  ruta('get', '/pacientes/:id', ['secretaria', 'odontologo'], c.consultar);
  ruta('get', '/pacientes/:id/historial', ['odontologo'], c.historial);
  ruta('patch', '/pacientes/:id/archivar', ['odontologo'], c.archivar);
  return router;
}
