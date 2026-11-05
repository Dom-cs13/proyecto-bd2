import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { crearPoolMariaDb } from '../../../infrastructure/adapters/mariadb/connection.js';

export const routerPediatriaAuth = Router();

let poolPediatria = null;

function obtenerPool() {
  if (!poolPediatria) {
    poolPediatria = crearPoolMariaDb();
  }
  return poolPediatria;
}

const ALIAS_DEMO = {
  pediatra: 'pediatra.demo@example.invalid',
  enfermeria: 'enfermeria.demo@example.invalid',
  recepcion: 'recepcion.demo@example.invalid',
};

routerPediatriaAuth.post('/auth/login', async (req, res, next) => {
  const { institucion, usuario, password } = req.body ?? {};

  if (institucion !== 'pediatria') {
    return next();
  }

  if (
    typeof usuario !== 'string' ||
    typeof password !== 'string' ||
    !usuario.trim() ||
    !password
  ) {
    return res.status(400).json({
      error: { codigo: 'VALIDACION', mensaje: 'Usuario y contrasena requeridos' },
    });
  }

  if (!process.env.JWT_SECRET || !process.env.MARIADB_HOST) {
    return res.status(503).json({
      error: { codigo: 'MOTOR_NO_DISPONIBLE', mensaje: 'Servicio de Pediatria no configurado' },
    });
  }

  let conn;
  try {
    const pool = obtenerPool();
    conn = await pool.getConnection();

    const correoBuscado = ALIAS_DEMO[usuario.trim().toLowerCase()] ?? usuario.trim();

    const sql = `
      SELECT u.id_usuario, u.correo, r.nombre AS rol
      FROM usuario u
      JOIN rol r ON r.id_rol = u.id_rol
      WHERE LOWER(u.correo) = LOWER(?)
        AND (u.estado = 1 OR u.estado = TRUE OR u.estado = 'activo' OR u.estado = 'ACTIVO')
        AND (u.password_hash = SHA2(?, 256) OR u.password_hash = ?)
        AND r.nombre IN ('pediatra', 'enfermeria', 'recepcion')
      LIMIT 1
    `;

    const resultado = await conn.query(sql, [correoBuscado, password, password]);
    const filas = Array.isArray(resultado) ? resultado : resultado.rows ?? [];

    if (filas.length !== 1) {
      return res.status(401).json({
        error: { codigo: 'NO_AUTENTICADO', mensaje: 'Credenciales incorrectas en Pediatria' },
      });
    }

    const cuenta = filas[0];

    const token = jwt.sign(
      {
        institucion: 'pediatria',
        rol: cuenta.rol,
        usuario: cuenta.correo,
      },
      process.env.JWT_SECRET,
      {
        subject: String(cuenta.id_usuario),
        expiresIn: '2h',
        algorithm: 'HS256',
        issuer: 'red-salud',
        audience: 'red-salud-web',
      }
    );

    return res.json({ token });
  } catch (error) {
    console.error('Error de autenticacion pediatrica:', error.code || error.message);
    return res.status(503).json({
      error: { codigo: 'MOTOR_NO_DISPONIBLE', mensaje: 'No se pudo validar el acceso en Pediatria' },
    });
  } finally {
    if (conn && typeof conn.release === 'function') conn.release();
  }
});
