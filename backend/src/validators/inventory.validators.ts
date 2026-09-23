import { z } from 'zod';

export const inventoryMovementSchema = z.object({
  productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  warehouseCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().positive().finite(),
  reason: z.string().trim().min(2).max(240),
  reference: z.string().trim().max(80).optional()
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;