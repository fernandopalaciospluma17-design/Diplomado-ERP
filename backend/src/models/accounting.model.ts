import { Schema, model, Types } from 'mongoose';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';
export interface AccountDocument {
  companyId: Types.ObjectId; code: string; name: string; type: AccountType; normalBalance: NormalBalance; parentCode?: string; postable: boolean; status: 'ACTIVE' | 'INACTIVE'; createdAt: Date; updatedAt: Date;
}
const accountSchema = new Schema<AccountDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  name: { type: String, required: true, trim: true, maxlength: 120 }, type: { type: String, enum: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'], required: true },
  normalBalance: { type: String, enum: ['DEBIT', 'CREDIT'], required: true }, parentCode: { type: String, trim: true, uppercase: true, maxlength: 20 },
  postable: { type: Boolean, required: true, default: true }, status: { type: String, enum: ['ACTIVE', 'INACTIVE'], required: true, default: 'ACTIVE' }
}, { timestamps: true });
accountSchema.index({ companyId: 1, code: 1 }, { unique: true });
accountSchema.index({ companyId: 1, parentCode: 1, status: 1 });
export const AccountModel = model<AccountDocument>('Account', accountSchema);

export interface AccountingPeriodDocument {
  companyId: Types.ObjectId; periodNumber: string; startAt: Date; endAt: Date; status: 'OPEN' | 'CLOSED'; entryCount: number; closedBy?: string; closedAt?: Date; closeReason?: string; createdAt: Date; updatedAt: Date;
}
const accountingPeriodSchema = new Schema<AccountingPeriodDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, periodNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  startAt: { type: Date, required: true }, endAt: { type: Date, required: true }, status: { type: String, enum: ['OPEN', 'CLOSED'], required: true, default: 'OPEN' },
  entryCount: { type: Number, required: true, min: 0, default: 0 }, closedBy: { type: String }, closedAt: { type: Date }, closeReason: { type: String, trim: true, maxlength: 240 }
}, { timestamps: true });
accountingPeriodSchema.index({ companyId: 1, periodNumber: 1 }, { unique: true });
accountingPeriodSchema.index({ companyId: 1, startAt: 1, endAt: 1, status: 1 });
export const AccountingPeriodModel = model<AccountingPeriodDocument>('AccountingPeriod', accountingPeriodSchema);

export interface JournalLine { accountCode: string; description?: string; debitCents: number; creditCents: number }
export interface JournalEntryDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; entryNumber: string; periodNumber: string; entryAt: Date; description: string; sourceType?: string; sourceId?: string;
  lines: JournalLine[]; totalDebitCents: number; totalCreditCents: number; status: 'POSTED'; postedBy: string; postedAt: Date; operationId: Types.ObjectId; createdAt: Date;
}
const journalLineSchema = new Schema<JournalLine>({
  accountCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 }, description: { type: String, trim: true, maxlength: 240 },
  debitCents: { type: Number, required: true, min: 0 }, creditCents: { type: Number, required: true, min: 0 }
}, { _id: false });
const journalEntrySchema = new Schema<JournalEntryDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  entryNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, periodNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
  entryAt: { type: Date, required: true }, description: { type: String, required: true, trim: true, maxlength: 240 }, sourceType: { type: String, trim: true, uppercase: true, maxlength: 40 }, sourceId: { type: String, trim: true, uppercase: true, maxlength: 80 },
  lines: { type: [journalLineSchema], required: true, validate: (lines: JournalLine[]) => lines.length >= 2 },
  totalDebitCents: { type: Number, required: true, min: 0 }, totalCreditCents: { type: Number, required: true, min: 0 }, status: { type: String, enum: ['POSTED'], required: true, default: 'POSTED' },
  postedBy: { type: String, required: true }, postedAt: { type: Date, required: true }, operationId: { type: Schema.Types.ObjectId, ref: 'InventoryOperation', required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });
journalEntrySchema.index({ companyId:  1, branchId: 1, entryNumber: 1 }, { unique: true });
journalEntrySchema.index({ companyId: 1, branchId: 1, entryAt: 1, status: 1 });
journalEntrySchema.index({ companyId: 1, sourceType: 1, sourceId: 1 }, { unique: true, partialFilterExpression: { sourceType: { $type: 'string' }, sourceId: { $type: 'string' } } });
export const JournalEntryModel = model<JournalEntryDocument>('JournalEntry', journalEntrySchema);
