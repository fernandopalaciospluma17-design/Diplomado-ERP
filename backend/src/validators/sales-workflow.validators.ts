import { z } from 'zod';

const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
const orderLine = z.object({ productCode: code, quantity: z.number().positive().finite().max(1_000_000_000), unitPriceCents: z.number().int().nonnegative().max(2_000_000_000) });
const planFields = {
  customerCode: code.optional(), warehouseCode: code,
  discountBps: z.number().int().min(0).max(10000).default(0), taxBps: z.number().int().min(0).max(10000).default(0),
  lines: z.array(orderLine).min(1).max(100)
};
function validatePlan(input: { lines: { productCode: string; quantity: number; unitPriceCents: number }[]; discountBps: number; taxBps: number }, context: z.RefinementCtx) {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez en el documento' });
  const subtotal = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceCents), 0);
  const net = subtotal - Math.round(subtotal * input.discountBps / 10000);
  if (!Number.isSafeInteger(net + Math.round(net * input.taxBps / 10000))) context.addIssue({ code: 'custom', path: ['lines'], message: 'El total excede el rango monetario seguro' });
}
export const createSalesQuoteSchema = z.object({ quoteNumber: code, ...planFields, validUntil: z.coerce.date() }).superRefine((input, context) => validatePlan(input, context));
export type CreateSalesQuoteInput = z.infer<typeof createSalesQuoteSchema>;
export const createSalesOrderSchema = z.object({ orderNumber: code, ...planFields }).superRefine((input, context) => validatePlan(input, context));
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export const convertSalesQuoteSchema = z.object({ orderNumber: code });
export type ConvertSalesQuoteInput = z.infer<typeof convertSalesQuoteSchema>;
export const createSalesDeliverySchema = z.object({
  deliveryNumber: code, saleNumber: code,
  lines: z.array(z.object({ productCode: code, quantity: z.number().positive().finite().max(1_000_000_000), lotCode: code.optional(), serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional() })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez por entrega' });
  input.lines.forEach((line, index) => {
    if (line.serialNumbers && (!Number.isInteger(line.quantity) || line.serialNumbers.length !== line.quantity)) context.addIssue({ code: 'custom', path: ['lines', index, 'serialNumbers'], message: 'Se requiere una serie por unidad entregada' });
  });
});
export type CreateSalesDeliveryInput = z.infer<typeof createSalesDeliverySchema>;
export const createSalesInvoiceSchema = z.object({ invoiceNumber: code, issuedAt: z.coerce.date(), dueAt: z.coerce.date().optional() }).superRefine((input, context) => {
  if (input.dueAt && input.dueAt < input.issuedAt) context.addIssue({ code: 'custom', path: ['dueAt'], message: 'El vencimiento no puede anteceder la emisión' });
});
export type CreateSalesInvoiceInput = z.infer<typeof createSalesInvoiceSchema>;
