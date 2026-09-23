import { Router } from 'express';
import { createSaleController, listSalesController } from '../controllers/sale.controller.js';
import { createPaymentController, listPaymentsController } from '../controllers/payment.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const saleRouter = Router();

saleRouter.get('/', requireAuth, listSalesController);
saleRouter.post('/', requireAuth, requireRole('ADMIN'), auditAction('SALE_CREATE'), createSaleController);
saleRouter.get('/:saleNumber/payments', requireAuth, listPaymentsController);
saleRouter.post('/:saleNumber/payments', requireAuth, requireRole('ADMIN'), auditAction('PAYMENT_CREATE'), createPaymentController);