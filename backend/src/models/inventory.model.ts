import { Schema, model, Types } from 'mongoose';

export type InventoryMovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'COUNT';

export interface InventoryBalanceDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  productCode: string;
  warehouseCode: string;
  quantity: number;
  reservedQuantity: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryMovementDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  productCode: string;
  warehouseCode: string;
  locationCode?: string;
  type: InventoryMovementType;
  quantity: number;
  targetQuantity?: number;
  locationTargetQuantity?: number;
  traceTargetQuantity?: number;
  previousQuantity: number;
  resultingQuantity: number;
  lotCode?: string;
  expiresAt?: Date;
  serialNumbers?: string[];
  reason: string;
  reference?: string;
  createdBy: string;
  operationId: Types.ObjectId;
  sequence: number;
  createdAt: Date;
}

const inventoryBalanceSchema = new Schema<InventoryBalanceDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    productCode: { type: String, required: true, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: -1_000_000_000, default: 0 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
    revision: { type: Number, required: true, min: 0, default: 0 }
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
    locationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
    type: { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'COUNT'], required: true },
    quantity: { type: Number, required: true, min: 0 },
    targetQuantity: { type: Number, min: 0 },
    locationTargetQuantity: { type: Number, min: 0 },
    traceTargetQuantity: { type: Number, min: 0 },
    previousQuantity: { type: Number, required: true, min: 0 },
    resultingQuantity: { type: Number, required: true, min: 0 },
    lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 },
    expiresAt: { type: Date },
    serialNumbers: { type: [String], default: undefined },
    reason: { type: String, required: true, trim: true, maxlength: 240 },
    reference: { type: String, trim: true, maxlength: 80 },
    createdBy: { type: String, required: true },
    operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true },
    sequence: { type: Number, required: true, min: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

inventoryMovementSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1, locationCode: 1, createdAt: -1 });
inventoryMovementSchema.index({ companyId: 1, branchId: 1, operationId: 1, sequence: 1 }, { unique: true, partialFilterExpression: { operationId: { $type: 'objectId' } } });

export const InventoryBalanceModel = model<InventoryBalanceDocument>('InventoryBalance', inventoryBalanceSchema);
export const InventoryMovementModel = model<InventoryMovementDocument>('InventoryMovement', inventoryMovementSchema);

export interface WarehouseLocationDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  warehouseCode: string;
  code: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}
const warehouseLocationSchema = new Schema<WarehouseLocationDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 240 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], required: true, default: 'ACTIVE' }
}, { timestamps: true });
warehouseLocationSchema.index({ companyId: 1, branchId: 1, warehouseCode: 1, code: 1 }, { unique: true });
warehouseLocationSchema.index({ companyId: 1, branchId: 1, warehouseCode: 1, status: 1, name: 1 });
export const WarehouseLocationModel = model<WarehouseLocationDocument>('WarehouseLocation', warehouseLocationSchema);

export interface InventoryLocationBalanceDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  productCode: string;
  warehouseCode: string;
  locationCode: string;
  quantity: number;
  reservedQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}
const inventoryLocationBalanceSchema = new Schema<InventoryLocationBalanceDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  productCode: { type: String, required: true, trim: true, uppercase: true },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  locationCode: { type: String, required: true, trim: true, uppercase: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  reservedQuantity: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });
inventoryLocationBalanceSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1, locationCode: 1 }, { unique: true });
inventoryLocationBalanceSchema.index({ companyId: 1, branchId: 1, warehouseCode: 1, locationCode: 1 });
export const InventoryLocationBalanceModel = model<InventoryLocationBalanceDocument>('InventoryLocationBalance', inventoryLocationBalanceSchema);

export interface InventoryLotBalanceDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; productCode: string; warehouseCode: string; lotCode: string;
  expiresAt?: Date; quantity: number; reservedQuantity: number; createdAt: Date; updatedAt: Date;
}
const inventoryLotBalanceSchema = new Schema<InventoryLotBalanceDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  productCode: { type: String, required: true, trim: true, uppercase: true }, warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  lotCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 80 }, expiresAt: { type: Date }, quantity: { type: Number, required: true, min: 0, default: 0 }, reservedQuantity: { type: Number, required: true, min: 0, default: 0 }
}, { timestamps: true });
inventoryLotBalanceSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1, lotCode: 1 }, { unique: true });
inventoryLotBalanceSchema.index({ companyId: 1, branchId: 1, productCode: 1, expiresAt: 1 });
export const InventoryLotBalanceModel = model<InventoryLotBalanceDocument>('InventoryLotBalance', inventoryLotBalanceSchema);

export interface InventorySerialDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; productCode: string; serialNumber: string; warehouseCode: string; status: 'IN' | 'RESERVED' | 'OUT'; reservationNumber?: string; lotCode?: string;
  createdAt: Date; updatedAt: Date;
}
const inventorySerialSchema = new Schema<InventorySerialDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  productCode: { type: String, required: true, trim: true, uppercase: true }, serialNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 100 },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true }, status: { type: String, enum: ['IN', 'RESERVED', 'OUT'], required: true }, reservationNumber: { type: String, trim: true, uppercase: true }, lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 }
}, { timestamps: true });
inventorySerialSchema.index({ companyId: 1, branchId: 1, productCode: 1, serialNumber: 1 }, { unique: true });
inventorySerialSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1, status: 1 });
export const InventorySerialModel = model<InventorySerialDocument>('InventorySerial', inventorySerialSchema);

export interface InventoryOperationDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  idempotencyKey: string;
  requestHash: string;
  type: 'MOVEMENT' | 'TRANSFER' | 'CYCLE_COUNT' | 'RESERVE' | 'RELEASE_RESERVATION' | 'CONSUME_RESERVATION' | 'PURCHASE_RECEIPT' | 'PURCHASE_INVOICE' | 'SUPPLIER_PAYMENT' | 'PURCHASE_RETURN' | 'APPLY_SUPPLIER_CREDIT' | 'SALE' | 'SALE_PAYMENT' | 'SALE_RETURN' | 'SALE_DELIVERY' | 'SALE_INVOICE' | 'ACCOUNTING_POST' | 'POS_TICKET';
  result: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}
const inventoryOperationSchema = new Schema<InventoryOperationDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  idempotencyKey: { type: String, required: true, trim: true, minlength: 8, maxlength: 120 },
  requestHash: { type: String, required: true, minlength: 64, maxlength: 64 },
  type: { type: String, enum: ['MOVEMENT', 'TRANSFER', 'CYCLE_COUNT', 'RESERVE', 'RELEASE_RESERVATION', 'CONSUME_RESERVATION', 'PURCHASE_RECEIPT', 'PURCHASE_INVOICE', 'SUPPLIER_PAYMENT', 'PURCHASE_RETURN', 'APPLY_SUPPLIER_CREDIT', 'SALE', 'SALE_PAYMENT', 'SALE_RETURN', 'SALE_DELIVERY', 'SALE_INVOICE', 'ACCOUNTING_POST', 'POS_TICKET'], required: true },
  result: { type: Schema.Types.Mixed, required: true },
  createdBy: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
inventoryOperationSchema.index({ companyId: 1, branchId: 1, idempotencyKey: 1 }, { unique: true });
export const InventoryOperationModel = model<InventoryOperationDocument>('InventoryOperation', inventoryOperationSchema);

export interface InventoryReservationDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  reservationNumber: string;
  productCode: string;
  warehouseCode: string;
  locationCode?: string;
  quantity: number;
  lotCode?: string;
  serialNumbers?: string[];
  reason: string;
  status: 'ACTIVE' | 'RELEASED' | 'CONSUMED';
  createdBy: string;
  operationId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const inventoryReservationSchema = new Schema<InventoryReservationDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  reservationNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  productCode: { type: String, required: true, trim: true, uppercase: true },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  locationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
  quantity: { type: Number, required: true, min: 0.000001 },
  lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 }, serialNumbers: { type: [String], default: undefined },
  reason: { type: String, required: true, trim: true, maxlength: 240 },
  status: { type: String, enum: ['ACTIVE', 'RELEASED', 'CONSUMED'], required: true, default: 'ACTIVE' },
  createdBy: { type: String, required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: true });
inventoryReservationSchema.index({ companyId: 1, branchId: 1, reservationNumber: 1 }, { unique: true });
inventoryReservationSchema.index({ companyId: 1, branchId: 1, productCode: 1, warehouseCode: 1, status: 1 });
export const InventoryReservationModel = model<InventoryReservationDocument>('InventoryReservation', inventoryReservationSchema);

export interface InventoryTransferDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  transferNumber: string;
  productCode: string;
  sourceWarehouseCode: string;
  destinationWarehouseCode: string;
  sourceLocationCode?: string;
  destinationLocationCode?: string;
  quantity: number;
  lotCode?: string;
  expiresAt?: Date;
  serialNumbers?: string[];
  reason: string;
  status: 'POSTED';
  operationId: Types.ObjectId;
  createdBy: string;
  createdAt: Date;
}
const inventoryTransferSchema = new Schema<InventoryTransferDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  transferNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  productCode: { type: String, required: true, trim: true, uppercase: true },
  sourceWarehouseCode: { type: String, required: true, trim: true, uppercase: true },
  destinationWarehouseCode: { type: String, required: true, trim: true, uppercase: true },
  sourceLocationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
  destinationLocationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
  quantity: { type: Number, required: true, min: 0.000001 },
  lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 }, expiresAt: { type: Date }, serialNumbers: { type: [String], default: undefined },
  reason: { type: String, required: true, trim: true, maxlength: 240 },
  status: { type: String, enum: ['POSTED'], required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true },
  createdBy: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
inventoryTransferSchema.index({ companyId: 1, branchId: 1, transferNumber: 1 }, { unique: true });
export const InventoryTransferModel = model<InventoryTransferDocument>('InventoryTransfer', inventoryTransferSchema);

export interface InventoryCountLine {
  productCode: string;
  expectedQuantity: number;
  countedQuantity: number;
  difference: number;
  lotCode?: string;
  expiresAt?: Date;
  serialNumbers?: string[];
}
export interface InventoryCountDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  countNumber: string;
  warehouseCode: string;
  locationCode?: string;
  reason: string;
  lines: InventoryCountLine[];
  status: 'POSTED';
  operationId: Types.ObjectId;
  createdBy: string;
  createdAt: Date;
}
const inventoryCountSchema = new Schema<InventoryCountDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  countNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  locationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
  reason: { type: String, required: true, trim: true, maxlength: 240 },
  lines: [{ productCode: { type: String, required: true, trim: true, uppercase: true }, expectedQuantity: { type: Number, required: true, min: 0 }, countedQuantity: { type: Number, required: true, min: 0 }, difference: { type: Number, required: true }, lotCode: { type: String, trim: true, uppercase: true }, expiresAt: { type: Date }, serialNumbers: { type: [String], default: undefined } }],
  status: { type: String, enum: ['POSTED'], required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true },
  createdBy: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
inventoryCountSchema.index({ companyId: 1, branchId: 1, countNumber: 1 }, { unique: true });
inventoryCountSchema.index({ companyId: 1, branchId: 1, warehouseCode: 1, createdAt: -1 });
export const InventoryCountModel = model<InventoryCountDocument>('InventoryCount', inventoryCountSchema);
