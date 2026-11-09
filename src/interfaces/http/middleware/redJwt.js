import jwt from 'jsonwebtoken';
import { MotorNoDisponible, NoAutenticado, Prohibido } from '../../../domain/errores.js';

const roles = {
  hospital: ['admin'],
  odontologia: ['odontologo', 'secretaria'],
  laboratorio: ['laboratorista', 'tecnico', 'validador', 'admin'],
  pediatria: ['pediatra', 'enfermeria', 'recepcion'],
};

export function verificarRedJwt(obtenerClave = () => process.env.JWT_SECRET) {
  return (req, res, next) => {
    const bearer = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
    if (!bearer) return next(new NoAutenticado());
    const clave = obtenerClave();
    if (!clave) return next(new MotorNoDisponible('red', 'Autenticación de red no configurada'));
    let usuario;
    try {
      usuario = jwt.verify(bearer[1], clave, { algorithms: ['HS256'] });
      if (!usuario || typeof usuario !== 'object' || !Number.isFinite(usuario.exp)) throw new Error();
      // El login actual de Hospital no emite iss/aud/sub. Solo su firma válida
      // permite la lectura reducida; no se hereda su fallback a decode.
      if (usuario.institucion !== 'hospital' || usuario.iss !== undefined || usuario.aud !== undefined) {
        jwt.verify(bearer[1], clave, { algorithms: ['HS256'], issuer: 'red-salud', audience: 'red-salud-web' });
      }
    } catch { return next(new NoAutenticado()); }
    if (!Object.hasOwn(roles, usuario.institucion) || !roles[usuario.institucion].includes(usuario.rol)) return next(new Prohibido());
    req.user = usuario;
    next();
  };
}
