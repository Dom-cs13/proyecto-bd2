import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';
import { NoAutenticado } from '../../../domain/errores.js';

const router = Router();

router.post('/login', (req, res, next) => {
  const { institucion, usuario, password } = req.body || {};

  if (!institucion || !usuario || !password) {
    return next(new NoAutenticado('CREDENCIALES_INCOMPLETAS', 'Debe proporcionar institución, usuario y contraseña'));
  }

  // Generación de token JWT para la sesión institucional
  const payload = {
    institucion: String(institucion).toLowerCase(),
    usuario,
    rol: 'admin',
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
  return res.json({ token });
});

export default router;

