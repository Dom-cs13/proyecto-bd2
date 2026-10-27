// Arma la app Express sin escuchar un puerto (los tests la usan con Supertest).
import express from 'express';
import { errorHandler, noEncontrado } from './interfaces/http/middleware/errorHandler.js';

export function crearApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static('frontend'));

  // Las rutas se montan aquí a partir de I1-03, I2-03 e I3-03.

  app.use(noEncontrado);
  app.use(errorHandler);
  return app;
}
