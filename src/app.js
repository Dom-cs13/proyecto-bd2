import express from 'express';
import { routerPediatriaAuth } from './interfaces/http/routes/pediatriaAuth.js';
import { routerOdontologiaAuth } from './interfaces/http/routes/odontologiaAuth.js';
import { routerLaboratorioAuth } from './interfaces/http/routes/laboratorioAuth.js';
import { routerLaboratorio } from './interfaces/http/routes/laboratorioRoutes.js';
import { autenticarJwt } from './interfaces/http/middleware/auth.js';
import { errorHandler, noEncontrado } from './interfaces/http/middleware/errorHandler.js';

export function crearApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('frontend'));
  app.use(autenticarJwt);

  // Las rutas se montan aquí a partir de I1-03, I2-03 e I3-03.
  app.use(routerPediatriaAuth);
  app.use(routerOdontologiaAuth);
  app.use(routerLaboratorioAuth);
  app.use(routerLaboratorio);

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}
