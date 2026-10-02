import { Router } from 'express';
import { login, getPerfil } from '../controllers/auth.controller.js';
import { verificarToken } from '../middlewares/auth.js';

const router = Router();

router.post('/login', login);
router.get('/perfil', verificarToken, getPerfil);

export default router;
