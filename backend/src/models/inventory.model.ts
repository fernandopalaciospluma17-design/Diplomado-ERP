import { Schema, model, Types } from 'mongoose';

export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryBalanceDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  productCode: string;
  warehouseCode: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovementDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  productCode: string;
  warehouseCode: string;
  type: InventoryMovementType;
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  reason: string;
  reference?: string;
  createdBy: string;
  createdAt: Date;
}

const inventoryBalanceSchema = new Schema<InventoryBalanceDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    productCode: { type: String, required: true, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

inventoryBalanceSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1 }, { unique: true });

const inventoryMovementSchema = new Schema<InventoryMovementDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    productCode: { type: String, required: true, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, required: true, min: 0 },
    resultingQuantity: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 240 },
    reference: { type: String, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inventoryMovementSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1, createdAt: -1 });

export const InventoryBalanceModel = model<InventoryBalanceDocument>('InventoryBalance', inventoryBalanceSchema);
export const InventoryMovementModel = model<InventoryMovementDocument>('InventoryMovement', inventoryMovementSchema);
