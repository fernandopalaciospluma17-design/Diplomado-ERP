import { Schema, model, Types } from 'mongoose';

export interface SessionDocument {
  userId: Types.ObjectId;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  tokenVersion: number;
  expiresAt: Date;
  revokedAt?: Date;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const sessionSchema = new Schema<SessionDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
  tokenVersion: { type: Number, required: true, default: 1 },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date },
  ip: { type: String, maxlength: 64 },
  userAgent: { type: String, maxlength: 300 }
}, { timestamps: { createdAt: true, updatedAt: false } });

sessionSchema.index({ userId: 1, createdAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SessionModel = model<SessionDocument>('Session', sessionSchema);
