import { Schema, model, Types } from 'mongoose';

export type SaleStatus = 'COMPLETED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED' | 'RETURNED';

export interface SaleLine {
  productCode: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  returnedQuantity: number;
  returnedCents: number;
  lotCode?: string;
  serialNumbers?: string[];
}

export interface SaleDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  saleNumber: string;
  posSessionNumber?: string;
  customerCode?: string;
  warehouseCode: string;
  lines: SaleLine[];
  subtotalCents: number;
  discountBps: number;
  discountCents: number;
  taxBps: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  returnedCents: number;
  outstandingCents: number;
  customerRefundDueCents: number;
  status: SaleStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleLineSchema = new Schema<SaleLine>(
  {
    productCode: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    lineTotalCents: { type: Number, required: true, min: 0 },
    returnedQuantity: { type: Number, required: true, min: 0, default: 0 },
    returnedCents: { type: Number, required: true, min: 0, default: 0 },
    lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 },
    serialNumbers: { type: [String], default: undefined }
  },
  { _id: false }
);

const saleSchema = new Schema<SaleDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    saleNumber: { type: String, required: true, trim: true, uppercase: true },
    posSessionNumber: { type: String, trim: true, uppercase: true, maxlength: 40 },
    customerCode: { type: String, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    lines: { type: [saleLineSchema], required: true, validate: (lines: SaleLine[]) => lines.length > 0 },
    subtotalCents: { type: Number, required: true, min: 0 },
    discountBps: { type: Number, required: true, min: 0, max: 10000, default: 0 },
    discountCents: { type: Number, required: true, min: 0, default: 0 },
    taxBps: { type: Number, required: true, min: 0, max: 10000, default: 0 },
    taxCents: { type: Number, required: true, min: 0, default: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    paidCents: { type: Number, required: true, min: 0, default: 0 },
    returnedCents: { type: Number, required: true, min: 0, default: 0 },
    outstandingCents: { type: Number, required: true, min: 0, default: 0 },
    customerRefundDueCents: { type: Number, required: true, min: 0, default: 0 },
    status: { type: String, enum: ['COMPLETED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'RETURNED'], default: 'COMPLETED', required: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

saleSchema.index({ companyId: 1, saleNumber: 1 }, { unique: true });
saleSchema.index({ companyId: 1, branchId: 1, createdAt: -1, status: 1 });

export const SaleModel = model<SaleDocument>('Sale', saleSchema);

export interface SaleReturnDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; returnNumber: string; saleNumber: string; reason: string;
  lines: { productCode: string; quantity: number; amountCents: number; lotCode?: string; serialNumbers?: string[] }[];
  totalCreditCents: number; createdBy: string; operationId: Types.ObjectId; createdAt: Date;
  refundedCents: number; refundMethod?: 'CASH' | 'CARD' | 'TRANSFER'; refundReference?: string;
}
const saleReturnSchema = new Schema<SaleReturnDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  returnNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, saleNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  reason: { type: String, required: true, trim: true, maxlength: 240 },
  lines: { type: [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 }, amountCents: { type: Number, required: true, min: 0 }, lotCode: { type: String, trim: true, uppercase: true }, serialNumbers: { type: [String], default: undefined } }], required: true, validate: (lines: unknown[]) => lines.length > 0 },
  totalCreditCents: { type: Number, required: true, min: 0 }, refundedCents: { type: Number, required: true, min: 0, default: 0 },
  refundMethod: { type: String, enum: ['CASH', 'CARD', 'TRANSFER'] }, refundReference: { type: String, trim: true, maxlength: 100 },
  createdBy: { type: String, required: true }, operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
saleReturnSchema.index({ companyId: 1, branchId: 1, returnNumber: 1 }, { unique: true });
saleReturnSchema.index({ companyId: 1, branchId: 1, saleNumber: 1, createdAt: -1 });
export const SaleReturnModel = model<SaleReturnDocument>('SaleReturn', saleReturnSchema);
