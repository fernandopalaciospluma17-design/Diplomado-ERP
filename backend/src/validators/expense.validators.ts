import { z } from 'zod';

export const createExpenseSchema = z.object({
  expenseNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  categoryCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  description: z.string().trim().min(2).max(240),
  amountCents: z.number().int().positive(),
  paidAt: z.coerce.date()
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;