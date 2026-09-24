import { describe, expect, it } from 'vitest';
import { createAccountingPeriodSchema, createAccountSchema, createJournalEntrySchema } from '../src/validators/accounting.validators.js';

describe('Accounting validators', () => {
  it('normalizes chart accounts and rejects invalid periods', () => {
    expect(createAccountSchema.parse({ code: '1000', name: 'Caja', type: 'ASSET', normalBalance: 'DEBIT' }).code).toBe('1000');
    expect(createAccountingPeriodSchema.safeParse({ periodNumber: '2026-01', startAt: '2026-02-01', endAt: '2026-01-31' }).success).toBe(false);
  });

  it('accepts balanced double-entry journals and rejects imbalanced or two-sided lines', () => {
    const entry = { entryNumber: 'je-1', periodNumber: '2026-01', entryAt: '2026-01-15', description: 'Capital inicial', lines: [{ accountCode: '1000', debitCents: 10000, creditCents: 0 }, { accountCode: '3000', debitCents: 0, creditCents: 10000 }] };
    expect(createJournalEntrySchema.parse(entry).entryNumber).toBe('JE-1');
    expect(createJournalEntrySchema.safeParse({ ...entry, lines: [{ ...entry.lines[0], debitCents: 10001 }, entry.lines[1]] }).success).toBe(false);
    expect(createJournalEntrySchema.safeParse({ ...entry, lines: [{ ...entry.lines[0], creditCents: 1 }, entry.lines[1]] }).success).toBe(false);
  });
});
