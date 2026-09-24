import { describe, expect, it } from 'vitest';
import { applySupplierCreditSchema, awardSupplierQuoteSchema, createPurchaseInvoiceSchema, createPurchaseRequestSchema, createPurchaseReturnSchema, createSupplierPaymentSchema, createSupplierQuoteSchema, purchaseDecisionSchema } from '../src/validators/purchase.validators.js';

describe('Purchase request and supplier quote validators', () => {
  it('normalizes request identifiers and rejects duplicate products', () => {
    const request = { requestNumber: ' req-1 ', warehouseCode: ' wh-a ', reason: 'Reposicion', lines: [{ productCode: ' p-1 ', quantity: 2 }] };
    const parsed = createPurchaseRequestSchema.parse(request);
    expect(parsed.requestNumber).toBe('REQ-1');
    expect(parsed.lines[0]?.productCode).toBe('P-1');
    expect(createPurchaseRequestSchema.safeParse({ ...request, lines: [...request.lines, request.lines[0]] }).success).toBe(false);
  });

  it('validates supplier pricing and quote award identifiers', () => {
    const quote = createSupplierQuoteSchema.parse({ quoteNumber: ' cot-1 ', supplierCode: ' sup-1 ', validUntil: '2030-01-01', lines: [{ productCode: 'p-1', quantity: 2, unitCostCents: 250 }] });
    expect(quote.quoteNumber).toBe('COT-1');
    expect(awardSupplierQuoteSchema.parse({ quoteNumber: 'cot-1', purchaseNumber: 'po-1' })).toEqual({ quoteNumber: 'COT-1', purchaseNumber: 'PO-1' });
    expect(createSupplierQuoteSchema.safeParse({ ...quote, lines: [{ ...quote.lines[0]!, unitCostCents: 1.5 }] }).success).toBe(false);
  });

  it('validates invoice totals inputs and positive supplier payments', () => {
    const invoice = { invoiceNumber: 'INV-1', issuedAt: '2026-01-01', dueAt: '2026-02-01', lines: [{ productCode: 'P-1', quantity: 2, unitCostCents: 150 }] };
    expect(createPurchaseInvoiceSchema.parse(invoice).taxCents).toBe(0);
    expect(createPurchaseInvoiceSchema.safeParse({ ...invoice, dueAt: '2025-12-01' }).success).toBe(false);
    expect(createSupplierPaymentSchema.safeParse({ paymentNumber: 'PAY-1', amountCents: 100, methodCode: 'TRANSFER' }).success).toBe(true);
    expect(createSupplierPaymentSchema.safeParse({ paymentNumber: 'PAY-1', amountCents: 0, methodCode: 'TRANSFER' }).success).toBe(false);
  });

  it('requires a reason to reject an order and validates returns and credit applications', () => {
    expect(purchaseDecisionSchema.safeParse({ decision: 'REJECT' }).success).toBe(false);
    expect(purchaseDecisionSchema.safeParse({ decision: 'APPROVE' }).success).toBe(true);
    const returned = createPurchaseReturnSchema.parse({ returnNumber: 'ret-1', invoiceNumber: 'inv-1', creditNoteNumber: 'cn-1', reason: 'Producto dañado', lines: [{ productCode: 'p-1', quantity: 1 }] });
    expect(returned.returnNumber).toBe('RET-1');
    expect(createPurchaseReturnSchema.safeParse({ ...returned, lines: [...returned.lines, returned.lines[0]] }).success).toBe(false);
    expect(applySupplierCreditSchema.safeParse({ amountCents: 250 }).success).toBe(true);
    expect(applySupplierCreditSchema.safeParse({ amountCents: 0 }).success).toBe(false);
  });
});
