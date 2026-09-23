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
    receivedBy: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ companyId: 1, branchId: 1, saleNumber: 1, createdAt: -1 });

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
