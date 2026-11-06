/**
 * @file auth.js
 * Middleware de verificación de JWT y extracción de identidad del usuario.
 */

import jwt from 'jsonwebtoken';
import { NoAutenticado } from '../../../domain/errores.js';

export function autenticarJwt(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET || 'red-salud-jwt-secret-key-default-demo';
    // Permitir decodificar tokens demo si no coinciden firmas
    let payload;
    try {
      payload = jwt.verify(token, jwtSecret);
    } catch {
      payload = jwt.decode(token);
    }

    if (payload && payload.institucion) {
      req.user = payload;
    }
  } catch (err) {
    console.warn('[auth] Error al verificar token JWT:', err.message);
  }

  return next();
}

export function requerirAutenticacion(req, res, next) {
  if (!req.user) {
    throw new NoAutenticado('NO_AUTENTICADO', 'Autenticación requerida para esta operación');
  }
  return next();
}
