import { Schema, model, Types } from 'mongoose';

export interface ExpenseDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
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
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  expenseNumber: { type: String, required: true, trim: true, uppercase: true },
  categoryCode: { type: String, required: true, trim: true, uppercase: true },
  description: { type: String, required: true, trim: true, maxlength: 240 },
  amountCents: { type: Number, required: true, min: 1 },
  paidAt: { type: Date, required: true },
  createdBy: { type: String, required: true }
}, { timestamps: true });

expenseSchema.index({ companyId: 1, expenseNumber: 1 }, { unique: true });
expenseSchema.index({ companyId: 1, branchId: 1, paidAt: -1, categoryCode: 1 });

export const ExpenseModel = model<ExpenseDocument>('Expense', expenseSchema);
