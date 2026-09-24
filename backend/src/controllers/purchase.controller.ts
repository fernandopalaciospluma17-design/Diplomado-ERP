import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { InventoryError } from '../services/inventory.service.js';
import { PurchaseError, applySupplierCredit, awardSupplierQuote, cancelPurchase, createPurchase, createPurchaseInvoice, createPurchaseRequest, createSupplierQuote, decidePurchase, listPurchaseInvoices, listPurchaseReceipts, listPurchaseRequests, listPurchaseReturns, listPurchases, listSupplierCreditNotes, listSupplierPayments, listSupplierQuotes, paySupplierInvoice, receivePurchase, reconcilePurchases, returnPurchase } from '../services/purchase.service.js';
import { applySupplierCreditSchema, awardSupplierQuoteSchema, cancelPurchaseSchema, createPurchaseInvoiceSchema, createPurchaseRequestSchema, createPurchaseReturnSchema, createPurchaseSchema, createSupplierPaymentSchema, createSupplierQuoteSchema, purchaseDecisionSchema, receivePurchaseSchema } from '../validators/purchase.validators.js';

function tenant(request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) {
  if (!request.user?.companyId || !request.user.branchId) {
    response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } });
    return undefined;
  }
  return { companyId: request.user.companyId, branchId: request.user.branchId };
}
function handleError(error: unknown, response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) { response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; }
  if (error instanceof PurchaseError) {
    const status = error.code === 'PROCUREMENT_TRANSACTION_REQUIRED' ? 503 : error.code === 'PURCHASE_NOT_FOUND' || error.code === 'REQUEST_NOT_FOUND' || error.code === 'QUOTE_NOT_FOUND' || error.code === 'INVOICE_NOT_FOUND' ? 404 : error.code === 'PURCHASE_REFERENCE_INVALID' || error.code === 'QUOTE_INVALID' || error.code === 'PAYMENT_METHOD_INVALID' ? 422 : 409;
    response.status(status).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return;
  }
  if (error instanceof InventoryError) {
    const status = error.code === 'TRANSACTION_REQUIRED' ? 503 : error.code === 'INVALID_INVENTORY_REFERENCE' || error.code === 'INVALID_QUANTITY_PRECISION' ? 422 : 409;
    response.status(status).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return;
  }
  next(error);
}

function idempotencyKey(request: Parameters<RequestHandler>[0]) { return z.string().trim().min(8).max(120).parse(request.get('idempotency-key')); }

export const listPurchaseInvoicesController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const data = await listPurchaseInvoices(scope.companyId, scope.branchId); response.status(200).json({ success: true, message: 'Facturas de proveedor consultadas', data }); }
  catch (error) { next(error); }
};

export const listPayablesController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const data = await listPurchaseInvoices(scope.companyId, scope.branchId, true); response.status(200).json({ success: true, message: 'Cuentas por pagar consultadas', data }); }
  catch (error) { next(error); }
};

export const createPurchaseInvoiceController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const purchaseNumber = z.string().trim().min(1).max(40).parse(request.params.purchaseNumber);
    const input = createPurchaseInvoiceSchema.parse(request.body);
    const data = await createPurchaseInvoice(purchaseNumber, input, idempotencyKey(request), request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Factura de proveedor registrada', data });
  } catch (error) { handleError(error, response, next); }
};

export const listSupplierPaymentsController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const invoiceNumber = z.string().trim().min(1).max(40).parse(request.params.invoiceNumber);
    const data = await listSupplierPayments(invoiceNumber, scope);
    response.status(200).json({ success: true, message: 'Pagos a proveedor consultados', data });
  } catch (error) { handleError(error, response, next); }
};

export const paySupplierInvoiceController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const invoiceNumber = z.string().trim().min(1).max(40).parse(request.params.invoiceNumber);
    const input = createSupplierPaymentSchema.parse(request.body);
    const data = await paySupplierInvoice(invoiceNumber, input, idempotencyKey(request), request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Pago a proveedor registrado', data });
  } catch (error) { handleError(error, response, next); }
};

export const listPurchaseRequestsController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const data = await listPurchaseRequests(scope.companyId, scope.branchId);
    response.status(200).json({ success: true, message: 'Solicitudes de compra consultadas', data });
  } catch (error) { next(error); }
};

export const createPurchaseRequestController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const input = createPurchaseRequestSchema.parse(request.body);
    const data = await createPurchaseRequest(input, request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Solicitud de compra creada', data });
  } catch (error) { handleError(error, response, next); }
};

export const listSupplierQuotesController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const requestNumber = z.string().trim().min(1).max(40).parse(request.params.requestNumber);
    const data = await listSupplierQuotes(requestNumber, scope);
    response.status(200).json({ success: true, message: 'Cotizaciones consultadas', data });
  } catch (error) { handleError(error, response, next); }
};

export const createSupplierQuoteController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const requestNumber = z.string().trim().min(1).max(40).parse(request.params.requestNumber);
    const input = createSupplierQuoteSchema.parse(request.body);
    const data = await createSupplierQuote(requestNumber, input, request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Cotizacion de proveedor registrada', data });
  } catch (error) { handleError(error, response, next); }
};

export const awardSupplierQuoteController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const requestNumber = z.string().trim().min(1).max(40).parse(request.params.requestNumber);
    const input = awardSupplierQuoteSchema.parse(request.body);
    const data = await awardSupplierQuote(requestNumber, input, request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Cotizacion adjudicada y orden creada', data });
  } catch (error) { handleError(error, response, next); }
};

export const listPurchasesController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const data = await listPurchases(scope.companyId, scope.branchId);
    response.status(200).json({ success: true, message: 'Compras consultadas', data });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const input = createPurchaseSchema.parse(request.body);
    const data = await createPurchase(input, request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Compra creada', data });
  } catch (error) { handleError(error, response, next); }
};

export const decidePurchaseController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const purchaseNumber = z.string().trim().min(1).max(40).parse(request.params.purchaseNumber);
    const input = purchaseDecisionSchema.parse(request.body);
    const data = await decidePurchase(purchaseNumber, input, request.user!.sub, scope);
    response.status(200).json({ success: true, message: input.decision === 'APPROVE' ? 'Orden aprobada' : 'Orden rechazada', data });
  } catch (error) { handleError(error, response, next); }
};

export const listPurchaseReturnsController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const purchaseNumber = request.params.purchaseNumber ? z.string().trim().min(1).max(40).parse(request.params.purchaseNumber) : undefined; const data = await listPurchaseReturns(scope, purchaseNumber); response.status(200).json({ success: true, message: 'Devoluciones consultadas', data }); }
  catch (error) { handleError(error, response, next); }
};

export const createPurchaseReturnController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const purchaseNumber = z.string().trim().min(1).max(40).parse(request.params.purchaseNumber); const input = createPurchaseReturnSchema.parse(request.body); const data = await returnPurchase(purchaseNumber, input, idempotencyKey(request), request.user!.sub, scope); response.status(201).json({ success: true, message: 'Devolución y nota de crédito registradas', data }); }
  catch (error) { handleError(error, response, next); }
};

export const listSupplierCreditNotesController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const data = await listSupplierCreditNotes(scope); response.status(200).json({ success: true, message: 'Notas de crédito consultadas', data }); }
  catch (error) { handleError(error, response, next); }
};

export const applySupplierCreditController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const creditNoteNumber = z.string().trim().min(1).max(40).parse(request.params.creditNoteNumber); const invoiceNumber = z.string().trim().min(1).max(40).parse(request.params.invoiceNumber); const input = applySupplierCreditSchema.parse(request.body); const data = await applySupplierCredit(creditNoteNumber, invoiceNumber, input, idempotencyKey(request), request.user!.sub, scope); response.status(200).json({ success: true, message: 'Nota de crédito aplicada', data }); }
  catch (error) { handleError(error, response, next); }
};

export const reconcilePurchasesController: RequestHandler = async (request, response, next) => {
  try { const scope = tenant(request, response); if (!scope) return; const data = await reconcilePurchases(scope); response.status(200).json({ success: true, message: 'Conciliación de compras completada', data }); }
  catch (error) { next(error); }
};

export const receivePurchaseController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const purchaseNumber = z.string().trim().min(1).max(40).parse(request.params.purchaseNumber);
    const input = receivePurchaseSchema.parse(request.body);
    const key = z.string().trim().min(8).max(120).parse(request.get('idempotency-key'));
    const data = await receivePurchase(purchaseNumber, input, key, request.user!.sub, scope);
    response.status(201).json({ success: true, message: 'Recepcion de compra aplicada', data });
  } catch (error) { handleError(error, response, next); }
};

export const listPurchaseReceiptsController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const purchaseNumber = z.string().trim().min(1).max(40).parse(request.params.purchaseNumber);
    const data = await listPurchaseReceipts(purchaseNumber, scope.companyId, scope.branchId);
    response.status(200).json({ success: true, message: 'Recepciones consultadas', data });
  } catch (error) { handleError(error, response, next); }
};

export const cancelPurchaseController: RequestHandler = async (request, response, next) => {
  try {
    const scope = tenant(request, response); if (!scope) return;
    const purchaseNumber = z.string().trim().min(1).max(40).parse(request.params.purchaseNumber);
    const { reason } = cancelPurchaseSchema.parse(request.body);
    const data = await cancelPurchase(purchaseNumber, reason, scope);
    response.status(200).json({ success: true, message: 'Compra cancelada', data });
  } catch (error) { handleError(error, response, next); }
};
