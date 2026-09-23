import { Schema, model } from 'mongoose';

export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER';

export interface PaymentDocument {
  saleNumber: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  receivedBy: string;
  createdAt: Date;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    saleNumber: { type: String, required: true, trim: true, uppercase: true },
    amountCents: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['CASH', 'CARD', 'TRANSFER'], required: true },
    reference: { type: String, trim: true, maxlength: 100 },
    receivedBy: { type: String, required: true }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

paymentSchema.index({ saleNumber: 1, createdAt: -1 });

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);