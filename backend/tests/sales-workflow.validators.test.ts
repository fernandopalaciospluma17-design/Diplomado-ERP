import { describe, expect, it } from 'vitest';
import { convertSalesQuoteSchema, createSalesDeliverySchema, createSalesInvoiceSchema, createSalesOrderSchema, createSalesQuoteSchema } from '../src/validators/sales-workflow.validators.js';

describe('Sales workflow validators', () => {
  const plan = { warehouseCode: 'wh-1', lines: [{ productCode: 'p-1', quantity: 3, unitPriceCents: 125 }] };

  it('validates and normalizes quotes and orders with safe prices', () => {
    expect(createSalesQuoteSchema.parse({ ...plan, quoteNumber: 'q-1', validUntil: '2030-01-01' }).quoteNumber).toBe('Q-1');
    expect(createSalesOrderSchema.parse({ ...plan, orderNumber: 'o-1' }).orderNumber).toBe('O-1');
    expect(convertSalesQuoteSchema.parse({ orderNumber: 'o-1' }).orderNumber).toBe('O-1');
    expect(createSalesOrderSchema.safeParse({ ...plan, orderNumber: 'o-1', lines: [...plan.lines, plan.lines[0]] }).success).toBe(false);
    expect(createSalesQuoteSchema.safeParse({ ...plan, quoteNumber: 'q-1', validUntil: '2030-01-01', lines: [{ ...plan.lines[0], quantity: 1_000_000_000, unitPriceCents: 2_000_000_000 }] }).success).toBe(false);
  });

  it('validates partial delivery trace and invoice dates', () => {
    expect(createSalesDeliverySchema.safeParse({ deliveryNumber: 'd-1', saleNumber: 's-1', lines: [{ productCode: 'p-1', quantity: 2, serialNumbers: ['S-1'] }] }).success).toBe(false);
    expect(createSalesDeliverySchema.safeParse({ deliveryNumber: 'd-1', saleNumber: 's-1', lines: [{ productCode: 'p-1', quantity: 2, serialNumbers: ['S-1', 'S-2'] }] }).success).toBe(true);
    expect(createSalesInvoiceSchema.safeParse({ invoiceNumber: 'i-1', issuedAt: '2026-04-01', dueAt: '2026-03-01' }).success).toBe(false);
  });
});
