/**
 * @file laboratorioAuth.js
 * Ruta de autenticación y emisión de JWT para el módulo de Laboratorio Clínico.
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';

export const routerLaboratorioAuth = Router();

const USUARIOS_DEMO = {
  laboratorista: {
    id: 'usr-lab-001',
    correo: 'laboratorista.demo@example.invalid',
    rol: 'laboratorista',
    password: 'password123',
  },
  tecnico: {
    id: 'usr-lab-002',
    correo: 'tecnico.demo@example.invalid',
    rol: 'tecnico',
    password: 'password123',
  },
  validador: {
    id: 'usr-lab-003',
    correo: 'validador.demo@example.invalid',
    rol: 'validador',
    password: 'password123',
  },
  admin: {
    id: 'usr-lab-admin',
    correo: 'admin.laboratorio@example.invalid',
    rol: 'admin',
    password: 'password123',
  },
};

routerLaboratorioAuth.post('/auth/login', async (req, res, next) => {
  const { institucion, usuario, password } = req.body ?? {};

  if (institucion !== 'laboratorio') {
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

  const uKey = usuario.trim().toLowerCase();
  const demoAccount = USUARIOS_DEMO[uKey] || Object.values(USUARIOS_DEMO).find((u) => u.correo.toLowerCase() === uKey);

  let cuentaValida = null;
  if (demoAccount) {
    if (demoAccount.password === password) {
      cuentaValida = demoAccount;
    }
  } else if (password === 'password123' || password === 'demo') {
    // Si no es un usuario predefinido pero tiene contraseña demo válida
    cuentaValida = {
      id: `usr-${Date.now().toString().slice(-4)}`,
      correo: usuario.trim(),
      rol: uKey.includes('validador') ? 'validador' : 'laboratorista',
    };
  }

  if (!cuentaValida) {
    return res.status(401).json({
      error: { codigo: 'NO_AUTENTICADO', mensaje: 'Credenciales incorrectas en Laboratorio Clínico' },
    });
  }

  const jwtSecret = process.env.JWT_SECRET || 'red-salud-jwt-secret-key-default-demo';

  const token = jwt.sign(
    {
      institucion: 'laboratorio',
      rol: cuentaValida.rol,
      usuario: cuentaValida.correo,
    },
    jwtSecret,
    {
      subject: String(cuentaValida.id),
      expiresIn: '2h',
      algorithm: 'HS256',
      issuer: 'red-salud',
      audience: 'red-salud-web',
    }
  );

  return res.json({ token });
});
