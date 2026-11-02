import { Router } from 'express';
import {
  getMecanicos,
  getMecanicoById,
  crearMecanico,
  actualizarMecanico,
  cambiarDisponibilidadMecanico,
} from '../controllers/mecanicos.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

router.get('/', getMecanicos);
router.get('/:id', getMecanicoById);
router.post('/', requerirRol('admin', 'recepcion'), crearMecanico);
router.put('/:id', requerirRol('admin', 'recepcion'), actualizarMecanico);
router.patch(
  '/:id/disponibilidad',
  requerirRol('admin', 'recepcion', 'mecanico'),
  cambiarDisponibilidadMecanico
);

export default router;
