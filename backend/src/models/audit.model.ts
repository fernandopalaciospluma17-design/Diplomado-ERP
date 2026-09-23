import { Schema, model } from 'mongoose';

export interface AuditDocument {
  actorId: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  createdAt: Date;
}

const auditSchema = new Schema<AuditDocument>({
  actorId: { type: String, required: true },
  action: { type: String, required: true, maxlength: 120 },
  method: { type: String, required: true },
  path: { type: String, required: true, maxlength: 300 },
  statusCode: { type: Number, required: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditSchema.index({ actorId: 1, createdAt: -1 });
auditSchema.index({ createdAt: -1 });

export const AuditModel = model<AuditDocument>('Audit', auditSchema);