import { Schema, model, Types } from 'mongoose';

export type PurchaseStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseLine {
  productCode: string;
  quantity: number;
  unitCostCents: number;
  lineTotalCents: number;
  receivedQuantity: number;
  invoicedQuantity: number;
  returnedQuantity: number;
}

export interface PurchaseDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  purchaseNumber: string;
  supplierCode?: string;
  requestNumber?: string;
  quoteNumber?: string;
  warehouseCode: string;
  lines: PurchaseLine[];
  subtotalCents: number;
  totalCents: number;
  status: PurchaseStatus;
  cancellationReason?: string;
  approvalReason?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseLineSchema = new Schema<PurchaseLine>(
  {
    productCode: { type: String, required: true, trim: true, uppercase: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    unitCostCents: { type: Number, required: true, min: 0 },
    lineTotalCents: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, required: true, min: 0, default: 0 },
    invoicedQuantity: { type: Number, required: true, min: 0, default: 0 },
    returnedQuantity: { type: Number, required: true, min: 0, default: 0 }
  },
  { _id: false }
);

const purchaseSchema = new Schema<PurchaseDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    purchaseNumber: { type: String, required: true, trim: true, uppercase: true },
    supplierCode: { type: String, trim: true, uppercase: true },
    requestNumber: { type: String, trim: true, uppercase: true },
    quoteNumber: { type: String, trim: true, uppercase: true },
    warehouseCode: { type: String, required: true, trim: true, uppercase: true },
    lines: { type: [purchaseLineSchema], required: true, validate: (lines: PurchaseLine[]) => lines.length > 0 },
    subtotalCents: { type: Number, required: true, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'], default: 'PENDING_APPROVAL', required: true },
    cancellationReason: { type: String, trim: true, maxlength: 240 },
    approvalReason: { type: String, trim: true, maxlength: 240 }, approvedBy: { type: String }, approvedAt: { type: Date },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
);

purchaseSchema.index({ companyId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ companyId: 1, branchId: 1, createdAt: -1, status: 1 });

export const PurchaseModel = model<PurchaseDocument>('Purchase', purchaseSchema);

export interface PurchaseReceiptLine {
  productCode: string;
  quantity: number;
  unitCostCents: number;
  lineTotalCents: number;
  lotCode?: string;
  expiresAt?: Date;
  serialNumbers?: string[];
}
export interface PurchaseReceiptDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  purchaseNumber: string;
  receiptNumber: string;
  warehouseCode: string;
  locationCode?: string;
  lines: PurchaseReceiptLine[];
  totalCostCents: number;
  createdBy: string;
  operationId: Types.ObjectId;
  createdAt: Date;
}
const purchaseReceiptLineSchema = new Schema<PurchaseReceiptLine>({
  productCode: { type: String, required: true, trim: true, uppercase: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  unitCostCents: { type: Number, required: true, min: 0 },
  lineTotalCents: { type: Number, required: true, min: 0 },
  lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 },
  expiresAt: { type: Date },
  serialNumbers: { type: [String], default: undefined }
}, { _id: false });
const purchaseReceiptSchema = new Schema<PurchaseReceiptDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  purchaseNumber: { type: String, required: true, trim: true, uppercase: true },
  receiptNumber: { type: String, required: true, trim: true, uppercase: true },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true },
  locationCode: { type: String, trim: true, uppercase: true, maxlength: 40 },
  lines: { type: [purchaseReceiptLineSchema], required: true, validate: (lines: PurchaseReceiptLine[]) => lines.length > 0 },
  totalCostCents: { type: Number, required: true, min: 0 },
  createdBy: { type: String, required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
purchaseReceiptSchema.index({ companyId: 1, branchId: 1, receiptNumber: 1 }, { unique: true });
purchaseReceiptSchema.index({ companyId: 1, branchId: 1, purchaseNumber: 1, createdAt: -1 });
export const PurchaseReceiptModel = model<PurchaseReceiptDocument>('PurchaseReceipt', purchaseReceiptSchema);

export type PurchaseInvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
export interface PurchaseInvoiceLine { productCode: string; quantity: number; unitCostCents: number; lineTotalCents: number; creditedQuantity: number }
export interface PurchaseInvoiceDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; invoiceNumber: string; purchaseNumber: string; supplierCode: string; issuedAt: Date; dueAt?: Date;
  lines: PurchaseInvoiceLine[]; subtotalCents: number; taxCents: number; totalCents: number; paidCents: number; creditedCents: number; creditedTaxCents: number; outstandingCents: number;
  status: PurchaseInvoiceStatus; createdBy: string; operationId: Types.ObjectId; createdAt: Date; updatedAt: Date;
}
const purchaseInvoiceLineSchema = new Schema<PurchaseInvoiceLine>({
  productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 },
  unitCostCents: { type: Number, required: true, min: 0 }, lineTotalCents: { type: Number, required: true, min: 0 }, creditedQuantity: { type: Number, required: true, min: 0, default: 0 }
}, { _id: false });
const purchaseInvoiceSchema = new Schema<PurchaseInvoiceDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  invoiceNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, purchaseNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  supplierCode: { type: String, required: true, trim: true, uppercase: true }, issuedAt: { type: Date, required: true }, dueAt: { type: Date },
  lines: { type: [purchaseInvoiceLineSchema], required: true, validate: (lines: PurchaseInvoiceLine[]) => lines.length > 0 },
  subtotalCents: { type: Number, required: true, min: 0 }, taxCents: { type: Number, required: true, min: 0 }, totalCents: { type: Number, required: true, min: 0 },
  paidCents: { type: Number, required: true, min: 0, default: 0 }, creditedCents: { type: Number, required: true, min: 0, default: 0 }, creditedTaxCents: { type: Number, required: true, min: 0, default: 0 }, outstandingCents: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['OPEN', 'PARTIALLY_PAID', 'PAID'], required: true, default: 'OPEN' }, createdBy: { type: String, required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: true });
purchaseInvoiceSchema.index({ companyId: 1, branchId: 1, invoiceNumber: 1 }, { unique: true });
purchaseInvoiceSchema.index({ companyId: 1, branchId: 1, supplierCode: 1, dueAt: 1, status: 1 });
purchaseInvoiceSchema.index({ companyId: 1, branchId: 1, purchaseNumber: 1, createdAt: -1 });
export const PurchaseInvoiceModel = model<PurchaseInvoiceDocument>('PurchaseInvoice', purchaseInvoiceSchema);

export interface SupplierPaymentDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; paymentNumber: string; invoiceNumber: string; amountCents: number; methodCode: string;
  reference?: string; paidAt: Date; createdBy: string; operationId: Types.ObjectId; createdAt: Date;
}
const supplierPaymentSchema = new Schema<SupplierPaymentDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  paymentNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, invoiceNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  amountCents: { type: Number, required: true, min: 1 }, methodCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  reference: { type: String, trim: true, maxlength: 100 }, paidAt: { type: Date, required: true }, createdBy: { type: String, required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
supplierPaymentSchema.index({ companyId: 1, branchId: 1, paymentNumber: 1 }, { unique: true });
supplierPaymentSchema.index({ companyId: 1, branchId: 1, invoiceNumber: 1, paidAt: -1 });
export const SupplierPaymentModel = model<SupplierPaymentDocument>('SupplierPayment', supplierPaymentSchema);

export interface PurchaseReturnLine { productCode: string; quantity: number; unitCostCents: number; lineTotalCents: number; lotCode?: string; serialNumbers?: string[]; locationCode?: string }
export interface PurchaseReturnDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; returnNumber: string; purchaseNumber: string; invoiceNumber: string; creditNoteNumber: string;
  warehouseCode: string; reason: string; lines: PurchaseReturnLine[]; subtotalCents: number; taxCreditCents: number; totalCreditCents: number;
  createdBy: string; operationId: Types.ObjectId; createdAt: Date;
}
const purchaseReturnLineSchema = new Schema<PurchaseReturnLine>({
  productCode: { type: String, required: true, trim: true, uppercase: true }, quantity: { type: Number, required: true, min: 0.000001 },
  unitCostCents: { type: Number, required: true, min: 0 }, lineTotalCents: { type: Number, required: true, min: 0 },
  lotCode: { type: String, trim: true, uppercase: true, maxlength: 80 }, serialNumbers: { type: [String], default: undefined }, locationCode: { type: String, trim: true, uppercase: true, maxlength: 40 }
}, { _id: false });
const purchaseReturnSchema = new Schema<PurchaseReturnDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  returnNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, purchaseNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  invoiceNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, creditNoteNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  warehouseCode: { type: String, required: true, trim: true, uppercase: true }, reason: { type: String, required: true, trim: true, maxlength: 240 },
  lines: { type: [purchaseReturnLineSchema], required: true, validate: (lines: PurchaseReturnLine[]) => lines.length > 0 },
  subtotalCents: { type: Number, required: true, min: 0 }, taxCreditCents: { type: Number, required: true, min: 0 }, totalCreditCents: { type: Number, required: true, min: 0 },
  createdBy: { type: String, required: true }, operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
purchaseReturnSchema.index({ companyId:  1, branchId: 1, returnNumber: 1 }, { unique: true });
purchaseReturnSchema.index({ companyId: 1, branchId: 1, purchaseNumber: 1, createdAt: -1 });
export const PurchaseReturnModel = model<PurchaseReturnDocument>('PurchaseReturn', purchaseReturnSchema);

export type SupplierCreditStatus = 'OPEN' | 'PARTIALLY_APPLIED' | 'APPLIED';
export interface SupplierCreditNoteDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; creditNoteNumber: string; supplierCode: string; purchaseNumber: string; returnNumber: string;
  invoiceNumber: string; amountCents: number; appliedCents: number; remainingCents: number; applications: { invoiceNumber: string; amountCents: number }[]; status: SupplierCreditStatus; createdBy: string; operationId: Types.ObjectId; createdAt: Date; updatedAt: Date;
}
const supplierCreditNoteSchema = new Schema<SupplierCreditNoteDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  creditNoteNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, supplierCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  purchaseNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, returnNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  invoiceNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, amountCents: { type: Number, required: true, min: 0 },
  appliedCents: { type: Number, required: true, min: 0, default: 0 }, remainingCents: { type: Number, required: true, min: 0 },
  applications: { type: [{ invoiceNumber: { type: String, required: true, trim: true, uppercase: true }, amountCents: { type: Number, required: true, min: 1 } }], default: [] },
  status: { type: String, enum: ['OPEN', 'PARTIALLY_APPLIED', 'APPLIED'], required: true, default: 'OPEN' }, createdBy: { type: String, required: true },
  operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: true });
supplierCreditNoteSchema.index({ companyId: 1, branchId: 1, creditNoteNumber: 1 }, { unique: true });
supplierCreditNoteSchema.index({ companyId: 1, branchId: 1, supplierCode: 1, status: 1 });
export const SupplierCreditNoteModel = model<SupplierCreditNoteDocument>('SupplierCreditNote', supplierCreditNoteSchema);
