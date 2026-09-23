import { Schema, model } from 'mongoose';

export interface ExpenseDocument {
  expenseNumber: string;
  categoryCode: string;
  description: string;
  amountCents: number;
  paidAt: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<ExpenseDocument>({
  expenseNumber: { type: String, required: true, trim: true, uppercase: true },
  categoryCode: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, required: true, trim: true, maxlength: 240 },
  amountCents: { type: Number, required: true, min: 1 },
  paidAt: { type: Date, required: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

expenseSchema.index({ expenseNumber: 1 }, { unique: true });
expenseSchema.index({ paidAt: -1, categoryCode: 1 });

export const ExpenseModel = model<ExpenseDocument>('Expense', expenseSchema);