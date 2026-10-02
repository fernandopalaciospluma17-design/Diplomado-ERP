import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().transform((value) => value.toLowerCase()),
  roleId: z.string().regex(/^[a-f\d]{24}$/i)
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const confirmAccountSchema = z.object({
  token: z.string().min(32).max(128),
  password: z.string().min(8).max(128)
});

export type ConfirmAccountInput = z.infer<typeof confirmAccountSchema>;

export const resendInvitationParamsSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i)
});
