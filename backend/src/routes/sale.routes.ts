import { Router } from 'express';
import { createSaleController, createSaleReturnController, listSaleReturnsController, listSalesController } from '../controllers/sale.controller.js';
import { createPaymentController, listPaymentsController } from '../controllers/payment.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';
import { convertSalesQuoteController, createSalesDeliveryController, createSalesInvoiceController, createSalesOrderController, createSalesQuoteController, listSalesDeliveriesController, listSalesInvoicesController, listSalesOrdersController, listSalesQuotesController } from '../controllers/sales-workflow.controller.js';

export const saleRouter = Router();

saleRouter.get('/', requireAuth, requirePermission('sales.sale.read'), listSalesController);
saleRouter.post('/', requireAuth, requirePermission('sales.sale.create'), auditAction('SALE_CREATE'), createSaleController);
saleRouter.get('/quotes', requireAuth, requirePermission('sales.quote.read'), listSalesQuotesController);
saleRouter.post('/quotes', requireAuth, requirePermission('sales.quote.create'), auditAction('SALE_QUOTE_CREATE'), createSalesQuoteController);
saleRouter.post('/quotes/:quoteNumber/convert', requireAuth, requirePermission('sales.order.create'), auditAction('SALE_QUOTE_CONVERT'), convertSalesQuoteController);
saleRouter.get('/orders', requireAuth, requirePermission('sales.order.read'), listSalesOrdersController);
saleRouter.post('/orders', requireAuth, requirePermission('sales.order.create'), auditAction('SALE_ORDER_CREATE'), createSalesOrderController);
saleRouter.get('/orders/:orderNumber/deliveries', requireAuth, requirePermission('sales.delivery.read'), listSalesDeliveriesController);
saleRouter.post('/orders/:orderNumber/deliveries', requireAuth, requirePermission('sales.delivery.create'), auditAction('SALE_DELIVERY'), createSalesDeliveryController);
saleRouter.get('/invoices', requireAuth, requirePermission('sales.invoice.read'), listSalesInvoicesController);
saleRouter.post('/:saleNumber/invoices', requireAuth, requirePermission('sales.invoice.create'), auditAction('SALE_INVOICE'), createSalesInvoiceController);
saleRouter.get('/returns', requireAuth, requirePermission('sales.return.read'), listSaleReturnsController);
saleRouter.get('/:saleNumber/returns', requireAuth, requirePermission('sales.return.read'), listSaleReturnsController);
saleRouter.post('/:saleNumber/returns', requireAuth, requirePermission('sales.return.create'), auditAction('SALE_RETURN'), createSaleReturnController);
saleRouter.get('/:saleNumber/payments', requireAuth, requirePermission('sales.payment.read'), listPaymentsController);
saleRouter.post('/:saleNumber/payments', requireAuth, requirePermission('sales.payment.create'), auditAction('PAYMENT_CREATE'), createPaymentController);
