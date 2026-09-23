import { z } from 'zod';

export const createPaymentSchema = z.object({
  amountCents: z.number().int().positive(),
  method: z.enum(['CASH', 'CARD', 'TRANSFER']),
  reference: z.string().trim().max(100).optional()
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;