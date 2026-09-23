import { z } from 'zod';

export const createSaleSchema = z.object({
  saleNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  customerCode: z.string().trim().max(40).transform((value) => value.toUpperCase()).optional(),
  warehouseCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  lines: z.array(z.object({
    productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    quantity: z.number().int().positive(),
    unitPriceCents: z.number().int().nonnegative()
  })).min(1).max(100)
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;