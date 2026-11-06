import { obtenerRepositorio } from '../../../infrastructure/config/RepositoryFactory.js';

export function resolverRepositorio(req, res, next) {
  try {
    const institucion = req.user?.institucion || 'hospital';
    req.repo = obtenerRepositorio(institucion);
    next();
  } catch (err) {
    next(err);
  }
}

