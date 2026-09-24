import { Schema, model, Types } from 'mongoose';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DISQUALIFIED';
export interface LeadDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; leadNumber: string; name: string; companyName?: string; email?: string; phone?: string; source?: string; status: LeadStatus; assignedTo?: string; notes?: string; createdBy: string; createdAt: Date; updatedAt: Date;
}
const leadSchema = new Schema<LeadDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true }, leadNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 }, companyName: { type: String, trim: true, maxlength: 120 }, email: { type: String, trim: true, lowercase: true, maxlength: 254 }, phone: { type: String, trim: true, maxlength: 40 },
  source: { type: String, trim: true, maxlength: 80 }, status: { type: String, enum: ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED'], required: true, default: 'NEW' }, assignedTo: { type: String, trim: true, maxlength: 80 }, notes: { type: String, trim: true, maxlength: 1000 }, createdBy: { type: String, required: true }
}, { timestamps: true });
leadSchema.index({ companyId: 1, branchId: 1, leadNumber: 1 }, { unique: true });
leadSchema.index({ companyId: 1, branchId: 1, status: 1, createdAt: -1 });
export const LeadModel = model<LeadDocument>('Lead', leadSchema);

export type OpportunityStage = 'DISCOVERY' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
export interface OpportunityDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; opportunityNumber: string; leadNumber?: string; customerCode?: string; name: string; amountCents: number; probabilityBps: number; expectedCloseAt?: Date; stage: OpportunityStage; notes?: string; createdBy: string; createdAt: Date; updatedAt: Date;
}
const opportunitySchema = new Schema<OpportunityDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true }, opportunityNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  leadNumber: { type: String, trim: true, uppercase: true, maxlength: 40 }, customerCode: { type: String, trim: true, uppercase: true, maxlength: 40 }, name: { type: String, required: true, trim: true, maxlength: 160 }, amountCents: { type: Number, required: true, min: 0 },
  probabilityBps: { type: Number, required: true, min: 0, max: 10000, default: 0 }, expectedCloseAt: { type: Date }, stage: { type: String, enum: ['DISCOVERY', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'], required: true, default: 'DISCOVERY' }, notes: { type: String, trim: true, maxlength: 1000 }, createdBy: { type: String, required: true }
}, { timestamps: true });
opportunitySchema.index({ companyId: 1, branchId: 1, opportunityNumber: 1 }, { unique: true });
opportunitySchema.index({ companyId: 1, branchId: 1, stage: 1, expectedCloseAt: 1 });
export const OpportunityModel = model<OpportunityDocument>('Opportunity', opportunitySchema);

export interface CRMActivityDocument {
  companyId: Types.ObjectId; branchId: Types.ObjectId; activityNumber: string; entityType: 'LEAD' | 'OPPORTUNITY'; entityNumber: string; activityType: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE'; description: string; dueAt?: Date; completedAt?: Date; status: 'OPEN' | 'DONE'; createdBy: string; createdAt: Date; updatedAt: Date;
}
const activitySchema = new Schema<CRMActivityDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true }, branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true }, activityNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  entityType: { type: String, enum: ['LEAD', 'OPPORTUNITY'], required: true }, entityNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 }, activityType: { type: String, enum: ['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE'], required: true },
  description: { type: String, required: true, trim: true, maxlength: 1000 }, dueAt: { type: Date }, completedAt: { type: Date }, status: { type: String, enum: ['OPEN', 'DONE'], required: true, default: 'OPEN' }, createdBy: { type: String, required: true }
}, { timestamps: true });
activitySchema.index({ companyId: 1, branchId: 1, activityNumber: 1 }, { unique: true });
activitySchema.index({ companyId: 1, branchId: 1, entityType: 1, entityNumber: 1, dueAt: 1 });
export const CRMActivityModel = model<CRMActivityDocument>('CRMActivity', activitySchema);
