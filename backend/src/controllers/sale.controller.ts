import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { SaleError, createSale, listSaleReturns, listSales, returnSale } from '../services/sale.service.js';
import { InventoryError } from '../services/inventory.service.js';
import { createSaleReturnSchema, createSaleSchema } from '../validators/sale.validators.js';
import { z } from 'zod';

function handleSaleError(error: unknown, response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) { response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; }
  if (error instanceof SaleError) { response.status(error.code === 'SALE_NOT_FOUND' ? 404 : error.code === 'SALE_REFERENCE_INVALID' ? 422 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  if (error instanceof InventoryError) { const status = error.code === 'TRANSACTION_REQUIRED' ? 503 : error.code === 'INVALID_INVENTORY_REFERENCE' || error.code === 'INVALID_QUANTITY_PRECISION' ? 422 : 409; response.status(status).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  next(error);
}

export const listSalesController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const data = await listSales(request.user.companyId, request.user.branchId);
    response.status(200).json({ success: true, message: 'Ventas consultadas', data });
  } catch (error) {
    next(error);
  }
};

export const createSaleController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const input = createSaleSchema.parse(request.body);
    const key = z.string().trim().min(8).max(120).parse(request.get('idempotency-key'));
    const data = await createSale(input, request.user.sub, { companyId: request.user.companyId, branchId: request.user.branchId }, key);
    response.status(201).json({ success: true, message: 'Venta creada', data });
  } catch (error) {
    handleSaleError(error, response, next);
  }
};

export const listSaleReturnsController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const saleNumber = request.params.saleNumber ? z.string().trim().min(1).max(40).parse(request.params.saleNumber) : undefined;
    const data = await listSaleReturns(saleNumber, { companyId: request.user.companyId, branchId: request.user.branchId });
    response.status(200).json({ success: true, message: 'Devoluciones consultadas', data });
  } catch (error) { handleSaleError(error, response, next); }
};

export const createSaleReturnController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const saleNumber = z.string().trim().min(1).max(40).parse(request.params.saleNumber);
    const input = createSaleReturnSchema.parse(request.body);
    const key = z.string().trim().min(8).max(120).parse(request.get('idempotency-key'));
    const data = await returnSale(saleNumber, input, key, request.user.sub, { companyId: request.user.companyId, branchId: request.user.branchId });
    response.status(201).json({ success: true, message: 'Devolución registrada', data });
  } catch (error) { handleSaleError(error, response, next); }
};
