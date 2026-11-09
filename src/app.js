import { routerPediatriaAuth } from './interfaces/http/routes/pediatriaAuth.js';
import { routerOdontologiaAuth } from './interfaces/http/routes/odontologiaAuth.js';
import { crearRouterOdontologia } from './interfaces/http/routes/odontologiaPacientes.js';
import { crearRouterPediatria } from './interfaces/http/routes/pediatriaPacientes.js';
// Arma la app Express sin escuchar un puerto (los tests la usan con Supertest).
import express from 'express';
import authRoutes from './interfaces/http/routes/auth.js';
import pacientesRoutes from './interfaces/http/routes/pacientes.js';
import polizasRoutes from './interfaces/http/routes/polizas.js';
import doctoresRoutes from './interfaces/http/routes/doctores.js';
import laboratoriosRoutes from './interfaces/http/routes/laboratorios.js';
import { errorHandler, noEncontrado } from './interfaces/http/middleware/errorHandler.js';

export function crearApp(opciones = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static('frontend'));

  app.use(routerPediatriaAuth);
  app.use(routerOdontologiaAuth);

  const soloOdonto = opciones.odontologia && !opciones.pediatria;
  const soloPedia = opciones.pediatria && !opciones.odontologia;

  if (!soloPedia) {
    app.use(crearRouterOdontologia(opciones.odontologia));
  }
  if (!soloOdonto) {
    app.use(crearRouterPediatria(opciones.pediatria));
  }

  // Rutas de Hospital General (I1 · MongoDB Atlas)
  if (!soloOdonto && !soloPedia) {
    app.use('/auth', authRoutes);
    app.use('/pacientes', pacientesRoutes);
    app.use('/polizas', polizasRoutes);
    app.use('/doctores', doctoresRoutes);
    app.use('/laboratorios', laboratoriosRoutes);
  }

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}
