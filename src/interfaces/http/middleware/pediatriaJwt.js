import jwt from 'jsonwebtoken';
import { MotorNoDisponible, NoAutenticado, Prohibido } from '../../../domain/errores.js';

export function verificarPediatriaJwt(obtenerClave = () => process.env.JWT_SECRET) {
  return (req, res, next) => {
    const bearer = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
    if (!bearer) return next(new NoAutenticado());
    const clave = obtenerClave();
    if (!clave) return next(new MotorNoDisponible('pediatria', 'Autenticación no configurada'));
    let usuario;
    try {
      usuario = jwt.verify(bearer[1], clave, {
        algorithms: ['HS256'], issuer: 'red-salud', audience: 'red-salud-web',
      });
      if (typeof usuario !== 'object' || !Number.isFinite(usuario.exp) ||
          typeof usuario.sub !== 'string' || !/^[1-9]\d{0,9}$/.test(usuario.sub) ||
          Number(usuario.sub) > 2147483647) throw new Error();
    } catch {
      return next(new NoAutenticado());
    }
    if (usuario.institucion !== 'pediatria' ||
        !['pediatra', 'enfermeria', 'recepcion'].includes(usuario.rol)) return next(new Prohibido());
    req.user = usuario;
    next();
  };
}

export function permitirPediatria(...roles) {
  return (req, res, next) => (roles.includes(req.user?.rol) ? next() : next(new Prohibido()));
}
