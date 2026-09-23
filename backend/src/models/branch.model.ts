import { Schema, model, Types } from 'mongoose';

export type BranchStatus = 'ACTIVE' | 'INACTIVE';

export interface BranchDocument {
  companyId: Types.ObjectId;
  code: string;
  name: string;
  address?: string;
  status: BranchStatus;
  createdAt: Date;
  updatedAt: Date;
}

const branchSchema = new Schema<BranchDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  address: { type: String, trim: true, maxlength: 300 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true }
}, { timestamps: true });

branchSchema.index({ companyId:  1, code: 1 }, { unique: true });
branchSchema.index({ companyId: 1, status: 1, name: 1 });

export const BranchModel = model<BranchDocument>('Branch', branchSchema);
