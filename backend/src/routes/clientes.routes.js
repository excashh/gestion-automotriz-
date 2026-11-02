import { Router } from 'express';
import {
  getClientes,
  getClienteById,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  getVehiculos,
  crearVehiculo,
  getHistorialVehiculo,
} from '../controllers/clientes.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas requieren estar autenticado
router.use(verificarToken);

router.get('/', getClientes);

// Rutas de vehículos (declaradas antes de /:id para evitar colisión de parámetros)
router.get('/vehiculos', getVehiculos);
router.get('/vehiculos/:vehiculoId/historial', getHistorialVehiculo);
router.post('/vehiculos', requerirRol('admin', 'recepcion'), crearVehiculo);

router.get('/:id', getClienteById);
router.post('/', requerirRol('admin', 'recepcion'), crearCliente);
router.put('/:id', requerirRol('admin', 'recepcion'), actualizarCliente);
router.delete('/:id', requerirRol('admin'), eliminarCliente);

export default router;
