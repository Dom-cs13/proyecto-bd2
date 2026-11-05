import { Router } from 'express';
import jwt from 'jsonwebtoken';
import pg from 'pg';

export const routerOdontologiaAuth = Router();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  connectionTimeoutMillis: 10000
});

routerOdontologiaAuth.post('/auth/login', async (req, res, next) => {
  const { institucion, usuario, password } = req.body ?? {};

  if (institucion !== 'odontologia') {
    return next();
  }

  if (typeof usuario !== 'string' ||
      typeof password !== 'string' ||
      !usuario.trim() || !password) {
    return res.status(400).json({
      error: { mensaje: 'Usuario y contrasena requeridos' }
    });
  }

  if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
    return res.status(503).json({
      error: { mensaje: 'Servicio no configurado' }
    });
  }

  try {
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
        ({
          odontologo: 'odontologo.demo@example.invalid',
          secretaria: 'secretaria.demo@example.invalid'
        })[usuario.trim().toLowerCase()] ?? usuario.trim(),
        password
      ]
    );

    if (resultado.rowCount !== 1) {
      return res.status(401).json({
        error: { mensaje: 'Credenciales incorrectas' }
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
  } catch (error) {
    console.error('Error de autenticacion odontologica:', error.code || error.message);
    return res.status(503).json({
      error: { mensaje: 'No se pudo validar el acceso' }
    });
  }
});
