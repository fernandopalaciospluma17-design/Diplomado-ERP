import { describe, expect, it } from 'vitest';
import { permissionActions } from '../src/models/permission.model.js';
import { createBranchSchema, createRoleSchema, setConfigurationSchema } from '../src/validators/core.validators.js';

describe('Core ERP validators', () => {
  it('normalizes branch codes', () => {
    expect(createBranchSchema.parse({ code: ' main ', name: 'Principal' }).code).toBe('MAIN');
  });

  it('uses the supported permission action vocabulary', () => {
    expect(permissionActions).toEqual(['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'CANCEL', 'EXPORT']);
  });

  it('requires Mongo ObjectId values when assigning role permissions', () => {
    expect(createRoleSchema.safeParse({ code: 'CASHIER', name: 'Cajero', permissionIds: ['a'.repeat(24)] }).success).toBe(true);
    expect(createRoleSchema.safeParse({ code: 'CASHIER', name: 'Cajero', permissionIds: ['not-an-id'] }).success).toBe(false);
  });

  it('accepts JSON configuration values', () => {
    expect(setConfigurationSchema.parse({ value: { timezone: 'America/Mexico_City' } })).toEqual({ value: { timezone: 'America/Mexico_City' } });
    expect(setConfigurationSchema.safeParse({}).success).toBe(false);
  });
});
