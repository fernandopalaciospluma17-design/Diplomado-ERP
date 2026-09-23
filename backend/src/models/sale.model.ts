import { Schema, model, Types } from 'mongoose';

export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface SaleLine {
  productCode: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface SaleDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  saleNumber: string;
  customerCode?: string;
  warehouseCode: string;
  lines: SaleLine[];
  subtotalCents: number;
  totalCents: number;
  status: SaleStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const saleLineSchema = new Schema<SaleLine>(
  {
    productCode: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
    lineTotalCents: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const saleSchema = new Schema<SaleDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    saleNumber: { type: String, required: true, trim: true, uppercase: true },
    customerCode: { type: String, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    lines: { type: [saleLineSchema], required: true, validate: (lines: SaleLine[]) => lines.length > 0 },
    subtotalCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['COMPLETED', 'CANCELLED'], default: 'COMPLETED', required: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

saleSchema.index({ companyId: 1, saleNumber: 1 }, { unique: true });
saleSchema.index({ companyId: 1, branchId: 1, createdAt: -1, status: 1 });

export const SaleModel = model<SaleDocument>('Sale', saleSchema);
