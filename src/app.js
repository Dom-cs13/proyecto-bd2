import express from 'express';
import { routerPediatriaAuth } from './interfaces/http/routes/pediatriaAuth.js';
import { routerOdontologiaAuth } from './interfaces/http/routes/odontologiaAuth.js';
import { routerLaboratorioAuth } from './interfaces/http/routes/laboratorioAuth.js';
import { routerLaboratorio } from './interfaces/http/routes/laboratorioRoutes.js';
import { crearRouterOdontologia } from './interfaces/http/routes/odontologiaPacientes.js';
import { crearRouterPediatria } from './interfaces/http/routes/pediatriaPacientes.js';
import { crearRouterRed } from './interfaces/http/routes/consultaEnRed.js';
import authRoutes from './interfaces/http/routes/auth.js';
import pacientesRoutes from './interfaces/http/routes/pacientes.js';
import polizasRoutes from './interfaces/http/routes/polizas.js';
import doctoresRoutes from './interfaces/http/routes/doctores.js';
import laboratoriosRoutes from './interfaces/http/routes/laboratorios.js';
import { autenticarJwt } from './interfaces/http/middleware/auth.js';
import { errorHandler, noEncontrado } from './interfaces/http/middleware/errorHandler.js';

export function crearApp(opciones = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static('frontend'));
  app.use(autenticarJwt);

  app.use(routerPediatriaAuth);
  app.use(routerOdontologiaAuth);
  app.use(crearRouterRed(opciones.red));
  app.use(routerLaboratorioAuth);

  const soloOdonto = opciones.odontologia && !opciones.pediatria;
  const soloPedia = opciones.pediatria && !opciones.odontologia;

  if (!soloPedia) {
    app.use(crearRouterOdontologia(opciones.odontologia));
  }
  if (!soloOdonto) {
    app.use(crearRouterPediatria(opciones.pediatria));
  }

  // Rutas de Laboratorio Clínico (I3 · Firestore)
  if (!soloOdonto && !soloPedia) {
    app.use(routerLaboratorio);
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
