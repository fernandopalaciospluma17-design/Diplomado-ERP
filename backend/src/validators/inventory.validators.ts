import { z } from 'zod';

const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
const quantity = z.number().positive().finite().max(1_000_000_000);

export const warehouseLocationSchema = z.object({
  warehouseCode: code,
  code,
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(240).optional()
});
export type WarehouseLocationInput = z.infer<typeof warehouseLocationSchema>;

export const inventoryMovementSchema = z.object({
  productCode: code,
  warehouseCode: code,
  locationCode: code.optional(),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().nonnegative().finite().max(1_000_000_000),
  lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
  expiresAt: z.coerce.date().optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional(),
  reason: z.string().trim().min(2).max(240),
  reference: z.string().trim().max(80).optional()
}).superRefine((input, context) => {
  if (input.type !== 'ADJUSTMENT' && input.quantity <= 0) context.addIssue({ code: 'custom', path: ['quantity'], message: 'Debe ser mayor que cero' });
  if (input.serialNumbers && new Set(input.serialNumbers).size !== input.serialNumbers.length) context.addIssue({ code: 'custom', path: ['serialNumbers'], message: 'No se permiten numeros de serie repetidos' });
  if (input.expiresAt && !input.lotCode) context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'La caducidad requiere un lote' });
});

export type InventoryMovementInput = z.infer<typeof inventoryMovementSchema>;

export const inventoryTransferSchema = z.object({
  transferNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  productCode: code,
  sourceWarehouseCode: code,
  destinationWarehouseCode: code,
  sourceLocationCode: code.optional(),
  destinationLocationCode: code.optional(),
  quantity,
  lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
  expiresAt: z.coerce.date().optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional(),
  reason: z.string().trim().min(2).max(240),
  reference: z.string().trim().max(80).optional()
}).superRefine((input, context) => {
  if (input.sourceWarehouseCode === input.destinationWarehouseCode && input.sourceLocationCode === input.destinationLocationCode) context.addIssue({ code: 'custom', path: ['destinationLocationCode'], message: 'Indica dos ubicaciones distintas para un traslado dentro del mismo almacen' });
  if (input.expiresAt && !input.lotCode) context.addIssue({ code: 'custom', path: ['expiresAt'], message: 'La caducidad requiere un lote' });
  if (input.serialNumbers && new Set(input.serialNumbers).size !== input.serialNumbers.length) context.addIssue({ code: 'custom', path: ['serialNumbers'], message: 'No se permiten numeros de serie repetidos' });
});
export type InventoryTransferInput = z.infer<typeof inventoryTransferSchema>;

export const inventoryCountSchema = z.object({
  countNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  warehouseCode: code,
  locationCode: code.optional(),
  reason: z.string().trim().min(2).max(240),
  lines: z.array(z.object({
    productCode: code,
    countedQuantity: z.number().nonnegative().finite().max(1_000_000_000),
    lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
    expiresAt: z.coerce.date().optional(),
    serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional()
  })).min(1).max(500)
}).superRefine((input, context) => {
  const lineKeys = input.lines.map((line) => `${line.productCode}:${line.lotCode ?? ''}`);
  if (new Set(lineKeys).size !== lineKeys.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Un producto y lote solo pueden aparecer una vez en el conteo' });
  const serialKeys = input.lines.flatMap((line) => line.serialNumbers ?? []);
  if (new Set(serialKeys).size !== serialKeys.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Una serie solo puede aparecer una vez en el conteo' });
  input.lines.forEach((line, index) => {
    if (line.expiresAt && !line.lotCode) context.addIssue({ code: 'custom', path: ['lines', index, 'expiresAt'], message: 'La caducidad requiere un lote' });
  });
});
export type InventoryCountInput = z.infer<typeof inventoryCountSchema>;

export const inventoryReservationSchema = z.object({
  reservationNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  productCode: code,
  warehouseCode: code,
  locationCode: code.optional(),
  quantity,
  lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
  serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional(),
  reason: z.string().trim().min(2).max(240)
}).superRefine((input, context) => {
  if (input.serialNumbers && new Set(input.serialNumbers).size !== input.serialNumbers.length) context.addIssue({ code: 'custom', path: ['serialNumbers'], message: 'No se permiten numeros de serie repetidos' });
});
export type InventoryReservationInput = z.infer<typeof inventoryReservationSchema>;

export const reservationReleaseSchema = z.object({ reason: z.string().trim().min(2).max(240) });
