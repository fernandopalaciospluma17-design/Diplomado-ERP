import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { PurchaseError, createPurchase, listPurchases } from '../services/purchase.service.js';
import { createPurchaseSchema } from '../validators/purchase.validators.js';

export const listPurchasesController: RequestHandler = async (_request, response, next) => {
  try {
    const data = await listPurchases();
    response.status(200).json({ success: true, message: 'Compras consultadas', data });
  } catch (error) {
    next(error);
  }
};

export const createPurchaseController: RequestHandler = async (request, response, next) => {
  try {
    const input = createPurchaseSchema.parse(request.body);
    const data = await createPurchase(input, request.user!.sub);
    response.status(201).json({ success: true, message: 'Compra creada', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof PurchaseError) {
      response.status(409).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};