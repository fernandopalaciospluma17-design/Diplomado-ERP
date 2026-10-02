import { Schema, model, Types } from 'mongoose';

export type UserStatus = 'PENDING_CONFIRMATION' | 'ACTIVE' | 'INACTIVE';

export interface UserDocument {
  name: string;
  email: string;
  passwordHash?: string;
  emailConfirmationTokenHash?: string;
  emailConfirmationExpiresAt?: Date;
  emailConfirmedAt?: Date;
  companyId?: Types.ObjectId;
  branchId?: Types.ObjectId;
  roleId?: string;
  status: UserStatus;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    emailConfirmationTokenHash: { type: String, select: false },
    emailConfirmationExpiresAt: { type: Date, select: false },
    emailConfirmedAt: { type: Date },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    roleId: { type: String },
    status: { type: String, enum: ['PENDING_CONFIRMATION', 'ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    lastLogin: { type: Date }
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ emailConfirmationTokenHash: 1 }, { sparse: true });
userSchema.index({ companyId: 1, branchId: 1, status: 1 });

export const UserModel = model<UserDocument>('User', userSchema);
