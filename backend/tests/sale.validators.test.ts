import { describe, expect, it } from 'vitest';
import { createSaleReturnSchema, createSaleSchema } from '../src/validators/sale.validators.js';

describe('Sales validators', () => {
  it('calculates a safe sale payload and rejects duplicate products or invalid series', () => {
    const sale = createSaleSchema.parse({ saleNumber: 's-1', warehouseCode: 'wh-1', discountBps: 1000, taxBps: 1600, lines: [{ productCode: 'p-1', quantity: 2, unitPriceCents: 1000 }] });
    expect(sale.saleNumber).toBe('S-1');
    expect(sale.discountBps).toBe(1000);
    expect(createSaleSchema.safeParse({ ...sale, lines: [...sale.lines, sale.lines[0]] }).success).toBe(false);
    expect(createSaleSchema.safeParse({ ...sale, lines: [{ ...sale.lines[0], serialNumbers: ['SN-1'] }] }).success).toBe(false);
  });

  it('requires a refund method and distinct products on a return', () => {
    const returned = { returnNumber: 'r-1', reason: 'Daño', lines: [{ productCode: 'p-1', quantity: 1 }] };
    expect(createSaleReturnSchema.parse(returned).returnNumber).toBe('R-1');
    expect(createSaleReturnSchema.safeParse({ ...returned, refundAmountCents: 100 }).success).toBe(false);
    expect(createSaleReturnSchema.safeParse({ ...returned, refundAmountCents: 100, refundMethod: 'CASH' }).success).toBe(true);
    expect(createSaleReturnSchema.safeParse({ ...returned, lines: [...returned.lines, returned.lines[0]] }).success).toBe(false);
  });
});
