import { Router } from 'express';
import {
  getOrdenes,
  getOrdenById,
  crearOrden,
  agregarRefaccion,
  agregarServicio,
  finalizarOrden,
  registrarPago,
  entregarOrden,
  asignarMecanicoOrden,
} from '../controllers/ordenes.controller.js';
import {
  getCatalogosOrdenes,
  actualizarConfigEvidenciaServicio,
  getEvidenciasOrden,
  subirEvidenciasOrden,
  servirArchivoEvidencia,
  eliminarEvidenciaOrden,
} from '../controllers/evidencias.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

router.use(verificarToken);

// Catálogos y reglas de evidencia (declarados antes de /:id)
router.get('/catalogos', getCatalogosOrdenes);
router.put(
  '/servicios/:servicioId/evidencia-config',
  requerirRol('admin'),
  actualizarConfigEvidenciaServicio
);

// Órdenes de trabajo
router.get('/', getOrdenes);
router.get('/:id', getOrdenById);
router.post('/', requerirRol('admin', 'recepcion'), crearOrden);
router.put('/:id/mecanico', requerirRol('admin', 'recepcion'), asignarMecanicoOrden);
router.post('/:id/refacciones', requerirRol('admin', 'recepcion', 'mecanico'), agregarRefaccion);
router.post('/:id/servicios', requerirRol('admin', 'recepcion', 'mecanico'), agregarServicio);

// Evidencia fotográfica por orden y servicio
router.get('/:id/evidencias', getEvidenciasOrden);
router.post('/:id/evidencias', requerirRol('admin', 'recepcion', 'mecanico'), subirEvidenciasOrden);
router.get('/:id/evidencias/:evidenciaId/archivo', servirArchivoEvidencia);
router.delete(
  '/:id/evidencias/:evidenciaId',
  requerirRol('admin', 'recepcion', 'mecanico'),
  eliminarEvidenciaOrden
);

// Cierre, cobro y entrega
router.put('/:id/finalizar', requerirRol('admin', 'recepcion'), finalizarOrden);
router.put('/:id/entregar', requerirRol('admin', 'recepcion'), entregarOrden);
router.post('/:id/pagos', requerirRol('admin', 'recepcion'), registrarPago);

export default router;
