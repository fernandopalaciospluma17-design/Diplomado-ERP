import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middlewares/auth.js';

export const healthRouter = Router();

healthRouter.get('/', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'Servicio disponible',
    data: { service: 'erp-backend', status: 'ok', timestamp: new Date().toISOString() }
  });
});

healthRouter.get('/protected', requireAuth, (request, response) => {
  response.json({ success: true, message: 'Autenticacion valida', data: { userId: request.user?.sub } });
});

healthRouter.get('/ready', (_request, response) => {
  const databaseReady = mongoose.connection.readyState === 1;
  response.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    message: databaseReady ? 'Servicio listo' : 'Base de datos no disponible',
    data: { service: 'erp-backend', status: databaseReady ? 'ready' : 'not_ready', database: databaseReady ? 'connected' : 'disconnected' }
  });
});