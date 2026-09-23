import { Schema, model } from 'mongoose';

export const permissionActions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'CANCEL', 'EXPORT'] as const;
export type PermissionAction = (typeof permissionActions)[number];

export interface PermissionDocument {
  code: string;
  module: string;
  resource: string;
  action: PermissionAction;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<PermissionDocument>({
  code: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  module: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
  resource: { type: String, required: true, trim: true, lowercase: true, maxlength: 60 },
  action: { type: String, enum: permissionActions, required: true },
  description: { type: String, trim: true, maxlength: 240 }
}, { timestamps: true });

permissionSchema.index({ code: 1 }, { unique: true });
permissionSchema.index({ module: 1, resource: 1, action: 1 }, { unique: true });

export const PermissionModel = model<PermissionDocument>('Permission', permissionSchema);
