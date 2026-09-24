import { z } from 'zod';
const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
export const createLeadSchema = z.object({
  leadNumber: code, name: z.string().trim().min(2).max(120), companyName: z.string().trim().max(120).optional(), email: z.string().trim().email().max(254).optional(), phone: z.string().trim().max(40).optional(), source: z.string().trim().max(80).optional(), assignedTo: z.string().trim().max(80).optional(), notes: z.string().trim().max(1000).optional()
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export const updateLeadSchema = z.object({ status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'DISQUALIFIED']), notes: z.string().trim().max(1000).optional(), assignedTo: z.string().trim().max(80).optional() });
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export const createOpportunitySchema = z.object({
  opportunityNumber: code, leadNumber: code.optional(), customerCode: code.optional(), name: z.string().trim().min(2).max(160), amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), probabilityBps: z.number().int().min(0).max(10000).default(0), expectedCloseAt: z.coerce.date().optional(), notes: z.string().trim().max(1000).optional()
}).refine((value) => value.leadNumber || value.customerCode, { path: ['leadNumber'], message: 'La oportunidad requiere un lead o cliente' });
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export const updateOpportunitySchema = z.object({ stage: z.enum(['DISCOVERY', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']).optional(), amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(), probabilityBps: z.number().int().min(0).max(10000).optional(), expectedCloseAt: z.coerce.date().optional(), notes: z.string().trim().max(1000).optional() }).refine((value) => Object.keys(value).length > 0, 'Incluye al menos un campo para actualizar');
export type UpdateOpportunityInput = z.infer<typeof updateOpportunitySchema>;
export const createCRMActivitySchema = z.object({
  activityNumber: code, entityType: z.enum(['LEAD', 'OPPORTUNITY']), entityNumber: code, activityType: z.enum(['CALL', 'EMAIL', 'MEETING', 'TASK', 'NOTE']), description: z.string().trim().min(2).max(1000), dueAt: z.coerce.date().optional()
});
export type CreateCRMActivityInput = z.infer<typeof createCRMActivitySchema>;
export const listCRMActivitiesSchema = z.object({ entityType: z.enum(['LEAD', 'OPPORTUNITY']), entityNumber: code });
export const completeCRMActivitySchema = z.object({ completedAt: z.coerce.date().optional() });
export type CompleteActivityInput = z.infer<typeof completeCRMActivitySchema>;
