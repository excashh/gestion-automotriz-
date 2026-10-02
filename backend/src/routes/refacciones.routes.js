import { Router } from 'express';
import {
  getRefacciones,
  getStockBajo,
  crearRefaccion,
  actualizarRefaccion,
  eliminarRefaccion,
} from '../controllers/refacciones.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

router.get('/', getRefacciones);
router.get('/stock-bajo', getStockBajo);
router.post('/', requerirRol('admin'), crearRefaccion);
router.put('/:id', requerirRol('admin'), actualizarRefaccion);
router.delete('/:id', requerirRol('admin'), eliminarRefaccion);

export default router;
