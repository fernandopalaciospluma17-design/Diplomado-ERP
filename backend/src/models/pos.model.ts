import { Schema, model, Types } from 'mongoose';

export interface POSSessionDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; sessionNumber: string; terminalCode: string; openedBy: string; openedAt: Date; openingCashCents: number;
  cashSalesCents: number; nonCashSalesCents: number; status: 'OPEN' | 'CLOSED'; closedBy?: string; closedAt?: Date; countedCashCents?: number; expectedCashCents?: number; cashDifferenceCents?: number;
}
const posSessionSchema = new Schema<POSSessionDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  sessionNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, terminalCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  openedBy: { type: String, required: true }, openedAt: { type: Date, required: true }, openingCashCents: { type: Number, required: true, min: 0 },
  cashSalesCents: { type: Number, required: true, min: 0, default: 0 }, nonCashSalesCents: { type: Number, required: true, min: 0, default: 0 },
  status: { type: String, enum: ['OPEN', 'CLOSED'], required: true, default: 'OPEN' }, closedBy: { type: String }, closedAt: { type: Date },
  countedCashCents: { type: Number, min: 0 }, expectedCashCents: { type: Number, min: 0 }, cashDifferenceCents: { type: Number }
}, { timestamps: true });
posSessionSchema.index({ companyId: 1, branchId: 1, sessionNumber: 1 }, { unique: true });
posSessionSchema.index({ companyId: 1, branchId: 1, terminalCode: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'OPEN' } });
export const POSSessionModel = model<POSSessionDocument>('POSSession', posSessionSchema, 'pos_sessions');

export interface POSTicketDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; ticketNumber: string; sessionNumber: string; saleNumber: string; paymentNumber: string;
  totalCents: number; paymentMethod: 'CASH' | 'CARD' | 'TRANSFER'; createdBy: string; operationId: Types.ObjectId; createdAt: Date;
}
const posTicketSchema = new Schema<POSTicketDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  ticketNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, sessionNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  saleNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, paymentNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  totalCents: { type: Number, required: true, min: 0 }, paymentMethod: { type: String, enum: ['CASH', 'CARD', 'TRANSFER'], required: true }, createdBy: { type: String, required: true }, operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
posTicketSchema.index({ companyId: 1, branchId: 1, ticketNumber: 1 }, { unique: true });
posTicketSchema.index({ companyId: 1, branchId: 1, sessionNumber: 1, createdAt: -1 });
export const POSTicketModel = model<POSTicketDocument>('POSTicket', posTicketSchema);
