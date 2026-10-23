import { Router } from 'express';
import {
  getOrdenes,
  getOrdenById,
  crearOrden,
  agregarRefaccion,
  agregarServicio,
  finalizarOrden,
  cancelarOrden,
  registrarPago,
} from '../controllers/ordenes.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

router.get('/', getOrdenes);
router.get('/:id', getOrdenById);
router.post('/', requerirRol('admin', 'recepcion'), crearOrden);
router.post('/:id/refacciones', requerirRol('admin', 'recepcion', 'mecanico'), agregarRefaccion);
router.post('/:id/servicios', requerirRol('admin', 'recepcion', 'mecanico'), agregarServicio);
router.put('/:id/finalizar', requerirRol('admin', 'recepcion'), finalizarOrden);
router.put('/:id/cancelar', requerirRol('admin', 'recepcion'), cancelarOrden);
router.post('/:id/pagos', requerirRol('admin', 'recepcion'), registrarPago);

export default router;
