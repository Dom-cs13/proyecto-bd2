import { routerPediatriaAuth } from './interfaces/http/routes/pediatriaAuth.js';
import { routerOdontologiaAuth } from './interfaces/http/routes/odontologiaAuth.js';
import { crearRouterOdontologia } from './interfaces/http/routes/odontologiaPacientes.js';
import { crearRouterPediatria } from './interfaces/http/routes/pediatriaPacientes.js';
// Arma la app Express sin escuchar un puerto (los tests la usan con Supertest).
import express from 'express';
import { errorHandler, noEncontrado } from './interfaces/http/middleware/errorHandler.js';

export function crearApp(opciones = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static('frontend'));

  // Las rutas se montan aquí a partir de I1-03, I2-03 e I3-03.

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

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}
