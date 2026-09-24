import { Router } from 'express';
import { closePOSessionController, createPOSTicketController, listPOSSessionsController, listPOSTicketsController, openPOSessionController } from '../controllers/pos.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const posRouter = Router();
posRouter.get('/sessions', requireAuth, requirePermission('pos.session.read'), listPOSSessionsController);
posRouter.post('/sessions', requireAuth, requirePermission('pos.session.create'), auditAction('POS_SESSION_OPEN'), openPOSessionController);
posRouter.post('/sessions/:sessionNumber/close', requireAuth, requirePermission('pos.session.approve'), auditAction('POS_SESSION_CLOSE'), closePOSessionController);
posRouter.get('/sessions/:sessionNumber/tickets', requireAuth, requirePermission('pos.ticket.read'), listPOSTicketsController);
posRouter.post('/tickets', requireAuth, requirePermission('pos.ticket.create'), auditAction('POS_TICKET_CREATE'), createPOSTicketController);
