import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { SaleError, createPayment, listPayments } from '../services/sale.service.js';
import { createPaymentSchema } from '../validators/payment.validators.js';
import { InventoryError } from '../services/inventory.service.js';

export const listPaymentsController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const data = await listPayments(String(request.params.saleNumber).toUpperCase(), request.user.companyId, request.user.branchId);
    response.status(200).json({ success: true, message: 'Pagos consultados', data });
  } catch (error) {
    next(error);
  }
};

export const createPaymentController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const input = createPaymentSchema.parse(request.body);
    const key = z.string().trim().min(8).max(120).parse(request.get('idempotency-key'));
    const data = await createPayment(String(request.params.saleNumber).toUpperCase(), input, request.user.sub, { companyId: request.user.companyId, branchId: request.user.branchId }, key);
    response.status(201).json({ success: true, message: 'Pago registrado', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof SaleError) {
      response.status(error.code === 'SALE_NOT_FOUND' ? 404 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    if (error instanceof InventoryError) {
      response.status(error.code === 'TRANSACTION_REQUIRED' ? 503 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};
