import { Schema, model } from 'mongoose';

export type PurchaseStatus = 'RECEIVED' | 'CANCELLED';

export interface PurchaseLine {
  productCode: string;
  quantity: number;
  unitCostCents: number;
  lineTotalCents: number;
}

export interface PurchaseDocument {
  purchaseNumber: string;
  supplierCode?: string;
  warehouseCode: string;
  lines: PurchaseLine[];
  subtotalCents: number;
  totalCents: number;
  status: PurchaseStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseLineSchema = new Schema<PurchaseLine>(
  {
    productCode: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCostCents: { type: Number, required: true, min: 0 },
    lineTotalCents: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const purchaseSchema = new Schema<PurchaseDocument>(
  {
    purchaseNumber: { type: String, required: true, trim: true, uppercase: true },
    supplierCode: { type: String, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    lines: { type: [purchaseLineSchema], required: true, validate: (lines: PurchaseLine[]) => lines.length > 0 },
    subtotalCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['RECEIVED', 'CANCELLED'], default: 'RECEIVED', required: true },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

purchaseSchema.index({ purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ createdAt: -1, status: 1 });

export const PurchaseModel = model<PurchaseDocument>('Purchase', purchaseSchema);