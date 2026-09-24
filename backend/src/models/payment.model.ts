import { Schema, model, Types } from 'mongoose';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface PaymentDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  saleNumber: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  receivedBy: string;
  operationId?: Types.ObjectId;
  posSessionNumber?: string;
  paymentNumber?: string;
  createdAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    saleNumber: { type: String, required: true, trim: true, uppercase: true },
    amountCents: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['CASH', 'CARD', 'TRANSFER'], required: true },
    reference: { type: String, trim: true, maxlength: 100 },
    receivedBy: { type: String, required: true },
    operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation' },
    posSessionNumber: { type: String, trim: true, uppercase: true, maxlength: 40 },
    paymentNumber: { type: String, trim: true, uppercase: true, maxlength: 40 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ companyId: 1, branchId: 1, saleNumber: 1, createdAt: -1 });
paymentSchema.index({ companyId: 1, branchId: 1, paymentNumber: 1 }, { unique: true, partialFilterExpression: { paymentNumber: { $type: 'string' } } });

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
