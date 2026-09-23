import { z } from 'zod';

export const createPurchaseSchema = z.object({
  purchaseNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  supplierCode: z.string().trim().max(40).transform((value) => value.toUpperCase()).optional(),
  warehouseCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  lines: z.array(z.object({
    productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    quantity: z.number().int().positive(),
    unitCostCents: z.number().int().nonnegative()
  })).min(1).max(100)
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;