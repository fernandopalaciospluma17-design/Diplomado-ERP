import { Schema, model, Types } from 'mongoose';

export interface ConfigurationDocument {
  companyId: Types.ObjectId;
  branchId?: Types.ObjectId;
  key: string;
  value: unknown;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const configurationSchema = new Schema<ConfigurationDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  key: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  value: { type: Schema.Types.Mixed, required: true },
  updatedBy: { type: String, required: true }
}, { timestamps: true });

configurationSchema.index({ companyId: 1, branchId: 1, key: 1 }, { unique: true });

export const ConfigurationModel = model<ConfigurationDocument>('Configuration', configurationSchema);
