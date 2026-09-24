import { CRMActivityModel, LeadModel, OpportunityModel } from '../models/crm.model.js';
import { getMasterDataModel } from '../models/master-data.model.js';
import type { CompleteActivityInput, CreateCRMActivityInput, CreateLeadInput, CreateOpportunityInput, UpdateLeadInput, UpdateOpportunityInput } from '../validators/crm.validators.js';

type Tenant = { companyId: string; branchId: string };
export class CRMError extends Error {
  constructor(public readonly code: 'CRM_DUPLICATE' | 'LEAD_NOT_FOUND' | 'OPPORTUNITY_NOT_FOUND' | 'ACTIVITY_NOT_FOUND' | 'CRM_REFERENCE_INVALID' | 'CRM_STATE_INVALID') {
    const messages = { CRM_DUPLICATE: 'El identificador CRM ya existe', LEAD_NOT_FOUND: 'Lead no encontrado', OPPORTUNITY_NOT_FOUND: 'Oportunidad no encontrada', ACTIVITY_NOT_FOUND: 'Actividad no encontrada', CRM_REFERENCE_INVALID: 'La referencia CRM no existe en el tenant', CRM_STATE_INVALID: 'La transición CRM solicitada no está permitida' };
    super(messages[code]);
  }
}
export async function listLeads(tenant: Tenant) { return LeadModel.find(tenant).sort({ createdAt: -1 }).limit(200); }
export async function createLead(input: CreateLeadInput, createdBy: string, tenant: Tenant) {
  try { return await LeadModel.create({ ...tenant, ...input, status: 'NEW', createdBy }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new CRMError('CRM_DUPLICATE'); throw error; }
}
export async function updateLead(leadNumber: string, input: UpdateLeadInput, tenant: Tenant) {
  const lead = await LeadModel.findOne({ ...tenant, leadNumber: leadNumber.toUpperCase() });
  if (!lead) throw new CRMError('LEAD_NOT_FOUND');
  const allowed: Record<typeof lead.status, string[]> = { NEW: ['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED'], CONTACTED: ['CONTACTED', 'QUALIFIED', 'DISQUALIFIED'], QUALIFIED: ['QUALIFIED', 'DISQUALIFIED'], DISQUALIFIED: ['DISQUALIFIED'] };
  if (!allowed[lead.status].includes(input.status)) throw new CRMError('CRM_STATE_INVALID');
  Object.assign(lead, input); await lead.save(); return lead;
}
export async function listOpportunities(tenant: Tenant) { return OpportunityModel.find(tenant).sort({ expectedCloseAt: 1, createdAt: -1 }).limit(200); }
export async function createOpportunity(input: CreateOpportunityInput, createdBy: string, tenant: Tenant) {
  if (input.leadNumber && !await LeadModel.exists({ ...tenant, leadNumber: input.leadNumber })) throw new CRMError('CRM_REFERENCE_INVALID');
  if (input.customerCode && !await getMasterDataModel('customers').exists({ companyId: tenant.companyId, code: input.customerCode, status: 'ACTIVE' })) throw new CRMError('CRM_REFERENCE_INVALID');
  try { return await OpportunityModel.create({ ...tenant, ...input, stage: 'DISCOVERY', createdBy }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new CRMError('CRM_DUPLICATE'); throw error; }
}
export async function updateOpportunity(opportunityNumber: string, input: UpdateOpportunityInput, tenant: Tenant) {
  const opportunity = await OpportunityModel.findOne({ ...tenant, opportunityNumber: opportunityNumber.toUpperCase() });
  if (!opportunity) throw new CRMError('OPPORTUNITY_NOT_FOUND');
  if (opportunity.stage === 'WON' || opportunity.stage === 'LOST') throw new CRMError('CRM_STATE_INVALID');
  if (input.stage === 'WON') input.probabilityBps = 10000;
  if (input.stage === 'LOST') input.probabilityBps = 0;
  Object.assign(opportunity, input); await opportunity.save(); return opportunity;
}
export async function listActivities(entityType: 'LEAD' | 'OPPORTUNITY', entityNumber: string, tenant: Tenant) {
  return CRMActivityModel.find({ ...tenant, entityType, entityNumber: entityNumber.toUpperCase() }).sort({ dueAt: 1, createdAt: -1 }).limit(200);
}
export async function createActivity(input: CreateCRMActivityInput, createdBy: string, tenant: Tenant) {
  const exists = input.entityType === 'LEAD'
    ? await LeadModel.exists({ ...tenant, leadNumber: input.entityNumber })
    : await OpportunityModel.exists({ ...tenant, opportunityNumber: input.entityNumber });
  if (!exists) throw new CRMError(input.entityType === 'LEAD' ? 'LEAD_NOT_FOUND' : 'OPPORTUNITY_NOT_FOUND');
  try { return await CRMActivityModel.create({ ...tenant, ...input, status: 'OPEN', createdBy }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new CRMError('CRM_DUPLICATE'); throw error; }
}
export async function completeActivity(activityNumber: string, input: CompleteActivityInput, tenant: Tenant) {
  const activity = await CRMActivityModel.findOne({ ...tenant, activityNumber: activityNumber.toUpperCase() });
  if (!activity) throw new CRMError('ACTIVITY_NOT_FOUND');
  if (activity.status === 'DONE') return activity;
  activity.status = 'DONE'; activity.completedAt = input.completedAt ?? new Date(); await activity.save(); return activity;
}
