import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import apiRouter from './server/api.ts';
import { getDb } from './server/db.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Inicializar base de datos SQLite relacional
  try {
    await getDb();
    console.log('[DB] Base de datos SQLite relacional inicializada correctamente.');
  } catch (err) {
    console.error('[DB] Error inicializando base de datos:', err);
  }

  // Rutas de API REST
  app.use('/api', apiRouter);

  // Modo desarrollo o producción
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AutoGestión Pro] Servidor full-stack escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
