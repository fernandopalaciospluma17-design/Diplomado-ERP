import { z } from 'zod';
import { createSaleSchema } from './sale.validators.js';
const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
export const openPOSessionSchema = z.object({ sessionNumber: code, terminalCode: code, openingCashCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
export type OpenPOSessionInput = z.infer<typeof openPOSessionSchema>;
export const createPOSTicketSchema = z.object({
  ticketNumber: code, sessionNumber: code, paymentNumber: code, paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER']), reference: z.string().trim().max(100).optional(), sale: createSaleSchema
});
export type CreatePOSTicketInput = z.infer<typeof createPOSTicketSchema>;
export const closePOSessionSchema = z.object({ countedCashCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) });
export type ClosePOSessionInput = z.infer<typeof closePOSessionSchema>;
