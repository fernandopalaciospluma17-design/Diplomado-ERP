import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  roleId: z.string().trim().min(1).max(80),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export type CreateUserInput = z.infer<typeof createUserSchema>;