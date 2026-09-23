import { Router } from 'express';
import { createPurchaseController, listPurchasesController } from '../controllers/purchase.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const purchaseRouter = Router();

purchaseRouter.get('/', requireAuth, listPurchasesController);
purchaseRouter.post('/', requireAuth, requireRole('ADMIN'), auditAction('PURCHASE_CREATE'), createPurchaseController);