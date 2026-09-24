import { Schema, model, Types } from 'mongoose';

export interface SalesPlanLine { productCode: string; quantity: number; unitPriceCents: number; deliveredQuantity?: number }
export type SalesQuoteStatus = 'OPEN' | 'CONVERTED' | 'CANCELLED';
export interface SalesQuoteDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; quoteNumber: string; customerCode?: string; warehouseCode: string; validUntil: Date;
  lines: SalesPlanLine[]; discountBps: number; taxBps: number; status: SalesQuoteStatus; orderNumber?: string; createdBy: string; createdAt: Date; updatedAt: Date;
}
const planLines = [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 }, unitPriceCents: { type: Number, required: true, min: 0 } }];
const salesQuoteSchema = new Schema<SalesQuoteDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  quoteNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, customerCode: { type: String, trim: true, uppercase: true },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true }, validUntil: { type: Date, required: true },
  lines: { type: planLines, required: true }, discountBps: { type: Number, required: true, min: 0, max: 10000, default: 0 }, taxBps: { type: Number, required: true, min: 0, max: 10000, default: 0 },
  status: { type: String, enum: ['OPEN', 'CONVERTED', 'CANCELLED'], required: true, default: 'OPEN' }, orderNumber: { type: String, trim: true, uppercase: true }, createdBy: { type: String, required: true }
}, { timestamps: true });
salesQuoteSchema.index({ companyId: 1, branchId: 1, quoteNumber: 1 }, { unique: true });
salesQuoteSchema.index({ companyId: 1, branchId: 1, status: 1, validUntil: 1 });
export const SalesQuoteModel = model<SalesQuoteDocument>('SalesQuote', salesQuoteSchema);

export type SalesOrderStatus = 'OPEN' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED';
export interface SalesOrderDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; orderNumber: string; quoteNumber?: string; customerCode?: string; warehouseCode: string;
  lines: SalesPlanLine[]; discountBps: number; taxBps: number; status: SalesOrderStatus; createdBy: string; createdAt: Date; updatedAt: Date;
}
const orderLines = [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 }, unitPriceCents: { type: Number, required: true, min: 0 }, deliveredQuantity: { type: Number, required: true, min: 0, default: 0 } }];
const salesOrderSchema = new Schema<SalesOrderDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  orderNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, quoteNumber: { type: String, trim: true, uppercase: true },
  customerCode: { type: String, trim: true, uppercase: true }, warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  lines: { type: orderLines, required: true }, discountBps: { type: Number, required: true, min: 0, max: 10000, default: 0 }, taxBps: { type: Number, required: true, min: 0, max: 10000, default: 0 },
  status: { type: String, enum: ['OPEN', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CANCELLED'], required: true, default: 'OPEN' }, createdBy: { type: String, required: true }
}, { timestamps: true });
salesOrderSchema.index({ companyId: 1, branchId: 1, orderNumber: 1 }, { unique: true });
salesOrderSchema.index({ companyId: 1, branchId: 1, status: 1, createdAt: -1 });
export const SalesOrderModel = model<SalesOrderDocument>('SalesOrder', salesOrderSchema);

export interface SalesDeliveryDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; deliveryNumber: string; orderNumber: string; saleNumber: string;
  lines: { productCode: string; quantity: number; lotCode?: string; serialNumbers?: string[] }[]; createdBy: string; operationId: Types.ObjectId; createdAt: Date;
}
const salesDeliverySchema = new Schema<SalesDeliveryDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  deliveryNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, orderNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, saleNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  lines: { type: [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 }, lotCode: { type: String, trim: true, uppercase: true }, serialNumbers: { type: [String], default: undefined } }], required: true, validate: (items: unknown[]) => items.length > 0 },
  createdBy: { type: String, required: true }, operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
salesDeliverySchema.index({ companyId: 1, branchId: 1, deliveryNumber: 1 }, { unique: true });
salesDeliverySchema.index({ companyId: 1, branchId: 1, orderNumber: 1, createdAt: -1 });
export const SalesDeliveryModel = model<SalesDeliveryDocument>('SalesDelivery', salesDeliverySchema);

export type SalesInvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
export interface SalesInvoiceDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; invoiceNumber: string; saleNumber: string; customerCode?: string; issuedAt: Date; dueAt?: Date;
  lines: { productCode: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[]; discountBps: number; taxBps: number;
  subtotalCents: number; discountCents: number; taxCents: number; totalCents: number; status: SalesInvoiceStatus; createdBy: string; operationId: Types.ObjectId; createdAt: Date;
}
const salesInvoiceSchema = new Schema<SalesInvoiceDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  invoiceNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, saleNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, customerCode: { type: String, trim: true, uppercase: true },
  issuedAt: { type: Date, required: true }, dueAt: { type: Date },
  lines: { type: [{ productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 }, unitPriceCents: { type: Number, required: true, min: 0 }, lineTotalCents: { type: Number, required: true, min: 0 } }], required: true, validate: (items: unknown[]) => items.length > 0 },
  discountBps: { type: Number, required: true, min: 0, max: 10000 }, taxBps: { type: Number, required: true, min: 0, max: 10000 },
  subtotalCents: { type: Number, required: true, min: 0 }, discountCents: { type: Number, required: true, min: 0 }, taxCents: { type: Number, required: true, min: 0 }, totalCents: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['OPEN', 'PARTIALLY_PAID', 'PAID'], required: true }, createdBy: { type: String, required: true }, operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
salesInvoiceSchema.index({ companyId: 1, branchId: 1, invoiceNumber: 1 }, { unique: true });
salesInvoiceSchema.index({ companyId: 1, branchId: 1, saleNumber: 1 }, { unique: true });
export const SalesInvoiceModel = model<SalesInvoiceDocument>('SalesInvoice', salesInvoiceSchema);
