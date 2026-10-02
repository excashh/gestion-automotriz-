import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import refaccionesRoutes from './routes/refacciones.routes.js';
import ordenesRoutes from './routes/ordenes.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares globales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Endpoint de salud / status
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    sistema: 'AutoPro Taller Automotriz API',
    estado: 'online',
    timestamp: new Date().toISOString(),
  });
});

// Rutas principales de la API (Sección 5 y 8 de la rúbrica)
app.use('/api/auth', authRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/refacciones', refaccionesRoutes);
app.use('/api/ordenes', ordenesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Manejo de ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    mensaje: `La ruta solicitada '${req.originalUrl}' no existe en esta API.`,
  });
});

// Manejador centralizado de errores (Req #18)
app.use(errorHandler);

// Iniciar servidor solo si se ejecuta directamente
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 AutoPro Backend activo en http://localhost:${PORT}`);
    console.log(`📡 Endpoints base disponibles en /api/`);
    console.log(`===============================================`);
  });
}

export default app;
