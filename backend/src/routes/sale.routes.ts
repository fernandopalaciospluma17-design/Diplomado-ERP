import { Router } from 'express';
import { createSaleController, listSalesController } from '../controllers/sale.controller.js';
import { createPaymentController, listPaymentsController } from '../controllers/payment.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const saleRouter = Router();

saleRouter.get('/', requireAuth, requirePermission('sales.sale.read'), listSalesController);
saleRouter.post('/', requireAuth, requirePermission('sales.sale.create'), auditAction('SALE_CREATE'), createSaleController);
saleRouter.get('/:saleNumber/payments', requireAuth, requirePermission('sales.payment.read'), listPaymentsController);
saleRouter.post('/:saleNumber/payments', requireAuth, requirePermission('sales.payment.create'), auditAction('PAYMENT_CREATE'), createPaymentController);
