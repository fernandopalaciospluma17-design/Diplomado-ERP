import { Schema, model } from 'mongoose';

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export interface CompanyDocument {
  code: string;
  legalName: string;
  name: string;
  taxId?: string;
  status: CompanyStatus;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<CompanyDocument>({
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  legalName: { type: String, required: true, trim: true, maxlength: 180 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  taxId: { type: String, trim: true, uppercase: true, maxlength: 40 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true }
}, { timestamps: true });

companySchema.index({ code: 1 }, { unique: true });
companySchema.index({ taxId: 1 }, { unique: true, sparse: true });

export const CompanyModel = model<CompanyDocument>('Company', companySchema);
