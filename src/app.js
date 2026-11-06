// Arma la app Express sin escuchar un puerto (los tests la usan con Supertest).
import express from 'express';
import authRoutes from './interfaces/http/routes/auth.js';
import pacientesRoutes from './interfaces/http/routes/pacientes.js';
import polizasRoutes from './interfaces/http/routes/polizas.js';
import doctoresRoutes from './interfaces/http/routes/doctores.js';
import laboratoriosRoutes from './interfaces/http/routes/laboratorios.js';
import { errorHandler, noEncontrado } from './interfaces/http/middleware/errorHandler.js';

export function crearApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('frontend'));

  // Rutas de autenticación y recursos clínicos
  app.use('/auth', authRoutes);
  app.use('/pacientes', pacientesRoutes);
  app.use('/polizas', polizasRoutes);
  app.use('/doctores', doctoresRoutes);
  app.use('/laboratorios', laboratoriosRoutes);

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}
