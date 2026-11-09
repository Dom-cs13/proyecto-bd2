import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import { MotorNoDisponible, NoAutenticado, Validacion } from '../../../domain/errores.js';

const derivar = promisify(scrypt);

// Cuentas provisionadas por el operador; nunca se crean usuarios a partir del login.
export function loginConfigurado(institucion, roles) {
  return async (req, res, next) => {
    if (req.body?.institucion !== institucion) return next();
    const { usuario, password } = req.body;
    try {
      if (typeof usuario !== 'string' || !usuario.trim() || typeof password !== 'string' || !password || password.length > 1024) throw new Validacion();
      let cuentas;
      try { cuentas = JSON.parse(process.env[`${institucion.toUpperCase()}_AUTH_USUARIOS`] ?? 'null'); } catch { /* configuración inválida */ }
      if (!process.env.JWT_SECRET || !Array.isArray(cuentas) || !cuentas.length) throw new MotorNoDisponible(institucion, 'Autenticación institucional no configurada');
      const cuenta = cuentas.find((c) => typeof c.usuario === 'string' && c.usuario.toLowerCase() === usuario.trim().toLowerCase());
      const [formato, sal, hash] = (cuenta?.passwordHash ?? '').split('$');
      if (!cuenta || !roles.includes(cuenta.rol) || !cuenta.id || formato !== 'scrypt' || !/^[a-f0-9]{32,128}$/i.test(sal ?? '') || !/^[a-f0-9]{128}$/i.test(hash ?? '')) throw new NoAutenticado();
      const calculado = await derivar(password, sal, 64);
      if (!timingSafeEqual(calculado, Buffer.from(hash, 'hex'))) throw new NoAutenticado();
      res.json({ token: jwt.sign({ institucion, rol: cuenta.rol, usuario: cuenta.usuario }, process.env.JWT_SECRET,
        { subject: String(cuenta.id), expiresIn: '2h', algorithm: 'HS256', issuer: 'red-salud', audience: 'red-salud-web' }) });
    } catch (error) { next(error); }
  };
}
