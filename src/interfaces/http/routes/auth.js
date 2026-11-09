import { Router } from 'express';
import { loginConfigurado } from '../controllers/loginConfigurado.js';
const router = Router();
router.post('/login', loginConfigurado('hospital', ['admin']));
export default router;
