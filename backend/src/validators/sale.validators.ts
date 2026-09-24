import { z } from 'zod';

export const createSaleSchema = z.object({
  saleNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  customerCode: z.string().trim().max(40).transform((value) => value.toUpperCase()).optional(),
  warehouseCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  discountBps: z.number().int().min(0).max(10000).default(0),
  taxBps: z.number().int().min(0).max(10000).default(0),
  lines: z.array(z.object({
    productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    quantity: z.number().positive().finite().max(1_000_000_000),
    unitPriceCents: z.number().int().nonnegative().max(2_000_000_000),
    lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
    serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional()
  })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez por venta' });
  input.lines.forEach((line, index) => {
    if (line.serialNumbers && (!Number.isInteger(line.quantity) || line.serialNumbers.length !== line.quantity)) context.addIssue({ code: 'custom', path: ['lines', index, 'serialNumbers'], message: 'Se requiere una serie por unidad entera vendida' });
    if (line.serialNumbers && new Set(line.serialNumbers).size !== line.serialNumbers.length) context.addIssue({ code: 'custom', path: ['lines', index, 'serialNumbers'], message: 'No se permiten series repetidas' });
  });
  const subtotal = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceCents), 0);
  const discount = Math.round(subtotal * input.discountBps / 10000);
  const taxable = subtotal - discount;
  const total = taxable + Math.round(taxable * input.taxBps / 10000);
  if (!Number.isSafeInteger(total)) context.addIssue({ code: 'custom', path: ['lines'], message: 'El total excede el rango monetario seguro' });
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;

export const createSaleReturnSchema = z.object({
  returnNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  reason: z.string().trim().min(2).max(240),
  refundAmountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  refundMethod: z.enum(['CASH', 'CARD', 'TRANSFER']).optional(),
  refundReference: z.string().trim().max(100).optional(),
  lines: z.array(z.object({
    productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    quantity: z.number().positive().finite().max(1_000_000_000),
    lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
    serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional()
  })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez por devolucion' });
  input.lines.forEach((line, index) => {
    if (line.serialNumbers && (!Number.isInteger(line.quantity) || line.serialNumbers.length !== line.quantity)) context.addIssue({ code: 'custom', path: ['lines', index, 'serialNumbers'], message: 'Se requiere una serie por unidad devuelta' });
  });
  if (input.refundAmountCents > 0 && !input.refundMethod) context.addIssue({ code: 'custom', path: ['refundMethod'], message: 'Indica el medio para el reembolso' });
});
export type CreateSaleReturnInput = z.infer<typeof createSaleReturnSchema>;
