import { describe, expect, it } from 'vitest';
import { closePOSessionSchema, createPOSTicketSchema, openPOSessionSchema } from '../src/validators/pos.validators.js';

describe('POS validators', () => {
  it('normalizes session and terminal identifiers', () => {
    expect(openPOSessionSchema.parse({ sessionNumber: ' turno-1 ', terminalCode: ' caja-a ', openingCashCents: 1000 })).toMatchObject({ sessionNumber: 'TURNO-1', terminalCode: 'CAJA-A' });
  });

  it('requires valid tender and nonnegative counted cash', () => {
    expect(closePOSessionSchema.safeParse({ countedCashCents: -1 }).success).toBe(false);
    const invalidTicket = createPOSTicketSchema.safeParse({ ticketNumber: 't-1', sessionNumber: 's-1', paymentNumber: 'p-1', paymentMethod: 'CRYPTO', sale: {} });
    expect(invalidTicket.success).toBe(false);
  });
});
