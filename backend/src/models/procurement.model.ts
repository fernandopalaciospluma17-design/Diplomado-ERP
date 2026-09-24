import { Schema, model, Types } from 'mongoose';

export type PurchaseRequestStatus = 'REQUESTED' | 'QUOTED' | 'ORDERED' | 'CANCELLED';
export interface PurchaseRequestDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; requestNumber: string; warehouseCode: string; reason: string; requiredBy?: Date;
  lines: { productCode: string; quantity: number }[]; status: PurchaseRequestStatus; awardedQuoteNumber?: string; purchaseNumber?: string; createdBy: string; createdAt: Date; updatedAt: Date;
}
const purchaseRequestSchema = new Schema<PurchaseRequestDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  requestNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  reason: { type: String, required: true, trim: true, maxlength: 240 }, requiredBy: { type: Date },
  lines: { type: [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 } }], required: true, validate: (lines: unknown[]) => lines.length > 0 },
  status: { type: String, enum: ['REQUESTED', 'QUOTED', 'ORDERED', 'CANCELLED'], required: true, default: 'REQUESTED' }, awardedQuoteNumber: { type: String, trim: true, uppercase: true, maxlength: 40 }, purchaseNumber: { type: String, trim: true, uppercase: true, maxlength: 40 }, createdBy: { type: String, required: true }
}, { timestamps: true });
purchaseRequestSchema.index({ companyId: 1, branchId: 1, requestNumber: 1 }, { unique: true });
purchaseRequestSchema.index({ companyId: 1, branchId: 1, status: 1, createdAt: -1 });
export const PurchaseRequestModel = model<PurchaseRequestDocument>('PurchaseRequest', purchaseRequestSchema);

export type SupplierQuoteStatus = 'RECEIVED' | 'AWARDED' | 'NOT_SELECTED';
export interface SupplierQuoteDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; requestNumber: string; quoteNumber: string; supplierCode: string; validUntil: Date; notes?: string;
  lines: { productCode: string; quantity: number; unitCostCents: number }[]; status: SupplierQuoteStatus; purchaseNumber?: string; createdBy: string; createdAt: Date;
}
const supplierQuoteSchema = new Schema<SupplierQuoteDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  requestNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, quoteNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  supplierCode: { type: String, required: true, trim: true, uppercase: true }, validUntil: { type: Date, required: true }, notes: { type: String, trim: true, maxlength: 500 },
  lines: { type: [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 }, unitCostCents: { type: Number, required: true, min: 0 } }], required: true, validate: (lines: unknown[]) => lines.length > 0 },
  status: { type: String, enum: ['RECEIVED', 'AWARDED', 'NOT_SELECTED'], required: true, default: 'RECEIVED' }, purchaseNumber: { type: String, trim: true, uppercase: true, maxlength: 40 }, createdBy: { type: String, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
supplierQuoteSchema.index({ companyId: 1, branchId: 1, quoteNumber: 1 }, { unique: true });
supplierQuoteSchema.index({ companyId: 1, branchId: 1, requestNumber: 1, status: 1, createdAt: -1 });
export const SupplierQuoteModel = model<SupplierQuoteDocument>('SupplierQuote', supplierQuoteSchema);
