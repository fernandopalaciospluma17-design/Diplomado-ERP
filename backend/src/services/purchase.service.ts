import { PurchaseModel } from '../models/purchase.model.js';
import type { CreatePurchaseInput } from '../validators/purchase.validators.js';

export class PurchaseError extends Error {
  constructor(public readonly code: 'PURCHASE_EXISTS') {
    super('El numero de compra ya esta registrado');
  }
}

export async function listPurchases() {
  return PurchaseModel.find().sort({ createdAt: -1 }).limit(100);
}

export async function createPurchase(input: CreatePurchaseInput, createdBy: string) {
  const existing = await PurchaseModel.exists({ purchaseNumber: input.purchaseNumber });
  if (existing) {
    throw new PurchaseError('PURCHASE_EXISTS');
  }

  const lines = input.lines.map((line) => ({ ...line, lineTotalCents: line.quantity * line.unitCostCents }));
  const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  return PurchaseModel.create({ ...input, lines, subtotalCents, totalCents: subtotalCents, createdBy });
}