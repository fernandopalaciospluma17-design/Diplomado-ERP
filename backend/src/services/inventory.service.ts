import { InventoryBalanceModel, InventoryMovementModel } from '../models/inventory.model.js';
import type { InventoryMovementInput } from '../validators/inventory.validators.js';

export class InventoryError extends Error {
  constructor(public readonly code: 'INSUFFICIENT_STOCK' | 'INVENTORY_NOT_FOUND') {
    super(code === 'INSUFFICIENT_STOCK' ? 'Stock insuficiente' : 'Inventario no encontrado');
  }
}

export async function getInventory(productCode: string, warehouseCode: string, companyId: string, branchId: string) {
  const balance = await InventoryBalanceModel.findOne({ companyId, branchId, productCode, warehouseCode });
  return balance ? { productCode: balance.productCode, warehouseCode: balance.warehouseCode, quantity: balance.quantity } : { productCode, warehouseCode, quantity: 0 };
}

export async function listInventoryMovements(productCode: string, warehouseCode: string, companyId: string, branchId: string) {
  return InventoryMovementModel.find({ companyId, branchId, productCode, warehouseCode }).sort({ createdAt: -1 }).limit(100);
}

export async function applyInventoryMovement(input: InventoryMovementInput, createdBy: string, companyId: string, branchId: string) {
  const productCode = input.productCode;
  const warehouseCode = input.warehouseCode;
  const current = await InventoryBalanceModel.findOne({ companyId, branchId, productCode, warehouseCode });
  const previousQuantity = current?.quantity ?? 0;
  const resultingQuantity = input.type === 'IN'
    ? previousQuantity + input.quantity
    : input.type === 'OUT'
      ? previousQuantity - input.quantity
      : input.quantity;

  if (resultingQuantity < 0) {
    throw new InventoryError('INSUFFICIENT_STOCK');
  }

  const balance = await InventoryBalanceModel.findOneAndUpdate(
    input.type === 'OUT'
      ? { companyId, branchId, productCode, warehouseCode, quantity: { $gte: input.quantity } }
      : { companyId, branchId, productCode, warehouseCode },
    { $set: { quantity: resultingQuantity }, $setOnInsert: { companyId, branchId, productCode, warehouseCode } },
    { new: true, upsert: true, runValidators: true }
  );

  if (!balance) {
    throw new InventoryError('INSUFFICIENT_STOCK');
  }

  const movement = await InventoryMovementModel.create({
    ...input,
    companyId,
    branchId,
    previousQuantity,
    resultingQuantity,
    createdBy
  });

  return { balance: { productCode, warehouseCode, quantity: balance.quantity }, movement };
}
