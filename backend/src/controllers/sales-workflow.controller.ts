import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { InventoryError } from '../services/inventory.service.js';
import { SaleError } from '../services/sale.service.js';
import { convertSalesQuote, createSalesInvoice, createSalesOrder, createSalesQuote, deliverSalesOrder, listSalesDeliveries, listSalesInvoices, listSalesOrders, listSalesQuotes } from '../services/sales-workflow.service.js';
import { convertSalesQuoteSchema, createSalesDeliverySchema, createSalesInvoiceSchema, createSalesOrderSchema, createSalesQuoteSchema } from '../validators/sales-workflow.validators.js';

function scope(request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) {
  if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return undefined; }
  return { companyId: request.user.companyId, branchId: request.user.branchId };
}
function handleError(error: unknown, response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) { response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; }
  if (error instanceof SaleError) { response.status(['SALE_NOT_FOUND', 'QUOTE_NOT_FOUND', 'ORDER_NOT_FOUND', 'INVOICE_NOT_FOUND'].includes(error.code) ? 404 : error.code === 'SALE_REFERENCE_INVALID' ? 422 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  if (error instanceof InventoryError) { response.status(error.code === 'TRANSACTION_REQUIRED' ? 503 : error.code === 'INVALID_INVENTORY_REFERENCE' || error.code === 'INVALID_QUANTITY_PRECISION' ? 422 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  next(error);
}
function key(request: Parameters<RequestHandler>[0]) { return z.string().trim().min(8).max(120).parse(request.get('idempotency-key')); }

export const listSalesQuotesController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Cotizaciones consultadas', data: await listSalesQuotes(t) }); } catch (e) { next(e); } };
export const createSalesQuoteController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; const data = await createSalesQuote(createSalesQuoteSchema.parse(req.body), req.user!.sub, t); res.status(201).json({ success: true, message: 'Cotización creada', data }); } catch (e) { handleError(e, res, next); } };
export const convertSalesQuoteController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; const number = z.string().trim().min(1).max(40).parse(req.params.quoteNumber); const data = await convertSalesQuote(convertSalesQuoteSchema.parse(req.body), number, req.user!.sub, t); res.status(201).json({ success: true, message: 'Cotización convertida en pedido', data }); } catch (e) { handleError(e, res, next); } };
export const listSalesOrdersController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Pedidos consultados', data: await listSalesOrders(t) }); } catch (e) { next(e); } };
export const createSalesOrderController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; const data = await createSalesOrder(createSalesOrderSchema.parse(req.body), req.user!.sub, t); res.status(201).json({ success: true, message: 'Pedido creado', data }); } catch (e) { handleError(e, res, next); } };
export const listSalesDeliveriesController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; const number = z.string().trim().min(1).max(40).parse(req.params.orderNumber); res.status(200).json({ success: true, message: 'Entregas consultadas', data: await listSalesDeliveries(number, t) }); } catch (e) { handleError(e, res, next); } };
export const createSalesDeliveryController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; const number = z.string().trim().min(1).max(40).parse(req.params.orderNumber); const data = await deliverSalesOrder(number, createSalesDeliverySchema.parse(req.body), key(req), req.user!.sub, t); res.status(201).json({ success: true, message: 'Entrega y venta registradas', data }); } catch (e) { handleError(e, res, next); } };
export const listSalesInvoicesController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Facturas de venta consultadas', data: await listSalesInvoices(t) }); } catch (e) { next(e); } };
export const createSalesInvoiceController: RequestHandler = async (req, res, next) => { try { const t = scope(req, res); if (!t) return; const number = z.string().trim().min(1).max(40).parse(req.params.saleNumber); const data = await createSalesInvoice(number, createSalesInvoiceSchema.parse(req.body), key(req), req.user!.sub, t); res.status(201).json({ success: true, message: 'Factura de venta emitida', data }); } catch (e) { handleError(e, res, next); } };
