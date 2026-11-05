import { Router } from 'express';
import {
  getVehiculos,
  getVehiculoById,
  actualizarVehiculo,
  eliminarVehiculo,
} from '../controllers/vehiculos.controller.js';
import { crearVehiculo } from '../controllers/clientes.controller.js';
import { verificarToken, requerirRol } from '../middlewares/auth.js';

const router = Router();

// Todas las rutas requieren estar logueado
router.use(verificarToken);

router.get('/', getVehiculos);
router.get('/:id', getVehiculoById);
// Alta de vehículo (también disponible en POST /api/clientes/vehiculos, que se conserva)
router.post('/', requerirRol('admin', 'recepcion'), crearVehiculo);
router.put('/:id', requerirRol('admin', 'recepcion'), actualizarVehiculo);
router.delete('/:id', requerirRol('admin'), eliminarVehiculo); // Solo admin puede dar de baja lógica

export default router;
