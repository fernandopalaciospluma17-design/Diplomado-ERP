import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { InventoryError, applyInventoryMovement, getInventory, listInventoryMovements } from '../services/inventory.service.js';
import { inventoryMovementSchema } from '../validators/inventory.validators.js';

export const getInventoryController: RequestHandler = async (request, response, next) => {
  try {
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await getInventory(productCode, warehouseCode);
    response.status(200).json({ success: true, message: 'Inventario consultado', data });
  } catch (error) {
    next(error);
  }
};

export const listInventoryMovementsController: RequestHandler = async (request, response, next) => {
  try {
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await listInventoryMovements(productCode, warehouseCode);
    response.status(200).json({ success: true, message: 'Movimientos consultados', data });
  } catch (error) {
    next(error);
  }
};

export const applyInventoryMovementController: RequestHandler = async (request, response, next) => {
  try {
    const input = inventoryMovementSchema.parse(request.body);
    const data = await applyInventoryMovement(input, request.user!.sub);
    response.status(201).json({ success: true, message: 'Movimiento aplicado', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof InventoryError) {
      response.status(409).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};