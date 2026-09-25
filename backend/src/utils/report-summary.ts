export type SummaryMetric = {
  totalCents: number;
  count: number;
};

export type SummaryInput = {
  sales?: SummaryMetric;
  purchases?: SummaryMetric;
  expenses?: SummaryMetric;
  payments?: SummaryMetric;
  ledger?: { debitCents: number; creditCents: number; entryCount: number };
};

function normalizeMetric(metric?: SummaryMetric): SummaryMetric {
  if (!metric) {
    return { totalCents: 0, count: 0 };
  }

  return {
    totalCents: Number.isFinite(metric.totalCents) ? Math.max(0, metric.totalCents) : 0,
    count: Number.isFinite(metric.count) ? Math.max(0, metric.count) : 0
  };
}

export function buildSummaryReport(input: SummaryInput) {
  return {
    generatedAt: new Date().toISOString(),
    currency: 'MXN',
    sales: normalizeMetric(input.sales),
    purchases: normalizeMetric(input.purchases),
    expenses: normalizeMetric(input.expenses),
    payments: normalizeMetric(input.payments),
    reconciliation: {
      ledgerBalanced: Boolean(input.ledger && input.ledger.debitCents === input.ledger.creditCents),
      ledgerDebitCents: input.ledger?.debitCents ?? 0,
      ledgerCreditCents: input.ledger?.creditCents ?? 0,
      ledgerEntryCount: input.ledger?.entryCount ?? 0
    }
  };
}
