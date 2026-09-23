import { SaleModel } from '../models/sale.model.js';
import { PaymentModel } from '../models/payment.model.js';
import type { CreateSaleInput } from '../validators/sale.validators.js';
import type { CreatePaymentInput } from '../validators/payment.validators.js';

export class SaleError extends Error {
  constructor(public readonly code: 'SALE_EXISTS' | 'SALE_NOT_FOUND' | 'PAYMENT_EXCEEDS_TOTAL') {
    super(code === 'SALE_EXISTS' ? 'El numero de venta ya esta registrado' : code === 'PAYMENT_EXCEEDS_TOTAL' ? 'El pago supera el total de la venta' : 'Venta no encontrada');
  }
}

export async function listSales() {
  return SaleModel.find().sort({ createdAt: -1 }).limit(100);
}

export async function createSale(input: CreateSaleInput, createdBy: string) {
  const existing = await SaleModel.exists({ saleNumber: input.saleNumber });
  if (existing) {
    throw new SaleError('SALE_EXISTS');
  }

  const lines = input.lines.map((line) => ({ ...line, lineTotalCents: line.quantity * line.unitPriceCents }));
  const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  const sale = await SaleModel.create({ ...input, lines, subtotalCents, totalCents: subtotalCents, createdBy });
  return sale;
}

export async function listPayments(saleNumber: string) {
  return PaymentModel.find({ saleNumber }).sort({ createdAt: -1 });
}

export async function createPayment(saleNumber: string, input: CreatePaymentInput, receivedBy: string) {
  const sale = await SaleModel.findOne({ saleNumber });
  if (!sale || sale.status === 'CANCELLED') {
    throw new SaleError('SALE_NOT_FOUND');
  }

  const payments = await PaymentModel.find({ saleNumber }).select('amountCents');
  const paidCents = payments.reduce((total, payment) => total + payment.amountCents, 0);
  if (paidCents + input.amountCents > sale.totalCents) {
    throw new SaleError('PAYMENT_EXCEEDS_TOTAL');
  }

  return PaymentModel.create({ saleNumber, ...input, receivedBy });
}