import { Router } from 'express';
import {
  getDashboardStats,
  getReporteVentas,
  getReporteRefaccionesTop,
} from '../controllers/dashboard.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

router.get('/stats', getDashboardStats);
router.get('/reportes/ventas', requerirRol('admin'), getReporteVentas);
router.get('/reportes/refacciones-top', requerirRol('admin'), getReporteRefaccionesTop);

export default router;
