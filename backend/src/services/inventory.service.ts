import { createHash } from 'node:crypto';
import mongoose, { Types, type ClientSession } from 'mongoose';
import { CatalogModel } from '../models/catalog.model.js';
import { getMasterDataModel } from '../models/master-data.model.js';
import { InventoryBalanceModel, InventoryCountModel, InventoryLocationBalanceModel, InventoryLotBalanceModel, InventoryMovementModel, InventoryOperationModel, InventoryReservationModel, InventorySerialModel, InventoryTransferModel, WarehouseLocationModel } from '../models/inventory.model.js';
import type { InventoryCountInput, InventoryMovementInput, InventoryReservationInput, InventoryTransferInput, WarehouseLocationInput } from '../validators/inventory.validators.js';

export class InventoryError extends Error {
  constructor(public readonly code: 'INSUFFICIENT_STOCK' | 'INVENTORY_NOT_FOUND' | 'TRANSACTION_REQUIRED' | 'IDEMPOTENCY_CONFLICT' | 'INVALID_INVENTORY_REFERENCE' | 'INVALID_QUANTITY_PRECISION' | 'NON_STOCK_PRODUCT' | 'RESERVED_STOCK_CONFLICT' | 'TRANSFER_EXISTS' | 'COUNT_EXISTS' | 'RESERVATION_EXISTS' | 'RESERVATION_NOT_FOUND' | 'RESERVATION_NOT_ACTIVE' | 'RECEIPT_EXISTS' | 'LOT_REQUIRED' | 'SERIALS_REQUIRED' | 'TRACEABILITY_UNSUPPORTED' | 'LOT_STOCK_INSUFFICIENT' | 'SERIAL_INVALID' | 'LOT_EXPIRY_CONFLICT' | 'COUNT_TRACE_MISMATCH' | 'LOCATION_EXISTS') {
    const messages: Record<InventoryError['code'], string> = {
      INSUFFICIENT_STOCK: 'Stock disponible insuficiente', INVENTORY_NOT_FOUND: 'Inventario no encontrado',
      TRANSACTION_REQUIRED: 'MongoDB debe operar como replica set para registrar inventario de forma atomica',
      IDEMPOTENCY_CONFLICT: 'La clave de idempotencia ya se uso con otra operacion', INVALID_INVENTORY_REFERENCE: 'Producto o almacen inexistente o inactivo',
      INVALID_QUANTITY_PRECISION: 'La cantidad excede los decimales permitidos por la unidad', NON_STOCK_PRODUCT: 'El producto no controla inventario', RESERVED_STOCK_CONFLICT: 'La cantidad disponible esta comprometida por reservas',
      TRANSFER_EXISTS: 'El numero de transferencia ya fue registrado', COUNT_EXISTS: 'El numero de conteo ya fue registrado',
      RESERVATION_EXISTS: 'El numero de reserva ya fue registrado', RESERVATION_NOT_FOUND: 'Reserva no encontrada', RESERVATION_NOT_ACTIVE: 'La reserva no esta activa', RECEIPT_EXISTS: 'El numero de recepcion ya fue registrado',
      LOT_REQUIRED: 'Este producto requiere lote para modificar inventario', SERIALS_REQUIRED: 'Este producto requiere numeros de serie para modificar inventario', TRACEABILITY_UNSUPPORTED: 'La operacion no admite el nivel de trazabilidad configurado',
      LOT_STOCK_INSUFFICIENT: 'Existencia insuficiente para el lote indicado', SERIAL_INVALID: 'Uno o mas numeros de serie no corresponden a la existencia indicada', LOT_EXPIRY_CONFLICT: 'El lote ya existe con otra fecha de caducidad', COUNT_TRACE_MISMATCH: 'El conteo debe incluir todos los lotes o series existentes y respetar las reservas', LOCATION_EXISTS: 'El codigo de ubicacion ya existe en este almacen'
    };
    super(messages[code]);
  }
}

type Tenant = { companyId: string; branchId: string };
export type OperationType = 'MOVEMENT' | 'TRANSFER' | 'CYCLE_COUNT' | 'RESERVE' | 'RELEASE_RESERVATION' | 'CONSUME_RESERVATION' | 'PURCHASE_RECEIPT' | 'PURCHASE_INVOICE' | 'SUPPLIER_PAYMENT' | 'PURCHASE_RETURN' | 'APPLY_SUPPLIER_CREDIT' | 'SALE' | 'SALE_PAYMENT' | 'SALE_RETURN' | 'SALE_DELIVERY' | 'SALE_INVOICE' | 'ACCOUNTING_POST' | 'POS_TICKET';
type MovementStep = { productCode: string; warehouseCode: string; locationCode?: string; locationTargetQuantity?: number; type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'COUNT'; quantity: number; traceQuantity?: number; reason: string; reference?: string; allowNegativeStock?: boolean; lotCode?: string; expiresAt?: Date; serialNumbers?: string[]; trackLots?: boolean; trackSerials?: boolean };

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'undefined';
}
function hash(value: unknown) { return createHash('sha256').update(canonical(value)).digest('hex'); }
function balanceKey(tenant: Tenant, productCode: string, warehouseCode: string) { return { ...tenant, productCode, warehouseCode }; }
function toBalance(balance: { productCode: string; warehouseCode: string; quantity: number; reservedQuantity?: number }) {
  const reservedQuantity = balance.reservedQuantity ?? 0;
  return { productCode: balance.productCode, warehouseCode: balance.warehouseCode, quantity: balance.quantity, reservedQuantity, availableQuantity: Math.max(0, balance.quantity - reservedQuantity) };
}

export async function runIdempotent<T>(type: OperationType, key: string, payload: unknown, createdBy: string, tenant: Tenant, work: (session: ClientSession, operationId: Types.ObjectId) => Promise<T>): Promise<T> {
  const requestHash = hash({ type, payload, createdBy });
  const scope = { ...tenant, idempotencyKey: key };
  const session = await mongoose.startSession();
  let result: T | undefined;
  try {
    await session.withTransaction(async () => {
      const prior = await InventoryOperationModel.findOne(scope).session(session);
      if (prior) {
        if (prior.requestHash !== requestHash) throw new InventoryError('IDEMPOTENCY_CONFLICT');
        result = prior.result as T;
        return;
      }
      const [operation] = await InventoryOperationModel.create([{ ...scope, requestHash, type, result: {}, createdBy }], { session });
      if (!operation) throw new Error('No se pudo iniciar la operacion de inventario');
      result = await work(session, operation._id);
      operation.result = result as Record<string, unknown>;
      await operation.save({ session });
    });
  } catch (error) {
    if ((error as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support transactions/i.test((error as Error).message ?? '')) throw new InventoryError('TRANSACTION_REQUIRED');
    if ((error as { code?: number }).code === 11000) {
      const prior = await InventoryOperationModel.findOne(scope);
      if (prior) {
        if (prior.requestHash !== requestHash) throw new InventoryError('IDEMPOTENCY_CONFLICT');
        return prior.result as T;
      }
      if (type === 'TRANSFER') throw new InventoryError('TRANSFER_EXISTS');
      if (type === 'CYCLE_COUNT') throw new InventoryError('COUNT_EXISTS');
      if (type === 'RESERVE') throw new InventoryError('RESERVATION_EXISTS');
      if (type === 'PURCHASE_RECEIPT') throw new InventoryError('RECEIPT_EXISTS');
    }
    throw error;
  } finally {
    await session.endSession();
  }
  return result as T;
}

async function assertProduct(tenant: Tenant, productCode: string, session?: ClientSession) {
  const typed = await getMasterDataModel('products').findOne({ companyId: tenant.companyId, code: productCode, status: 'ACTIVE' }).session(session ?? null).lean();
  const legacy = typed ? null : await CatalogModel.findOne({ companyId: tenant.companyId, branchId: tenant.branchId, kind: 'PRODUCT', code: productCode, status: 'ACTIVE' }).session(session ?? null).lean();
  if (!typed && !legacy) throw new InventoryError('INVALID_INVENTORY_REFERENCE');
  let decimalPlaces = 3;
  const unitId = typed?.attributes?.unitId;
  if (unitId) {
    const unit = await getMasterDataModel('units').findOne({ companyId: tenant.companyId, _id: String(unitId), status: 'ACTIVE' }).session(session ?? null).lean();
    if (!unit) throw new InventoryError('INVALID_INVENTORY_REFERENCE');
    const places = Number(unit.attributes?.decimalPlaces ?? 0);
    decimalPlaces = Number.isInteger(places) && places >= 0 && places <= 6 ? places : 0;
  }
  if (typed?.attributes?.trackInventory === false) throw new InventoryError('NON_STOCK_PRODUCT');
  return { decimalPlaces, trackLots: Boolean(typed?.attributes?.trackLots), trackSerials: Boolean(typed?.attributes?.trackSerials) };
}

async function assertWarehouse(tenant: Tenant, warehouseCode: string, session?: ClientSession) {
  const typed = await getMasterDataModel('warehouses').findOne({ companyId: tenant.companyId, branchId: tenant.branchId, code: warehouseCode, status: 'ACTIVE' }).session(session ?? null).lean();
  const legacy = typed ? null : await CatalogModel.findOne({ companyId: tenant.companyId, branchId: tenant.branchId, kind: 'WAREHOUSE', code: warehouseCode, status: 'ACTIVE' }).session(session ?? null).lean();
  if (!typed && !legacy) throw new InventoryError('INVALID_INVENTORY_REFERENCE');
  return Boolean(typed?.attributes?.allowNegativeStock ?? legacy?.metadata?.allowNegativeStock === 'true');
}

async function assertLocation(tenant: Tenant, warehouseCode: string, locationCode: string, session?: ClientSession) {
  const location = await WarehouseLocationModel.exists({ ...tenant, warehouseCode, code: locationCode, status: 'ACTIVE' }).session(session ?? null);
  if (!location) throw new InventoryError('INVALID_INVENTORY_REFERENCE');
}

async function validateItem(tenant: Tenant, productCode: string, warehouseCode: string, quantity: number, session: ClientSession) {
  const productTracking = await assertProduct(tenant, productCode, session);
  const allowNegativeStock = await assertWarehouse(tenant, warehouseCode, session);
  const rounded = Number(quantity.toFixed(productTracking.decimalPlaces));
  if (Math.abs(rounded - quantity) > 1e-9) throw new InventoryError('INVALID_QUANTITY_PRECISION');
  return { quantity: rounded, allowNegativeStock, ...productTracking };
}

async function applyTraceability(step: MovementStep, tenant: Tenant, session: ClientSession) {
  const inbound = step.type === 'IN' || step.type === 'TRANSFER_IN';
  const outbound = step.type === 'OUT' || step.type === 'TRANSFER_OUT';
  if (step.trackLots) {
    if (!step.lotCode) throw new InventoryError('LOT_REQUIRED');
    if (!inbound && !outbound && step.type !== 'ADJUSTMENT') throw new InventoryError('TRACEABILITY_UNSUPPORTED');
    let lot = await InventoryLotBalanceModel.findOne({ ...balanceKey(tenant, step.productCode, step.warehouseCode), lotCode: step.lotCode }).session(session);
    if (lot && step.expiresAt && lot.expiresAt && lot.expiresAt.getTime() !== step.expiresAt.getTime()) throw new InventoryError('LOT_EXPIRY_CONFLICT');
    if (step.type === 'ADJUSTMENT') {
      if (!lot) {
        const [createdLot] = await InventoryLotBalanceModel.create([{ ...balanceKey(tenant, step.productCode, step.warehouseCode), lotCode: step.lotCode, expiresAt: step.expiresAt, quantity: 0, reservedQuantity: 0 }], { session });
        lot = createdLot ?? null;
      }
      if (!lot) throw new Error('No se pudo crear el lote del ajuste');
      const target = step.traceQuantity ?? step.quantity;
      if (target + 1e-9 < (lot.reservedQuantity ?? 0)) throw new InventoryError('RESERVED_STOCK_CONFLICT');
      if (step.expiresAt && !lot.expiresAt) lot.expiresAt = step.expiresAt;
      lot.quantity = target; await lot.save({ session });
    } else if (inbound) {
      if (!lot) {
        const [createdLot] = await InventoryLotBalanceModel.create([{ ...balanceKey(tenant, step.productCode, step.warehouseCode), lotCode: step.lotCode, expiresAt: step.expiresAt, quantity: 0, reservedQuantity: 0 }], { session });
        lot = createdLot ?? null;
      }
      if (!lot) throw new Error('No se pudo crear el lote');
      if (step.expiresAt && !lot.expiresAt) lot.expiresAt = step.expiresAt;
      lot.quantity = Number((lot.quantity + step.quantity).toFixed(6));
      await lot.save({ session });
    } else {
      if (!lot || lot.quantity - (lot.reservedQuantity ?? 0) + 1e-9 < step.quantity) throw new InventoryError('LOT_STOCK_INSUFFICIENT');
      lot.quantity = Number((lot.quantity - step.quantity).toFixed(6));
      await lot.save({ session });
    }
  } else if (step.lotCode || step.expiresAt) throw new InventoryError('TRACEABILITY_UNSUPPORTED');

  if (step.trackSerials) {
    const serialNumbers = step.serialNumbers ?? [];
    const serialTarget = step.type === 'ADJUSTMENT' && step.trackLots ? step.traceQuantity ?? step.quantity : step.quantity;
    if (!inbound && !outbound && step.type !== 'ADJUSTMENT') throw new InventoryError('TRACEABILITY_UNSUPPORTED');
    if ((inbound || outbound || step.type === 'ADJUSTMENT' && serialTarget > 0) && !step.serialNumbers) throw new InventoryError('SERIALS_REQUIRED');
    if (!Number.isInteger(serialTarget) || serialTarget !== serialNumbers.length) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
    if (step.type === 'ADJUSTMENT') {
      const active = await InventorySerialModel.find({ ...tenant, productCode: step.productCode, warehouseCode: step.warehouseCode, status: { $in: ['IN', 'RESERVED'] }, ...(step.trackLots ? { lotCode: step.lotCode } : {}) }).session(session);
      const requested = new Set(serialNumbers);
      for (const serial of active) {
        if (requested.has(serial.serialNumber)) continue;
        if (serial.status === 'RESERVED') throw new InventoryError('RESERVED_STOCK_CONFLICT');
        serial.status = 'OUT'; await serial.save({ session });
      }
    }
    for (const serialNumber of serialNumbers) {
      const filter = { ...balanceKey(tenant, step.productCode, step.warehouseCode), serialNumber };
      const serial = await InventorySerialModel.findOne({ companyId: tenant.companyId, branchId: tenant.branchId, productCode: step.productCode, serialNumber }).session(session);
      if (inbound || step.type === 'ADJUSTMENT') {
        if (serial?.status === 'RESERVED') {
          if (step.type !== 'ADJUSTMENT' || serial.warehouseCode !== step.warehouseCode || !serial.reservationNumber || step.trackLots && serial.lotCode !== step.lotCode) throw new InventoryError('RESERVED_STOCK_CONFLICT');
          continue;
        }
        if (serial?.status === 'IN' && step.type !== 'ADJUSTMENT') throw new InventoryError('SERIAL_INVALID');
        if (serial?.status === 'IN' && serial.warehouseCode !== step.warehouseCode) throw new InventoryError('SERIAL_INVALID');
        if (serial) {
          if (step.trackLots && serial.lotCode !== step.lotCode) throw new InventoryError('SERIAL_INVALID');
          serial.warehouseCode = step.warehouseCode; serial.status = 'IN'; serial.reservationNumber = undefined; await serial.save({ session });
        }
        else {
          try { await InventorySerialModel.create([{ ...filter, status: 'IN', lotCode: step.lotCode }], { session }); }
          catch (error) { if ((error as { code?: number }).code === 11000) throw new InventoryError('SERIAL_INVALID'); throw error; }
        }
      } else {
        if (!serial || serial.status !== 'IN' || serial.warehouseCode !== step.warehouseCode || step.trackLots && serial.lotCode !== step.lotCode) throw new InventoryError('SERIAL_INVALID');
        serial.status = 'OUT'; await serial.save({ session });
      }
    }
  } else if (step.serialNumbers?.length) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
}

async function applyStep(step: MovementStep, tenant: Tenant, actorId: string, operationId: Types.ObjectId, sequence: number, session: ClientSession) {
  let locationBefore: number | undefined;
  if (step.locationCode) {
    await assertLocation(tenant, step.warehouseCode, step.locationCode, session);
    if (step.trackLots || step.trackSerials) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
    const slot = await InventoryLocationBalanceModel.findOne({ ...balanceKey(tenant, step.productCode, step.warehouseCode), locationCode: step.locationCode }).session(session);
    locationBefore = slot?.quantity ?? 0;
  }
  const key = balanceKey(tenant, step.productCode, step.warehouseCode);
  await InventoryBalanceModel.findOneAndUpdate(key, { $setOnInsert: { ...key, quantity: 0, reservedQuantity: 0, revision: 0 } }, { upsert: true, new: true, session, setDefaultsOnInsert: true });
  const before = await InventoryBalanceModel.findOne(key).session(session);
  if (!before) throw new InventoryError('INVENTORY_NOT_FOUND');
  const previousQuantity = before.quantity;
  const reservedQuantity = before.reservedQuantity ?? 0;
  const locatedBalances = await InventoryLocationBalanceModel.find(key).session(session);
  const locatedQuantity = locatedBalances.reduce((sum, item) => sum + item.quantity, 0);
  const locatedReserved = locatedBalances.reduce((sum, item) => sum + item.reservedQuantity, 0);
  const targetQuantity = step.type === 'ADJUSTMENT' || step.type === 'COUNT'
    ? step.locationCode ? Number((previousQuantity + step.quantity - (locationBefore ?? 0)).toFixed(6)) : step.quantity
    : undefined;
  const actualQuantity = targetQuantity === undefined ? step.quantity : Math.abs(targetQuantity - previousQuantity);
  let resultingQuantity = targetQuantity ?? (step.type === 'IN' || step.type === 'TRANSFER_IN' ? previousQuantity + step.quantity : previousQuantity - step.quantity);
  resultingQuantity = Number(resultingQuantity.toFixed(6));
  if (resultingQuantity < -1e-9 && !step.allowNegativeStock) throw new InventoryError('INSUFFICIENT_STOCK');
  if ((step.type === 'OUT' || step.type === 'TRANSFER_OUT') && !step.allowNegativeStock && step.quantity > previousQuantity - reservedQuantity + 1e-9) throw new InventoryError('INSUFFICIENT_STOCK');
  if ((step.type === 'OUT' || step.type === 'TRANSFER_OUT') && resultingQuantity < reservedQuantity - 1e-9) throw new InventoryError('RESERVED_STOCK_CONFLICT');
  if ((step.type === 'ADJUSTMENT' || step.type === 'COUNT') && targetQuantity! < reservedQuantity - 1e-9) throw new InventoryError('RESERVED_STOCK_CONFLICT');
  if (!step.locationCode && (step.type === 'OUT' || step.type === 'TRANSFER_OUT') && step.quantity > previousQuantity - locatedQuantity - Math.max(0, reservedQuantity - locatedReserved) + 1e-9) throw new InventoryError('INSUFFICIENT_STOCK');
  if (!step.locationCode && (step.type === 'ADJUSTMENT' || step.type === 'COUNT') && targetQuantity! < locatedQuantity - 1e-9) throw new InventoryError('RESERVED_STOCK_CONFLICT');
  await applyTraceability(step, tenant, session);
  if (step.locationCode) {
    const locationKey = { ...key, locationCode: step.locationCode };
    await InventoryLocationBalanceModel.findOneAndUpdate(locationKey, { $setOnInsert: { ...locationKey, quantity: 0, reservedQuantity: 0 } }, { upsert: true, new: true, session, setDefaultsOnInsert: true });
    const locationBalance = await InventoryLocationBalanceModel.findOne(locationKey).session(session);
    if (!locationBalance) throw new InventoryError('INVENTORY_NOT_FOUND');
    const locationReserved = locationBalance.reservedQuantity ?? 0;
    const locationTarget = step.locationTargetQuantity ?? (step.type === 'ADJUSTMENT' || step.type === 'COUNT' ? step.quantity : undefined);
    const locationResult = Number((locationTarget ?? (step.type === 'IN' || step.type === 'TRANSFER_IN' ? locationBalance.quantity + step.quantity : locationBalance.quantity - step.quantity)).toFixed(6));
    if (locationResult < -1e-9 || locationResult < locationReserved - 1e-9) throw new InventoryError('INSUFFICIENT_STOCK');
    locationBalance.quantity = locationResult;
    await locationBalance.save({ session });
  }
  const after = await InventoryBalanceModel.findOneAndUpdate(key, { $set: { quantity: resultingQuantity, reservedQuantity, revision: (before.revision ?? 0) + 1 }, $setOnInsert: { ...key } }, { new: true, session, runValidators: true });
  if (!after) throw new InventoryError('INVENTORY_NOT_FOUND');
  const [movement] = await InventoryMovementModel.create([{
    ...key, type: step.type, quantity: actualQuantity, targetQuantity, locationTargetQuantity: step.locationTargetQuantity ?? (step.locationCode && (step.type === 'ADJUSTMENT' || step.type === 'COUNT') ? step.quantity : undefined), traceTargetQuantity: step.traceQuantity, previousQuantity, resultingQuantity: after.quantity,
    reason: step.reason, reference: step.reference, locationCode: step.locationCode, lotCode: step.lotCode, expiresAt: step.expiresAt, serialNumbers: step.serialNumbers, createdBy: actorId, operationId, sequence
  }], { session });
  if (!movement) throw new Error('No se pudo guardar el movimiento de inventario');
  return { balance: toBalance(after), movement: movement.toObject() };
}

export async function applyPurchaseReceiptMovement(input: { productCode: string; warehouseCode: string; locationCode?: string; quantity: number; receiptNumber: string; lotCode?: string; expiresAt?: Date; serialNumbers?: string[] }, tenant: Tenant, actorId: string, operationId: Types.ObjectId, sequence: number, session: ClientSession) {
  const validated = await validateItem(tenant, input.productCode, input.warehouseCode, input.quantity, session);
  return applyStep({ ...input, ...validated, type: 'IN', reason: 'Recepcion de compra', reference: input.receiptNumber }, tenant, actorId, operationId, sequence, session);
}

export async function applySaleMovement(input: { productCode: string; warehouseCode: string; quantity: number; saleNumber: string; lotCode?: string; serialNumbers?: string[] }, tenant: Tenant, actorId: string, operationId: Types.ObjectId, sequence: number, session: ClientSession) {
  await assertWarehouse(tenant, input.warehouseCode, session);
  let validated;
  try { validated = await validateItem(tenant, input.productCode, input.warehouseCode, input.quantity, session); }
  catch (error) { if (error instanceof InventoryError && error.code === 'NON_STOCK_PRODUCT') return null; throw error; }
  return applyStep({ ...input, ...validated, type: 'OUT', reason: 'Venta', reference: input.saleNumber }, tenant, actorId, operationId, sequence, session);
}

export async function applySaleReturnMovement(input: { productCode: string; warehouseCode: string; quantity: number; returnNumber: string; lotCode?: string; serialNumbers?: string[] }, tenant: Tenant, actorId: string, operationId: Types.ObjectId, sequence: number, session: ClientSession) {
  await assertWarehouse(tenant, input.warehouseCode, session);
  let validated;
  try { validated = await validateItem(tenant, input.productCode, input.warehouseCode, input.quantity, session); }
  catch (error) { if (error instanceof InventoryError && error.code === 'NON_STOCK_PRODUCT') return null; throw error; }
  return applyStep({ ...input, ...validated, type: 'IN', reason: 'Devolucion de venta', reference: input.returnNumber }, tenant, actorId, operationId, sequence, session);
}

export async function applyPurchaseReturnMovement(input: { productCode: string; warehouseCode: string; locationCode?: string; quantity: number; returnNumber: string; lotCode?: string; serialNumbers?: string[] }, tenant: Tenant, actorId: string, operationId: Types.ObjectId, sequence: number, session: ClientSession) {
  const validated = await validateItem(tenant, input.productCode, input.warehouseCode, input.quantity, session);
  return applyStep({ ...input, ...validated, type: 'OUT', reason: 'Devolucion a proveedor', reference: input.returnNumber }, tenant, actorId, operationId, sequence, session);
}

export async function getInventory(productCode: string, warehouseCode: string, companyId: string, branchId: string) {
  const [balance, product] = await Promise.all([
    InventoryBalanceModel.findOne({ companyId, branchId, productCode, warehouseCode }),
    getMasterDataModel('products').findOne({ companyId, code: productCode, status: 'ACTIVE' }).select('attributes').lean()
  ]);
  const stock = balance ? toBalance(balance) : { productCode, warehouseCode, quantity: 0, reservedQuantity: 0, availableQuantity: 0 };
  const minStock = Number(product?.attributes?.minStock ?? 0);
  const maxStock = product?.attributes?.maxStock === undefined ? undefined : Number(product.attributes.maxStock);
  const reorderPoint = Number(product?.attributes?.reorderPoint ?? 0);
  return { ...stock, thresholds: { minStock, maxStock, reorderPoint }, belowMinimum: minStock > 0 && stock.quantity <= minStock, reorderRecommended: reorderPoint > 0 && stock.quantity <= reorderPoint, suggestedReplenishment: maxStock !== undefined && stock.quantity < maxStock ? maxStock - stock.quantity : 0 };
}

export async function listInventoryMovements(productCode: string, warehouseCode: string, companyId: string, branchId: string) {
  return InventoryMovementModel.find({ companyId, branchId, productCode, warehouseCode }).sort({ createdAt: -1 }).limit(100);
}

export async function listInventoryLots(productCode: string, warehouseCode: string, companyId: string, branchId: string) {
  return InventoryLotBalanceModel.find({ companyId, branchId, productCode, warehouseCode, quantity: { $gt: 0 } }).sort({ expiresAt: 1, lotCode: 1 }).limit(500);
}

export async function listInventorySerials(productCode: string, warehouseCode: string, companyId: string, branchId: string) {
  return InventorySerialModel.find({ companyId, branchId, productCode, warehouseCode, status: 'IN' }).sort({ serialNumber: 1 }).limit(500);
}

export async function applyInventoryMovement(input: InventoryMovementInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('MOVEMENT', idempotencyKey, input, createdBy, tenant, async (session, operationId) => {
    const validated = await validateItem(tenant, input.productCode, input.warehouseCode, input.quantity, session);
    let step = { ...input, ...validated } as MovementStep;
    if (input.type === 'ADJUSTMENT' && validated.trackLots) {
      if (!input.lotCode) throw new InventoryError('LOT_REQUIRED');
      const key = balanceKey(tenant, input.productCode, input.warehouseCode);
      const balance = await InventoryBalanceModel.findOne(key).session(session);
      const lot = await InventoryLotBalanceModel.findOne({ ...key, lotCode: input.lotCode }).session(session);
      const aggregateBefore = balance?.quantity ?? 0;
      step = { ...step, quantity: Number((aggregateBefore - (lot?.quantity ?? 0) + input.quantity).toFixed(6)), traceQuantity: input.quantity };
    }
    const result = await applyStep(step, tenant, createdBy, operationId, 0, session);
    return result;
  });
}

export async function transferInventory(input: InventoryTransferInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('TRANSFER', idempotencyKey, input, createdBy, tenant, async (session, operationId) => {
    if (await InventoryTransferModel.exists({ ...tenant, transferNumber: input.transferNumber }).session(session)) throw new InventoryError('TRANSFER_EXISTS');
    const validated = await validateItem(tenant, input.productCode, input.sourceWarehouseCode, input.quantity, session);
    const destinationAllowsNegative = await assertWarehouse(tenant, input.destinationWarehouseCode, session);
    const sourceLot = validated.trackLots && input.lotCode
      ? await InventoryLotBalanceModel.findOne({ ...balanceKey(tenant, input.productCode, input.sourceWarehouseCode), lotCode: input.lotCode }).session(session)
      : null;
    const trace = { lotCode: input.lotCode, expiresAt: input.expiresAt ?? sourceLot?.expiresAt, serialNumbers: input.serialNumbers };
    const source = await applyStep({ productCode: input.productCode, warehouseCode: input.sourceWarehouseCode, locationCode: input.sourceLocationCode, type: 'TRANSFER_OUT', ...validated, ...trace, reason: input.reason, reference: input.transferNumber }, tenant, createdBy, operationId, 0, session);
    const destination = await applyStep({ productCode: input.productCode, warehouseCode: input.destinationWarehouseCode, locationCode: input.destinationLocationCode, type: 'TRANSFER_IN', ...validated, ...trace, allowNegativeStock: destinationAllowsNegative, reason: input.reason, reference: input.transferNumber }, tenant, createdBy, operationId, 1, session);
    const [transfer] = await InventoryTransferModel.create([{
      ...tenant, transferNumber: input.transferNumber, productCode: input.productCode, sourceWarehouseCode: input.sourceWarehouseCode,
      destinationWarehouseCode: input.destinationWarehouseCode, sourceLocationCode: input.sourceLocationCode, destinationLocationCode: input.destinationLocationCode, quantity: validated.quantity, ...trace, reason: input.reason, status: 'POSTED', operationId, createdBy
    }], { session });
    if (!transfer) throw new Error('No se pudo guardar la transferencia');
    return { transfer: transfer.toObject(), source: source.balance, destination: destination.balance, movements: [source.movement, destination.movement] };
  });
}

export async function createInventoryCount(input: InventoryCountInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('CYCLE_COUNT', idempotencyKey, input, createdBy, tenant, async (session, operationId) => {
    if (await InventoryCountModel.exists({ ...tenant, countNumber: input.countNumber }).session(session)) throw new InventoryError('COUNT_EXISTS');
    await assertWarehouse(tenant, input.warehouseCode, session);
    const groups = new Map<string, typeof input.lines>();
    for (const line of input.lines) groups.set(line.productCode, [...(groups.get(line.productCode) ?? []), line]);
    const documentLines: { productCode: string; expectedQuantity: number; countedQuantity: number; difference: number; lotCode?: string; expiresAt?: Date; serialNumbers?: string[] }[] = [];
    const movements: unknown[] = [];
    let sequence = 0;
    for (const [productCode, group] of groups) {
      const validatedLines = [];
      for (const line of group) validatedLines.push(await validateItem(tenant, productCode, input.warehouseCode, line.countedQuantity, session));
      const tracking = validatedLines[0];
      if (!tracking) throw new InventoryError('INVALID_INVENTORY_REFERENCE');
      const balanceFilter = balanceKey(tenant, productCode, input.warehouseCode);
      const before = await InventoryBalanceModel.findOne(balanceFilter).session(session);
      const expectedAggregate = before?.quantity ?? 0;
      let countedAggregate = 0;
      const expectedByLine = new Map<number, number>();

      if (input.locationCode) {
        if (group.length !== 1 || group[0]?.lotCode || group[0]?.expiresAt || group[0]?.serialNumbers?.length || tracking.trackLots || tracking.trackSerials) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
        await assertLocation(tenant, input.warehouseCode, input.locationCode, session);
        const locationBalance = await InventoryLocationBalanceModel.findOne({ ...balanceFilter, locationCode: input.locationCode }).session(session);
        const expected = locationBalance?.quantity ?? 0;
        const counted = validatedLines[0]!.quantity;
        const result = await applyStep({ productCode, warehouseCode: input.warehouseCode, locationCode: input.locationCode, type: 'COUNT', quantity: counted, reason: input.reason, reference: input.countNumber }, tenant, createdBy, operationId, sequence++, session);
        movements.push(result.movement);
        documentLines.push({ productCode, expectedQuantity: expected, countedQuantity: counted, difference: Number((counted - expected).toFixed(6)) });
        continue;
      }

      if (tracking.trackLots) {
        if (group.some((line) => !line.lotCode)) throw new InventoryError('LOT_REQUIRED');
        const requestedLots = new Set(group.map((line) => line.lotCode!));
        const existingLots = await InventoryLotBalanceModel.find({ ...balanceFilter, $or: [{ quantity: { $gt: 0 } }, { reservedQuantity: { $gt: 0 } }] }).session(session);
        if (existingLots.some((lot) => !requestedLots.has(lot.lotCode))) throw new InventoryError('COUNT_TRACE_MISMATCH');
        for (let index = 0; index < group.length; index += 1) {
          const line = group[index]!;
          const lotFilter = { ...balanceFilter, lotCode: line.lotCode! };
          let lot = await InventoryLotBalanceModel.findOne(lotFilter).session(session);
          const expected = lot?.quantity ?? 0;
          if (lot && line.expiresAt && lot.expiresAt && lot.expiresAt.getTime() !== line.expiresAt.getTime()) throw new InventoryError('LOT_EXPIRY_CONFLICT');
          if (!lot) {
            const [createdLot] = await InventoryLotBalanceModel.create([{ ...lotFilter, expiresAt: line.expiresAt, quantity: 0, reservedQuantity: 0 }], { session });
            lot = createdLot ?? null;
          }
          if (!lot) throw new Error('No se pudo crear el lote del conteo');
          const counted = validatedLines[index]!.quantity;
          if (counted + 1e-9 < (lot.reservedQuantity ?? 0)) throw new InventoryError('RESERVED_STOCK_CONFLICT');
          if (line.expiresAt && !lot.expiresAt) lot.expiresAt = line.expiresAt;
          lot.quantity = counted;
          await lot.save({ session });
          expectedByLine.set(index, expected);
          countedAggregate += counted;
        }
      } else {
        if (group.length !== 1 || group[0]?.lotCode || group[0]?.expiresAt) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
        countedAggregate = validatedLines[0]!.quantity;
        expectedByLine.set(0, expectedAggregate);
      }

      if (tracking.trackSerials) {
        let countedSerialCount = 0;
        const countedSerials = new Set<string>();
        for (let index = 0; index < group.length; index += 1) {
          const line = group[index]!;
          const serialNumbers = line.serialNumbers;
          const countedQuantity = validatedLines[index]!.quantity;
          if (!serialNumbers || !Number.isInteger(countedQuantity) || serialNumbers.length !== countedQuantity) throw new InventoryError('SERIALS_REQUIRED');
          for (const serialNumber of serialNumbers) {
            if (countedSerials.has(serialNumber)) throw new InventoryError('SERIAL_INVALID');
            countedSerials.add(serialNumber); countedSerialCount += 1;
            const existing = await InventorySerialModel.findOne({ ...tenant, productCode, serialNumber }).session(session);
            if (existing?.status === 'RESERVED' && (existing.warehouseCode !== input.warehouseCode || !existing.reservationNumber)) throw new InventoryError('RESERVED_STOCK_CONFLICT');
            if (existing?.status === 'IN' && existing.warehouseCode !== input.warehouseCode) throw new InventoryError('SERIAL_INVALID');
            if (tracking.trackLots && existing?.lotCode && existing.lotCode !== line.lotCode) throw new InventoryError('SERIAL_INVALID');
            if (existing?.status === 'RESERVED') continue;
            if (existing) { existing.status = 'IN'; existing.warehouseCode = input.warehouseCode; existing.lotCode = line.lotCode; await existing.save({ session }); }
            else await InventorySerialModel.create([{ ...tenant, productCode, serialNumber, warehouseCode: input.warehouseCode, status: 'IN', lotCode: line.lotCode }], { session });
          }
        }
        const totalCounted = validatedLines.reduce((sum, line) => sum + line.quantity, 0);
        if (countedSerialCount !== totalCounted) throw new InventoryError('COUNT_TRACE_MISMATCH');
        const activeSerials = await InventorySerialModel.find({ ...tenant, productCode, warehouseCode: input.warehouseCode, status: { $in: ['IN', 'RESERVED'] } }).session(session);
        for (const serial of activeSerials) {
          if (countedSerials.has(serial.serialNumber)) continue;
          if (serial.status === 'RESERVED') throw new InventoryError('RESERVED_STOCK_CONFLICT');
          serial.status = 'OUT'; await serial.save({ session });
        }
      } else if (group.some((line) => line.serialNumbers?.length)) throw new InventoryError('TRACEABILITY_UNSUPPORTED');

      if (countedAggregate > 1_000_000_000) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
      const result = await applyStep({ productCode, warehouseCode: input.warehouseCode, type: 'COUNT', quantity: countedAggregate, allowNegativeStock: tracking.allowNegativeStock, trackLots: false, trackSerials: false, reason: input.reason, reference: input.countNumber }, tenant, createdBy, operationId, sequence++, session);
      movements.push(result.movement);
      for (let index = 0; index < group.length; index += 1) {
        const line = group[index]!;
        const expectedQuantity = expectedByLine.get(index) ?? 0;
        const countedQuantity = validatedLines[index]!.quantity;
        documentLines.push({ productCode, expectedQuantity, countedQuantity, difference: Number((countedQuantity - expectedQuantity).toFixed(6)), lotCode: line.lotCode, expiresAt: line.expiresAt, serialNumbers: line.serialNumbers });
      }
    }
    const [count] = await InventoryCountModel.create([{
      ...tenant, countNumber: input.countNumber, warehouseCode: input.warehouseCode, locationCode: input.locationCode, reason: input.reason, lines: documentLines, status: 'POSTED', operationId, createdBy
    }], { session });
    if (!count) throw new Error('No se pudo guardar el conteo');
    return { count: count.toObject(), movements };
  });
}

export async function listInventoryCounts(companyId: string, branchId: string) {
  return InventoryCountModel.find({ companyId, branchId }).sort({ createdAt: -1 }).limit(100);
}

export async function createInventoryReservation(input: InventoryReservationInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('RESERVE', idempotencyKey, input, createdBy, tenant, async (session, operationId) => {
    if (await InventoryReservationModel.exists({ ...tenant, reservationNumber: input.reservationNumber }).session(session)) throw new InventoryError('RESERVATION_EXISTS');
    const { quantity, trackLots, trackSerials } = await validateItem(tenant, input.productCode, input.warehouseCode, input.quantity, session);
    if (input.locationCode) {
      await assertLocation(tenant, input.warehouseCode, input.locationCode, session);
      if (trackLots || trackSerials) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
    }
    if (trackLots && !input.lotCode || trackSerials && (!input.serialNumbers?.length || !Number.isInteger(quantity) || input.serialNumbers.length !== quantity)) throw new InventoryError(trackLots && !input.lotCode ? 'LOT_REQUIRED' : 'SERIALS_REQUIRED');
    if (!trackLots && input.lotCode || !trackSerials && input.serialNumbers?.length) throw new InventoryError('TRACEABILITY_UNSUPPORTED');
    const key = balanceKey(tenant, input.productCode, input.warehouseCode);
    await InventoryBalanceModel.findOneAndUpdate(key, { $setOnInsert: { ...key, quantity: 0, reservedQuantity: 0, revision: 0 } }, { upsert: true, new: true, session, setDefaultsOnInsert: true });
    const balance = await InventoryBalanceModel.findOne(key).session(session);
    if (!balance || quantity > balance.quantity - (balance.reservedQuantity ?? 0) + 1e-9) throw new InventoryError('INSUFFICIENT_STOCK');
    if (!input.locationCode) {
      const slots = await InventoryLocationBalanceModel.find(key).session(session);
      const unlocatedAvailable = balance.quantity - slots.reduce((sum, slot) => sum + slot.quantity, 0) - Math.max(0, (balance.reservedQuantity ?? 0) - slots.reduce((sum, slot) => sum + slot.reservedQuantity, 0));
      if (quantity > unlocatedAvailable + 1e-9) throw new InventoryError('INSUFFICIENT_STOCK');
    }
    if (trackLots) {
      const lot = await InventoryLotBalanceModel.findOne({ ...key, lotCode: input.lotCode }).session(session);
      if (!lot || quantity > lot.quantity - (lot.reservedQuantity ?? 0) + 1e-9) throw new InventoryError('LOT_STOCK_INSUFFICIENT');
      lot.reservedQuantity = (lot.reservedQuantity ?? 0) + quantity;
      await lot.save({ session });
    }
    if (trackSerials) {
      for (const serialNumber of input.serialNumbers!) {
        const serial = await InventorySerialModel.findOne({ companyId: tenant.companyId, branchId: tenant.branchId, productCode: input.productCode, serialNumber }).session(session);
        if (!serial || serial.status !== 'IN' || serial.warehouseCode !== input.warehouseCode || trackLots && serial.lotCode !== input.lotCode) throw new InventoryError('SERIAL_INVALID');
        serial.status = 'RESERVED'; serial.reservationNumber = input.reservationNumber;
        await serial.save({ session });
      }
    }
    if (input.locationCode) {
      const locationBalance = await InventoryLocationBalanceModel.findOne({ ...key, locationCode: input.locationCode }).session(session);
      if (!locationBalance || quantity > locationBalance.quantity - (locationBalance.reservedQuantity ?? 0) + 1e-9) throw new InventoryError('INSUFFICIENT_STOCK');
      locationBalance.reservedQuantity = (locationBalance.reservedQuantity ?? 0) + quantity;
      await locationBalance.save({ session });
    }
    balance.reservedQuantity = (balance.reservedQuantity ?? 0) + quantity;
    balance.revision = (balance.revision ?? 0) + 1;
    await balance.save({ session });
    const [reservation] = await InventoryReservationModel.create([{
      ...tenant, ...input, status: 'ACTIVE', operationId, createdBy
    }], { session });
    if (!reservation) throw new Error('No se pudo crear la reserva');
    return { reservation: reservation.toObject(), balance: toBalance(balance) };
  });
}

export async function releaseInventoryReservation(reservationNumber: string, reason: string, idempotencyKey: string, actorId: string, tenant: Tenant) {
  const input = { reservationNumber: reservationNumber.toUpperCase(), reason };
  return runIdempotent('RELEASE_RESERVATION', idempotencyKey, input, actorId, tenant, async (session) => {
    const reservation = await InventoryReservationModel.findOne({ ...tenant, reservationNumber: input.reservationNumber }).session(session);
    if (!reservation) throw new InventoryError('RESERVATION_NOT_FOUND');
    if (reservation.status !== 'ACTIVE') throw new InventoryError('RESERVATION_NOT_ACTIVE');
    const key = balanceKey(tenant, reservation.productCode, reservation.warehouseCode);
    const balance = await InventoryBalanceModel.findOne(key).session(session);
    if (!balance || (balance.reservedQuantity ?? 0) < reservation.quantity) throw new InventoryError('INVENTORY_NOT_FOUND');
    if (reservation.lotCode) {
      const lot = await InventoryLotBalanceModel.findOne({ ...key, lotCode: reservation.lotCode }).session(session);
      if (!lot || (lot.reservedQuantity ?? 0) < reservation.quantity) throw new InventoryError('INVENTORY_NOT_FOUND');
      lot.reservedQuantity -= reservation.quantity;
      await lot.save({ session });
    }
    if (reservation.locationCode) {
      const locationBalance = await InventoryLocationBalanceModel.findOne({ ...key, locationCode: reservation.locationCode }).session(session);
      if (!locationBalance || (locationBalance.reservedQuantity ?? 0) < reservation.quantity) throw new InventoryError('INVENTORY_NOT_FOUND');
      locationBalance.reservedQuantity -= reservation.quantity;
      await locationBalance.save({ session });
    }
    for (const serialNumber of reservation.serialNumbers ?? []) {
      const serial = await InventorySerialModel.findOne({ companyId: tenant.companyId, branchId: tenant.branchId, productCode: reservation.productCode, serialNumber, reservationNumber: reservation.reservationNumber, status: 'RESERVED' }).session(session);
      if (!serial) throw new InventoryError('SERIAL_INVALID');
      serial.status = 'IN'; serial.reservationNumber = undefined;
      await serial.save({ session });
    }
    balance.reservedQuantity -= reservation.quantity;
    balance.revision = (balance.revision ?? 0) + 1;
    reservation.status = 'RELEASED';
    reservation.reason = `${reservation.reason}; ${reason}`.slice(0, 240);
    await balance.save({ session });
    await reservation.save({ session });
    return { reservation: reservation.toObject(), balance: toBalance(balance) };
  });
}

export async function consumeInventoryReservation(reservationNumber: string, reason: string, idempotencyKey: string, actorId: string, tenant: Tenant) {
  const input = { reservationNumber: reservationNumber.toUpperCase(), reason };
  return runIdempotent('CONSUME_RESERVATION', idempotencyKey, input, actorId, tenant, async (session, operationId) => {
    const reservation = await InventoryReservationModel.findOne({ ...tenant, reservationNumber: input.reservationNumber }).session(session);
    if (!reservation) throw new InventoryError('RESERVATION_NOT_FOUND');
    if (reservation.status !== 'ACTIVE') throw new InventoryError('RESERVATION_NOT_ACTIVE');
    const key = balanceKey(tenant, reservation.productCode, reservation.warehouseCode);
    const balance = await InventoryBalanceModel.findOne(key).session(session);
    if (!balance || (balance.reservedQuantity ?? 0) < reservation.quantity || balance.quantity < reservation.quantity) throw new InventoryError('INVENTORY_NOT_FOUND');
    if (reservation.lotCode) {
      const lot = await InventoryLotBalanceModel.findOne({ ...balanceKey(tenant, reservation.productCode, reservation.warehouseCode), lotCode: reservation.lotCode }).session(session);
      if (!lot || (lot.reservedQuantity ?? 0) < reservation.quantity || lot.quantity < reservation.quantity) throw new InventoryError('LOT_STOCK_INSUFFICIENT');
      lot.quantity = Number((lot.quantity - reservation.quantity).toFixed(6));
      lot.reservedQuantity = Number(((lot.reservedQuantity ?? 0) - reservation.quantity).toFixed(6));
      await lot.save({ session });
    }
    if (reservation.locationCode) {
      const locationBalance = await InventoryLocationBalanceModel.findOne({ ...key, locationCode: reservation.locationCode }).session(session);
      if (!locationBalance || (locationBalance.reservedQuantity ?? 0) < reservation.quantity || locationBalance.quantity < reservation.quantity) throw new InventoryError('INVENTORY_NOT_FOUND');
      locationBalance.quantity = Number((locationBalance.quantity - reservation.quantity).toFixed(6));
      locationBalance.reservedQuantity = Number(((locationBalance.reservedQuantity ?? 0) - reservation.quantity).toFixed(6));
      await locationBalance.save({ session });
    }
    for (const serialNumber of reservation.serialNumbers ?? []) {
      const serial = await InventorySerialModel.findOne({ companyId: tenant.companyId, branchId: tenant.branchId, productCode: reservation.productCode, serialNumber, reservationNumber: reservation.reservationNumber, status: 'RESERVED' }).session(session);
      if (!serial) throw new InventoryError('SERIAL_INVALID');
      serial.status = 'OUT'; serial.reservationNumber = undefined;
      await serial.save({ session });
    }
    const previousQuantity = balance.quantity;
    balance.quantity = Number((balance.quantity - reservation.quantity).toFixed(6));
    balance.reservedQuantity = Number(((balance.reservedQuantity ?? 0) - reservation.quantity).toFixed(6));
    balance.revision = (balance.revision ?? 0) + 1;
    reservation.status = 'CONSUMED';
    reservation.reason = `${reservation.reason}; ${reason}`.slice(0, 240);
    const [movement] = await InventoryMovementModel.create([{
      ...key, locationCode: reservation.locationCode, type: 'OUT', quantity: reservation.quantity, previousQuantity, resultingQuantity: balance.quantity,
      reason, reference: reservation.reservationNumber, lotCode: reservation.lotCode, serialNumbers: reservation.serialNumbers, createdBy: actorId, operationId, sequence: 0
    }], { session });
    if (!movement) throw new Error('No se pudo guardar el movimiento de inventario');
    await balance.save({ session });
    await reservation.save({ session });
    return { reservation: reservation.toObject(), balance: toBalance(balance), movement: movement.toObject() };
  });
}

export async function listInventoryReservations(companyId: string, branchId: string) {
  return InventoryReservationModel.find({ companyId, branchId, status: 'ACTIVE' }).sort({ createdAt: -1 }).limit(100);
}

export async function createWarehouseLocation(input: WarehouseLocationInput, tenant: Tenant) {
  await assertWarehouse(tenant, input.warehouseCode);
  try {
    return await WarehouseLocationModel.create({ ...tenant, ...input, status: 'ACTIVE' });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new InventoryError('LOCATION_EXISTS');
    throw error;
  }
}

export async function listWarehouseLocations(warehouseCode: string, tenant: Tenant) {
  await assertWarehouse(tenant, warehouseCode);
  return WarehouseLocationModel.find({ ...tenant, warehouseCode, status: 'ACTIVE' }).sort({ code: 1 }).limit(500);
}

export async function listInventoryLocationBalances(productCode: string, warehouseCode: string, tenant: Tenant) {
  await assertWarehouse(tenant, warehouseCode);
  return InventoryLocationBalanceModel.find({ ...tenant, productCode, warehouseCode, quantity: { $gt: 0 } }).sort({ locationCode: 1 }).limit(500);
}
