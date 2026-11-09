import jwt from 'jsonwebtoken';
import { MotorNoDisponible, NoAutenticado, Prohibido } from '../../../domain/errores.js';

// Extracci?n opcional; cada router protegido exige identidad y rol.
export function autenticarJwt(req, res, next) {
  const bearer = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
  if (!bearer || !process.env.JWT_SECRET) return next();
  try {
    const usuario = jwt.verify(bearer[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof usuario === 'object' && Number.isFinite(usuario.exp)) req.user = usuario;
  } catch { /* El router protegido rechaza la sesi?n sin identidad verificada. */ }
  next();
}

export function requerirAutenticacion(req, res, next) {
  if (!/^Bearer ([^\s]+)$/i.test(req.get('authorization') ?? '')) return next(new NoAutenticado());
  if (!process.env.JWT_SECRET) return next(new MotorNoDisponible('autenticacion', 'Autenticaci?n no configurada'));
  if (!req.user) return next(new NoAutenticado());
  next();
}

export function autenticar(req, res, next) {
  requerirAutenticacion(req, res, (error) => {
    if (error) return next(error);
    if (req.user.institucion !== 'hospital' || req.user.rol !== 'admin') return next(new Prohibido());
    next();
  });
}
