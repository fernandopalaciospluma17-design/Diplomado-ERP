import { z } from 'zod';

const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());

export const createPurchaseRequestSchema = z.object({
  requestNumber: code,
  warehouseCode: code,
  reason: z.string().trim().min(2).max(240),
  requiredBy: z.coerce.date().optional(),
  lines: z.array(z.object({ productCode: code, quantity: z.number().positive().finite().max(1_000_000_000) })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez en la solicitud' });
});
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;

export const createSupplierQuoteSchema = z.object({
  quoteNumber: code,
  supplierCode: code,
  validUntil: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
  lines: z.array(z.object({ productCode: code, quantity: z.number().positive().finite().max(1_000_000_000), unitCostCents: z.number().int().nonnegative().max(2_000_000_000) })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez en la cotizacion' });
  const total = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostCents), 0);
  if (!Number.isSafeInteger(total)) context.addIssue({ code: 'custom', path: ['lines'], message: 'El total de la cotizacion excede el rango monetario seguro' });
});
export type CreateSupplierQuoteInput = z.infer<typeof createSupplierQuoteSchema>;

export const awardSupplierQuoteSchema = z.object({ quoteNumber: code, purchaseNumber: code });
export type AwardSupplierQuoteInput = z.infer<typeof awardSupplierQuoteSchema>;

export const createPurchaseInvoiceSchema = z.object({
  invoiceNumber: code,
  issuedAt: z.coerce.date(),
  dueAt: z.coerce.date().optional(),
  taxCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).default(0),
  lines: z.array(z.object({ productCode: code, quantity: z.number().positive().finite().max(1_000_000_000), unitCostCents: z.number().int().nonnegative().max(2_000_000_000) })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez en la factura' });
  if (input.dueAt && input.dueAt < input.issuedAt) context.addIssue({ code: 'custom', path: ['dueAt'], message: 'El vencimiento no puede ser anterior a la fecha de factura' });
  const total = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostCents), 0) + input.taxCents;
  if (!Number.isSafeInteger(total)) context.addIssue({ code: 'custom', path: ['lines'], message: 'El total de la factura excede el rango monetario seguro' });
});
export type CreatePurchaseInvoiceInput = z.infer<typeof createPurchaseInvoiceSchema>;

export const createSupplierPaymentSchema = z.object({
  paymentNumber: code,
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  methodCode: code,
  reference: z.string().trim().max(100).optional(),
  paidAt: z.coerce.date().optional()
});
export type CreateSupplierPaymentInput = z.infer<typeof createSupplierPaymentSchema>;

export const createPurchaseReturnSchema = z.object({
  returnNumber: code,
  invoiceNumber: code,
  creditNoteNumber: code,
  reason: z.string().trim().min(2).max(240),
  lines: z.array(z.object({
    productCode: code,
    quantity: z.number().positive().finite().max(1_000_000_000),
    lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
    serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional(),
    locationCode: code.optional()
  })).min(1).max(100)
}).superRefine((input, context) => {
  if (new Set(input.lines.map((line) => line.productCode)).size !== input.lines.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez en la devolucion' });
  const serials = input.lines.flatMap((line) => line.serialNumbers ?? []);
  if (new Set(serials).size !== serials.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'No se permiten series repetidas en la devolucion' });
});
export type CreatePurchaseReturnInput = z.infer<typeof createPurchaseReturnSchema>;

export const applySupplierCreditSchema = z.object({ amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) });
export type ApplySupplierCreditInput = z.infer<typeof applySupplierCreditSchema>;

export const createPurchaseSchema = z.object({
  purchaseNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  supplierCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  warehouseCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  lines: z.array(z.object({
    productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    quantity: z.number().positive().finite().max(1_000_000_000),
    unitCostCents: z.number().int().nonnegative().max(2_000_000_000)
  })).min(1).max(100)
}).superRefine((input, context) => {
  const products = input.lines.map((line) => line.productCode);
  if (new Set(products).size !== products.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez en la orden' });
  const total = input.lines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitCostCents), 0);
  if (!Number.isSafeInteger(total)) context.addIssue({ code: 'custom', path: ['lines'], message: 'El total de la orden excede el rango monetario seguro' });
});

export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const receivePurchaseSchema = z.object({
  receiptNumber: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  locationCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()).optional(),
  lines: z.array(z.object({
    productCode: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
    quantity: z.number().positive().finite().max(1_000_000_000),
    lotCode: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
    expiresAt: z.coerce.date().optional(),
    serialNumbers: z.array(z.string().trim().min(1).max(100).transform((value) => value.toUpperCase())).max(500).optional()
  })).min(1).max(100)
}).superRefine((input, context) => {
  const products = input.lines.map((line) => line.productCode);
  if (new Set(products).size !== products.length) context.addIssue({ code: 'custom', path: ['lines'], message: 'Cada producto debe aparecer una sola vez por recepcion' });
  input.lines.forEach((line, index) => {
    if (line.expiresAt && !line.lotCode) context.addIssue({ code: 'custom', path: ['lines', index, 'expiresAt'], message: 'La caducidad requiere un lote' });
    if (line.serialNumbers && new Set(line.serialNumbers).size !== line.serialNumbers.length) context.addIssue({ code: 'custom', path: ['lines', index, 'serialNumbers'], message: 'No se permiten numeros de serie repetidos' });
  });
});
export type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;

export const cancelPurchaseSchema = z.object({ reason: z.string().trim().min(2).max(240) });

export const purchaseDecisionSchema = z.object({ decision: z.enum(['APPROVE', 'REJECT']), reason: z.string().trim().min(2).max(240).optional() }).superRefine((input, context) => {
  if (input.decision === 'REJECT' && !input.reason) context.addIssue({ code: 'custom', path: ['reason'], message: 'Indica el motivo del rechazo' });
});
export type PurchaseDecisionInput = z.infer<typeof purchaseDecisionSchema>;
