import { Router } from 'express';
import {
  getClientes,
  getClienteById,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  crearVehiculo,
} from '../controllers/clientes.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas requieren estar logueado
router.use(verificarToken);

router.get('/', getClientes);
router.get('/:id', getClienteById);
router.post('/', requerirRol('admin', 'recepcion'), crearCliente);
router.put('/:id', requerirRol('admin', 'recepcion'), actualizarCliente);
router.delete('/:id', requerirRol('admin'), eliminarCliente); // Solo admin puede dar de baja lógica

router.post('/vehiculos', requerirRol('admin', 'recepcion'), crearVehiculo);

export default router;
