import { describe, expect, it } from 'vitest';
import { createCRMActivitySchema, createLeadSchema, createOpportunitySchema, updateOpportunitySchema } from '../src/validators/crm.validators.js';

describe('CRM validators', () => {
  it('normalizes leads and requires opportunity linkage', () => {
    expect(createLeadSchema.parse({ leadNumber: 'l-1', name: 'Ana' }).leadNumber).toBe('L-1');
    expect(createOpportunitySchema.safeParse({ opportunityNumber: 'o-1', name: 'ERP', amountCents: 200 }).success).toBe(false);
    expect(createOpportunitySchema.parse({ opportunityNumber: 'o-1', leadNumber: 'l-1', name: 'ERP', amountCents: 200 }).leadNumber).toBe('L-1');
    expect(updateOpportunitySchema.safeParse({}).success).toBe(false);
  });

  it('validates entity-linked activities', () => {
    expect(createCRMActivitySchema.safeParse({ activityNumber: 'a-1', entityType: 'LEAD', entityNumber: 'l-1', activityType: 'CALL', description: 'Primer contacto' }).success).toBe(true);
  });
});
