import { z } from 'zod';

const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
const status = z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE');

export const createBranchSchema = z.object({
  code,
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).optional(),
  status
});
export const updateCompanySchema = z.object({
  code,
  legalName: z.string().trim().min(2).max(180),
  name: z.string().trim().min(2).max(120),
  taxId: z.string().trim().max(40).transform((value) => value.toUpperCase()).optional(),
  status
}).partial().refine((input) => Object.keys(input).length > 0);
export const updateBranchSchema = createBranchSchema.partial().refine((input) => Object.keys(input).length > 0);

export const createRoleSchema = z.object({
  code,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(240).optional(),
  permissionIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(300).default([]),
  status
});

export const updateRoleSchema = createRoleSchema.partial().refine((input) => Object.keys(input).length > 0);
export const setConfigurationSchema = z.object({ value: z.unknown().refine((value) => value !== undefined, 'value es obligatorio') });
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;
