import { Router } from 'express';
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