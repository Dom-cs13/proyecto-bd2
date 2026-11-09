import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { obtenerRepositorio } from '../../../infrastructure/config/pediatriaRepositoryFactory.js';
import { controladoresPediatria } from '../controllers/pediatriaPacientes.js';
import { permitirPediatria, verificarPediatriaJwt } from '../middleware/pediatriaJwt.js';

export function crearRouterPediatria(opciones = {}) {
  const router = Router();
  const c = controladoresPediatria(opciones.obtenerRepositorio ?? obtenerRepositorio);
  const verificar = verificarPediatriaJwt(opciones.obtenerClave);

  const seleccionar = (req, res, next) => {
    const token = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '')?.[1];
    const destino = token ? jwt.decode(token)?.institucion : undefined;
    if (['hospital', 'laboratorio', 'odontologia'].includes(destino)) return next('route');
    next();
  };

  const ruta = (metodo, path, roles, controlador, generica = true) => {
    router[metodo](path, ...(generica ? [seleccionar] : []), verificar, permitirPediatria(...roles), controlador);
  };

  ruta('post', '/consultas', ['pediatra'], c.crearConsulta);
  ruta('post', '/consultas/:id/diagnosticos', ['pediatra'], c.diagnostico);
  ruta('post', '/diagnosticos/:id/tratamientos', ['pediatra'], c.tratamiento);
  ruta('post', '/consultas/:id/recetas', ['pediatra'], c.receta);
  ruta('post', '/pacientes/:id/crecimiento', ['enfermeria', 'pediatra'], c.registrarCrecimiento);
  ruta('post', '/pacientes/:id/vacunas', ['enfermeria', 'pediatra'], c.registrarVacuna);
  ruta('get', '/pediatria/catalogos', ['recepcion', 'enfermeria', 'pediatra'], c.catalogos, false);
  ruta('get', '/pediatria/status', ['recepcion', 'enfermeria', 'pediatra'], c.estado, false);
  ruta('post', '/pacientes', ['recepcion', 'pediatra'], c.registrar);
  ruta('get', '/pacientes', ['recepcion', 'enfermeria', 'pediatra'], c.listar);
  ruta('get', '/pacientes/:id', ['recepcion', 'enfermeria', 'pediatra'], c.consultar);
  ruta('get', '/pacientes/:id/historial', ['enfermeria', 'pediatra'], c.historial);
  ruta('patch', '/pacientes/:id/archivar', ['pediatra'], c.archivar);

  return router;
}
