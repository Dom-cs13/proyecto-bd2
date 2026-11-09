import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { crearPoolPostgres } from '../../../infrastructure/adapters/postgresql/connection.js';

export const routerOdontologiaAuth = Router();

let pool;
const aliasDemo = new Map([
  ['odontologo', 'odontologo.demo@example.invalid'],
  ['secretaria', 'secretaria.demo@example.invalid'],
]);

routerOdontologiaAuth.post('/auth/login', async (req, res, next) => {
  const { institucion, usuario, password } = req.body ?? {};

  if (institucion !== 'odontologia') {
    return next();
  }

  if (typeof usuario !== 'string' ||
      typeof password !== 'string' ||
      !usuario.trim() || !password) {
    return res.status(400).json({
      error: { codigo: 'VALIDACION', mensaje: 'Usuario y contrasena requeridos' }
    });
  }

  if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
    return res.status(503).json({
      error: { codigo: 'MOTOR_NO_DISPONIBLE', mensaje: 'Servicio no configurado' }
    });
  }

  try {
    pool ??= crearPoolPostgres({ ssl: { rejectUnauthorized: true } });
    const resultado = await pool.query(
      `SELECT u.id_usuario, u.correo, r.nombre AS rol
       FROM public.usuario u
       JOIN public.rol r ON r.id_rol = u.id_rol
       WHERE LOWER(u.correo) = LOWER($1)
         AND u.estado = TRUE
         AND u.password_hash = extensions.crypt($2, u.password_hash)
         AND r.nombre IN ('odontologo', 'secretaria')
       LIMIT 1`,
      [
        aliasDemo.get(usuario.trim().toLowerCase()) ?? usuario.trim(),
        password
      ]
    );

    if (resultado.rowCount !== 1) {
      return res.status(401).json({
        error: { codigo: 'NO_AUTENTICADO', mensaje: 'Credenciales incorrectas' }
      });
    }

    const cuenta = resultado.rows[0];

    const token = jwt.sign(
      {
        institucion: 'odontologia',
        rol: cuenta.rol,
        usuario: cuenta.correo
      },
      process.env.JWT_SECRET,
      {
        subject: String(cuenta.id_usuario),
        expiresIn: '2h',
        algorithm: 'HS256',
        issuer: 'red-salud',
        audience: 'red-salud-web'
      }
    );

    return res.json({ token });
  } catch {
    return res.status(503).json({
      error: { codigo: 'MOTOR_NO_DISPONIBLE', mensaje: 'No se pudo validar el acceso' }
    });
  }
});
