import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { SaleError, createSale, listSales } from '../services/sale.service.js';
import { createSaleSchema } from '../validators/sale.validators.js';

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
    const data = await createSale(input, request.user.sub, request.user.companyId, request.user.branchId);
    response.status(201).json({ success: true, message: 'Venta creada', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof SaleError && error.code === 'SALE_EXISTS') {
      response.status(409).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};
