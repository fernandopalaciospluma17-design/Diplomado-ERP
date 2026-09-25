import { describe, expect, it } from 'vitest';
import { buildSummaryReport } from '../src/utils/report-summary.js';

describe('buildSummaryReport', () => {
  it('normalizes zeroed metrics and preserves the summary contract', () => {
    const summary = buildSummaryReport({
      sales: { totalCents: 150_000, count: 2 },
      purchases: undefined,
      expenses: { totalCents: 35_000, count: 3 },
      payments: { totalCents: 0, count: 0 },
      ledger: { debitCents: 150000, creditCents: 150000, entryCount: 2 }
    });

    expect(summary).toMatchObject({
      currency: 'MXN',
      sales: { totalCents: 150000, count: 2 },
      purchases: { totalCents: 0, count: 0 },
      expenses: { totalCents: 35000, count: 3 },
      payments: { totalCents: 0, count: 0 },
      reconciliation: { ledgerBalanced: true, ledgerDebitCents: 150000, ledgerCreditCents: 150000, ledgerEntryCount: 2 }
    });
  });

  it('keeps a consistent generatedAt timestamp', () => {
    const summary = buildSummaryReport({});

    expect(summary.generatedAt).toEqual(expect.any(String));
    expect(new Date(summary.generatedAt).toString()).not.toBe('Invalid Date');
  });

  it('reports an unbalanced ledger when debit and credit totals differ', () => {
    expect(buildSummaryReport({ ledger: { debitCents: 100, creditCents: 90, entryCount: 1 } }).reconciliation).toMatchObject({ ledgerBalanced: false });
  });
});
