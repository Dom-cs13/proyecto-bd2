import { Router } from 'express';
import { loginConfigurado } from '../controllers/loginConfigurado.js';
export const routerLaboratorioAuth = Router();
routerLaboratorioAuth.post('/auth/login', loginConfigurado('laboratorio', ['laboratorista', 'tecnico', 'validador', 'admin']));
