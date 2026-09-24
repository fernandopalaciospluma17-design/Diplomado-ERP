import { Router } from 'express';
import { completeActivityController, createActivityController, createLeadController, createOpportunityController, listActivitiesController, listLeadsController, listOpportunitiesController, updateLeadController, updateOpportunityController } from '../controllers/crm.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const crmRouter = Router();
crmRouter.get('/leads', requireAuth, requirePermission('crm.lead.read'), listLeadsController);
crmRouter.post('/leads', requireAuth, requirePermission('crm.lead.create'), auditAction('CRM_LEAD_CREATE'), createLeadController);
crmRouter.patch('/leads/:leadNumber', requireAuth, requirePermission('crm.lead.update'), auditAction('CRM_LEAD_UPDATE'), updateLeadController);
crmRouter.get('/opportunities', requireAuth, requirePermission('crm.opportunity.read'), listOpportunitiesController);
crmRouter.post('/opportunities', requireAuth, requirePermission('crm.opportunity.create'), auditAction('CRM_OPPORTUNITY_CREATE'), createOpportunityController);
crmRouter.patch('/opportunities/:opportunityNumber', requireAuth, requirePermission('crm.opportunity.update'), auditAction('CRM_OPPORTUNITY_UPDATE'), updateOpportunityController);
crmRouter.get('/activities', requireAuth, requirePermission('crm.activity.read'), listActivitiesController);
crmRouter.post('/activities', requireAuth, requirePermission('crm.activity.create'), auditAction('CRM_ACTIVITY_CREATE'), createActivityController);
crmRouter.post('/activities/:activityNumber/complete', requireAuth, requirePermission('crm.activity.update'), auditAction('CRM_ACTIVITY_COMPLETE'), completeActivityController);
