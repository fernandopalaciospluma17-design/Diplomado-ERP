import { Schema, model, Types } from 'mongoose';

export interface RoleDocument {
  companyId: Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  permissionIds: Types.ObjectId[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const roleSchema = new Schema<RoleDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 240 },
  permissionIds: [{ type: Schema.Types.ObjectId, ref: 'Permission' }],
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true }
}, { timestamps: true });

roleSchema.index({ companyId: 1, code: 1 }, { unique: true });
roleSchema.index({ companyId: 1, status: 1, name: 1 });

export const RoleModel = model<RoleDocument>('Role', roleSchema);
