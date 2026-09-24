import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { InventoryError, applyInventoryMovement, consumeInventoryReservation, createInventoryCount, createInventoryReservation, createWarehouseLocation, getInventory, listInventoryCounts, listInventoryLocationBalances, listInventoryLots, listInventoryMovements, listInventoryReservations, listInventorySerials, listWarehouseLocations, releaseInventoryReservation, transferInventory } from '../services/inventory.service.js';
import { inventoryCountSchema, inventoryMovementSchema, inventoryReservationSchema, inventoryTransferSchema, reservationReleaseSchema, warehouseLocationSchema } from '../validators/inventory.validators.js';

function idempotencyKey(request: Parameters<RequestHandler>[0]) {
  return z.string().trim().min(8).max(120).parse(request.get('idempotency-key'));
}
function sendError(error: unknown, response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) {
    response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
    return;
  }
  if (error instanceof InventoryError) {
    const status = error.code === 'TRANSACTION_REQUIRED' ? 503 : error.code === 'RESERVATION_NOT_FOUND' ? 404 : 409;
    response.status(status).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
    return;
  }
  next(error);
}
function getTenant(request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) {
  if (!request.user?.companyId || !request.user.branchId) {
    response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } });
    return undefined;
  }
  return { companyId: request.user.companyId, branchId: request.user.branchId };
}

export const getInventoryController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await getInventory(productCode, warehouseCode, tenant.companyId, tenant.branchId);
    response.status(200).json({ success: true, message: 'Inventario consultado', data });
  } catch (error) {
    next(error);
  }
};

export const listInventoryMovementsController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await listInventoryMovements(productCode, warehouseCode, tenant.companyId, tenant.branchId);
    response.status(200).json({ success: true, message: 'Movimientos consultados', data });
  } catch (error) {
    next(error);
  }
};

export const listInventoryLotsController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await listInventoryLots(productCode, warehouseCode, tenant.companyId, tenant.branchId);
    response.status(200).json({ success: true, message: 'Lotes con existencia consultados', data });
  } catch (error) { next(error); }
};

export const listInventorySerialsController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await listInventorySerials(productCode, warehouseCode, tenant.companyId, tenant.branchId);
    response.status(200).json({ success: true, message: 'Series disponibles consultados', data });
  } catch (error) { next(error); }
};

export const listInventoryLocationBalancesController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const productCode = String(request.params.productCode).toUpperCase();
    const warehouseCode = String(request.params.warehouseCode).toUpperCase();
    const data = await listInventoryLocationBalances(productCode, warehouseCode, tenant);
    response.status(200).json({ success: true, message: 'Existencias por ubicacion consultadas', data });
  } catch (error) { sendError(error, response, next); }
};

export const applyInventoryMovementController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const input = inventoryMovementSchema.parse(request.body);
    const data = await applyInventoryMovement(input, idempotencyKey(request), request.user!.sub, tenant);
    response.status(201).json({ success: true, message: 'Movimiento aplicado', data });
  } catch (error) { sendError(error, response, next); }
};

export const transferInventoryController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const input = inventoryTransferSchema.parse(request.body);
    const data = await transferInventory(input, idempotencyKey(request), request.user!.sub, tenant);
    response.status(201).json({ success: true, message: 'Transferencia aplicada', data });
  } catch (error) { sendError(error, response, next); }
};

export const createInventoryCountController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const input = inventoryCountSchema.parse(request.body);
    const data = await createInventoryCount(input, idempotencyKey(request), request.user!.sub, tenant);
    response.status(201).json({ success: true, message: 'Conteo aplicado', data });
  } catch (error) { sendError(error, response, next); }
};

export const listInventoryCountsController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const data = await listInventoryCounts(tenant.companyId, tenant.branchId);
    response.status(200).json({ success: true, message: 'Conteos consultados', data });
  } catch (error) { next(error); }
};

export const createInventoryReservationController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const input = inventoryReservationSchema.parse(request.body);
    const data = await createInventoryReservation(input, idempotencyKey(request), request.user!.sub, tenant);
    response.status(201).json({ success: true, message: 'Stock reservado', data });
  } catch (error) { sendError(error, response, next); }
};

export const releaseInventoryReservationController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const reservationNumber = z.string().trim().min(1).max(40).parse(request.params.reservationNumber);
    const { reason } = reservationReleaseSchema.parse(request.body);
    const data = await releaseInventoryReservation(reservationNumber, reason, idempotencyKey(request), request.user!.sub, tenant);
    response.status(200).json({ success: true, message: 'Reserva liberada', data });
  } catch (error) { sendError(error, response, next); }
};

export const consumeInventoryReservationController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const reservationNumber = z.string().trim().min(1).max(40).parse(request.params.reservationNumber);
    const { reason } = reservationReleaseSchema.parse(request.body);
    const data = await consumeInventoryReservation(reservationNumber, reason, idempotencyKey(request), request.user!.sub, tenant);
    response.status(200).json({ success: true, message: 'Reserva consumida', data });
  } catch (error) { sendError(error, response, next); }
};

export const listInventoryReservationsController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const data = await listInventoryReservations(tenant.companyId, tenant.branchId);
    response.status(200).json({ success: true, message: 'Reservas activas consultadas', data });
  } catch (error) { next(error); }
};

export const createWarehouseLocationController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const input = warehouseLocationSchema.parse(request.body);
    const data = await createWarehouseLocation(input, tenant);
    response.status(201).json({ success: true, message: 'Ubicacion creada', data });
  } catch (error) { sendError(error, response, next); }
};

export const listWarehouseLocationsController: RequestHandler = async (request, response, next) => {
  try {
    const tenant = getTenant(request, response); if (!tenant) return;
    const warehouseCode = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()).parse(request.query.warehouseCode);
    const data = await listWarehouseLocations(warehouseCode, tenant);
    response.status(200).json({ success: true, message: 'Ubicaciones consultadas', data });
  } catch (error) { sendError(error, response, next); }
};
