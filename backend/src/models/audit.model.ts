import { Schema, model } from 'mongoose';

export interface AuditDocument {
  actorId: string;
  companyId?: string;
  branchId?: string;
  action: string;
  module?: string;
  entity?: string;
  entityId?: string;
  method: string;
  path: string;
  statusCode: number;
  ip?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const auditSchema = new Schema<AuditDocument>({
  actorId: { type: String, required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  action: { type: String, required: true, maxlength: 120 },
  module: { type: String, maxlength: 60 },
  entity: { type: String, maxlength: 80 },
  entityId: { type: String, maxlength: 100 },
  method: { type: String, required: true },
  path: { type: String, required: true, maxlength: 300 },
  statusCode: { type: Number, required: true },
  ip: { type: String, maxlength: 64 },
  requestId: { type: String, maxlength: 100 },
  metadata: { type: Schema.Types.Mixed }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditSchema.index({ companyId: 1, actorId: 1, createdAt: -1 });
auditSchema.index({ companyId: 1, createdAt: -1 });

export const AuditModel = model<AuditDocument>('Audit', auditSchema);
