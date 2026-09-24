import { z } from 'zod';

const accountCode = z.string().trim().min(1).max(20).transform((value) => value.toUpperCase());
const entryCode = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
const periodCode = z.string().trim().min(1).max(20).transform((value) => value.toUpperCase());
export const createAccountSchema = z.object({
  code: accountCode, name: z.string().trim().min(2).max(120), type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  normalBalance: z.enum(['DEBIT', 'CREDIT']), parentCode: accountCode.optional(), postable: z.boolean().default(true)
}).superRefine((value, context) => { if (value.parentCode === value.code) context.addIssue({ code: 'custom', path: ['parentCode'], message: 'Una cuenta no puede ser su propia cuenta padre' }); });
export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export const createAccountingPeriodSchema = z.object({ periodNumber: periodCode, startAt: z.coerce.date(), endAt: z.coerce.date() }).superRefine((value, context) => {
  if (value.endAt < value.startAt) context.addIssue({ code: 'custom', path: ['endAt'], message: 'El cierre del periodo debe ser posterior al inicio' });
});
export type CreateAccountingPeriodInput = z.infer<typeof createAccountingPeriodSchema>;
export const closeAccountingPeriodSchema = z.object({ reason: z.string().trim().min(2).max(240) });
export const createJournalEntrySchema = z.object({
  entryNumber: entryCode, periodNumber: periodCode, entryAt: z.coerce.date(), description: z.string().trim().min(2).max(240),
  sourceType: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()).optional(), sourceId: z.string().trim().min(1).max(80).transform((value) => value.toUpperCase()).optional(),
  lines: z.array(z.object({ accountCode, description: z.string().trim().max(240).optional(), debitCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER), creditCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER) })).min(2).max(100)
}).superRefine((value, context) => {
  if (Boolean(value.sourceType) !== Boolean(value.sourceId)) context.addIssue({ code: 'custom', path: ['sourceId'], message: 'sourceType y sourceId deben indicarse juntos' });
  let debit = 0; let credit = 0;
  value.lines.forEach((line, index) => {
    debit += line.debitCents; credit += line.creditCents;
    if ((line.debitCents === 0) === (line.creditCents === 0)) context.addIssue({ code: 'custom', path: ['lines', index], message: 'Cada línea debe tener un débito o crédito positivo, nunca ambos' });
  });
  if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(credit)) context.addIssue({ code: 'custom', path: ['lines'], message: 'El asiento excede el rango monetario seguro' });
  if (debit !== credit) context.addIssue({ code: 'custom', path: ['lines'], message: 'Débitos y créditos deben cuadrar' });
});
export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export const trialBalanceQuerySchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).superRefine((value, context) => {
  if (value.from && value.to && value.to < value.from) context.addIssue({ code: 'custom', path: ['to'], message: 'La fecha final debe ser posterior a la inicial' });
});
