import { Router } from 'express';
import { createPurchaseController, listPurchasesController } from '../controllers/purchase.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const purchaseRouter = Router();

purchaseRouter.get('/', requireAuth, requirePermission('purchases.purchase.read'), listPurchasesController);
purchaseRouter.post('/', requireAuth, requirePermission('purchases.purchase.create'), auditAction('PURCHASE_CREATE'), createPurchaseController);
