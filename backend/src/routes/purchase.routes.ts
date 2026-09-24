import { Router } from 'express';
import { applySupplierCreditController, awardSupplierQuoteController, cancelPurchaseController, createPurchaseController, createPurchaseInvoiceController, createPurchaseRequestController, createPurchaseReturnController, createSupplierQuoteController, decidePurchaseController, listPayablesController, listPurchaseInvoicesController, listPurchaseReceiptsController, listPurchaseRequestsController, listPurchaseReturnsController, listPurchasesController, listSupplierCreditNotesController, listSupplierPaymentsController, listSupplierQuotesController, paySupplierInvoiceController, receivePurchaseController, reconcilePurchasesController } from '../controllers/purchase.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const purchaseRouter = Router();

purchaseRouter.get('/requests', requireAuth, requirePermission('purchases.request.read'), listPurchaseRequestsController);
purchaseRouter.post('/requests', requireAuth, requirePermission('purchases.request.create'), auditAction('PURCHASE_REQUEST_CREATE'), createPurchaseRequestController);
purchaseRouter.get('/requests/:requestNumber/quotes', requireAuth, requirePermission('purchases.quote.read'), listSupplierQuotesController);
purchaseRouter.post('/requests/:requestNumber/quotes', requireAuth, requirePermission('purchases.quote.create'), auditAction('SUPPLIER_QUOTE_CREATE'), createSupplierQuoteController);
purchaseRouter.post('/requests/:requestNumber/award', requireAuth, requirePermission('purchases.quote.approve'), auditAction('SUPPLIER_QUOTE_AWARD'), awardSupplierQuoteController);
purchaseRouter.get('/invoices', requireAuth, requirePermission('purchases.invoice.read'), listPurchaseInvoicesController);
purchaseRouter.get('/returns', requireAuth, requirePermission('purchases.return.read'), listPurchaseReturnsController);
purchaseRouter.get('/credit-notes', requireAuth, requirePermission('purchases.credit.read'), listSupplierCreditNotesController);
purchaseRouter.post('/credit-notes/:creditNoteNumber/invoices/:invoiceNumber/applications', requireAuth, requirePermission('purchases.credit.approve'), auditAction('SUPPLIER_CREDIT_APPLY'), applySupplierCreditController);
purchaseRouter.get('/reconciliation', requireAuth, requirePermission('purchases.reconciliation.read'), reconcilePurchasesController);
purchaseRouter.get('/payables', requireAuth, requirePermission('purchases.payable.read'), listPayablesController);
purchaseRouter.get('/invoices/:invoiceNumber/payments', requireAuth, requirePermission('purchases.payment.read'), listSupplierPaymentsController);
purchaseRouter.post('/invoices/:invoiceNumber/payments', requireAuth, requirePermission('purchases.payment.create'), auditAction('SUPPLIER_PAYMENT'), paySupplierInvoiceController);
purchaseRouter.get('/', requireAuth, requirePermission('purchases.purchase.read'), listPurchasesController);
purchaseRouter.post('/', requireAuth, requirePermission('purchases.purchase.create'), auditAction('PURCHASE_CREATE'), createPurchaseController);
purchaseRouter.post('/:purchaseNumber/decision', requireAuth, requirePermission('purchases.purchase.approve'), auditAction('PURCHASE_DECISION'), decidePurchaseController);
purchaseRouter.post('/:purchaseNumber/returns', requireAuth, requirePermission('purchases.return.create'), auditAction('PURCHASE_RETURN'), createPurchaseReturnController);
purchaseRouter.get('/:purchaseNumber/returns', requireAuth, requirePermission('purchases.return.read'), listPurchaseReturnsController);
purchaseRouter.get('/:purchaseNumber/receipts', requireAuth, requirePermission('purchases.receipt.read'), listPurchaseReceiptsController);
purchaseRouter.post('/:purchaseNumber/receipts', requireAuth, requirePermission('purchases.receipt.create'), auditAction('PURCHASE_RECEIPT'), receivePurchaseController);
purchaseRouter.post('/:purchaseNumber/invoices', requireAuth, requirePermission('purchases.invoice.create'), auditAction('PURCHASE_INVOICE'), createPurchaseInvoiceController);
purchaseRouter.post('/:purchaseNumber/cancel', requireAuth, requirePermission('purchases.purchase.cancel'), auditAction('PURCHASE_CANCEL'), cancelPurchaseController);
