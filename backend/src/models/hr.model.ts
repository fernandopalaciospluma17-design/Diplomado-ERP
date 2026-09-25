import { Schema, model, Types } from 'mongoose';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface EmployeeDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  userId?: string;
  hiredAt: Date;
  status: EmployeeStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<EmployeeDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  employeeNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  firstName: { type: String, required: true, trim: true, maxlength: 80 },
  lastName: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 40 },
  department: { type: String, trim: true, maxlength: 100 },
  position: { type: String, trim: true, maxlength: 100 },
  userId: { type: String, trim: true },
  hiredAt: { type: Date, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], required: true, default: 'ACTIVE' },
  createdBy: { type: String, required: true }
}, { timestamps: true });
employeeSchema.index({ companyId: 1, branchId: 1, employeeNumber: 1 }, { unique: true });
employeeSchema.index({ companyId: 1, branchId: 1, status: 1, lastName: 1 });

export const EmployeeModel = model<EmployeeDocument>('Employee', employeeSchema);

export interface LeaveRequestDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  requestNumber: string;
  employeeNumber: string;
  type: 'VACATION' | 'SICK' | 'PERSONAL' | 'OTHER';
  startDate: Date;
  endDate: Date;
  reason?: string;
  status: LeaveStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const leaveRequestSchema = new Schema<LeaveRequestDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  requestNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  employeeNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  type: { type: String, enum: ['VACATION', 'SICK', 'PERSONAL', 'OTHER'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], required: true, default: 'PENDING' },
  reviewedBy: { type: String, trim: true },
  reviewedAt: { type: Date },
  createdBy: { type: String, required: true }
}, { timestamps: true });
leaveRequestSchema.index({ companyId: 1, branchId: 1, requestNumber: 1 }, { unique: true });
leaveRequestSchema.index({ companyId: 1, branchId: 1, employeeNumber: 1, startDate: 1, endDate: 1 });

export const LeaveRequestModel = model<LeaveRequestDocument>('LeaveRequest', leaveRequestSchema);

export interface AttendanceDocument {
  companyId: Types.ObjectId;
  branchId: Types.ObjectId;
  employeeNumber: string;
  workDate: string;
  checkIn?: Date;
  checkOut?: Date;
  status: 'PRESENT' | 'ABSENT' | 'REMOTE';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<AttendanceDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  employeeNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  workDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  checkIn: { type: Date },
  checkOut: { type: Date },
  status: { type: String, enum: ['PRESENT', 'ABSENT', 'REMOTE'], required: true },
  notes: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: String, required: true }
}, { timestamps: true });
attendanceSchema.index({ companyId: 1, branchId: 1, employeeNumber: 1, workDate: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, branchId: 1, workDate: 1, status: 1 });

export const AttendanceModel = model<AttendanceDocument>('Attendance', attendanceSchema);