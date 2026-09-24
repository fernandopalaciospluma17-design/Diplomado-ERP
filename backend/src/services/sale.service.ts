import mongoose from 'mongoose';
import { CatalogModel } from '../models/catalog.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { SaleModel, SaleReturnModel } from '../models/sale.model.js';
import { getMasterDataModel } from '../models/master-data.model.js';
import { SalesInvoiceModel } from '../models/sales-workflow.model.js';
import { applySaleMovement, applySaleReturnMovement, runIdempotent } from './inventory.service.js';
import type { CreateSaleReturnInput, CreateSaleInput } from '../validators/sale.validators.js';
import type { CreatePaymentInput } from '../validators/payment.validators.js';
import type { ClientSession, Types } from 'mongoose';

type Tenant = { companyId: string; branchId: string };

export class SaleError extends Error {
  constructor(public readonly code: 'SALE_EXISTS' | 'SALE_NOT_FOUND' | 'SALE_REFERENCE_INVALID' | 'PAYMENT_EXCEEDS_TOTAL' | 'SALE_CANCELLED' | 'RETURN_INVALID' | 'RETURN_EXISTS' | 'REFUND_EXCEEDS_BALANCE' | 'QUOTE_EXISTS' | 'QUOTE_NOT_FOUND' | 'QUOTE_INVALID' | 'ORDER_EXISTS' | 'ORDER_NOT_FOUND' | 'ORDER_STATE' | 'DELIVERY_EXISTS' | 'INVOICE_EXISTS' | 'INVOICE_NOT_FOUND' | 'SALE_ALREADY_INVOICED') {
    const messages = { SALE_EXISTS: 'El numero de venta ya esta registrado', SALE_NOT_FOUND: 'Venta no encontrada', SALE_REFERENCE_INVALID: 'El cliente no existe o esta inactivo', PAYMENT_EXCEEDS_TOTAL: 'El pago supera el saldo pendiente', SALE_CANCELLED: 'La venta cancelada no admite pagos o devoluciones', RETURN_INVALID: 'La devolucion supera la cantidad vendida disponible', RETURN_EXISTS: 'El numero de devolucion ya fue registrado', REFUND_EXCEEDS_BALANCE: 'El reembolso supera el importe devuelto o el pago neto recibido', QUOTE_EXISTS: 'El numero de cotizacion ya esta registrado', QUOTE_NOT_FOUND: 'Cotizacion no encontrada', QUOTE_INVALID: 'La cotizacion vencio, fue cancelada o ya se convirtió', ORDER_EXISTS: 'El numero de pedido ya esta registrado', ORDER_NOT_FOUND: 'Pedido de venta no encontrado', ORDER_STATE: 'El pedido no admite la operacion solicitada', DELIVERY_EXISTS: 'El numero de entrega ya esta registrado', INVOICE_EXISTS: 'El numero de factura ya esta registrado', INVOICE_NOT_FOUND: 'Factura de venta no encontrada', SALE_ALREADY_INVOICED: 'La venta ya tiene factura' };
    super(messages[code]);
  }
}

export async function listSales(companyId: string, branchId: string) {
  return SaleModel.find({ companyId, branchId }).sort({ createdAt: -1 }).limit(100);
}

async function assertCustomer(customerCode: string | undefined, tenant: Tenant, session: mongoose.ClientSession) {
  if (!customerCode) return;
  const active = await getMasterDataModel('customers').exists({ companyId: tenant.companyId, code: customerCode, status: 'ACTIVE' }).session(session);
  if (!active && !await CatalogModel.exists({ companyId: tenant.companyId, branchId: tenant.branchId, kind: 'CUSTOMER', code: customerCode, status: 'ACTIVE' }).session(session)) throw new SaleError('SALE_REFERENCE_INVALID');
}

export async function createSaleInSession(input: CreateSaleInput, createdBy: string, tenant: Tenant, session: ClientSession, operationId: Types.ObjectId, posSessionNumber?: string) {
  if (await SaleModel.exists({ companyId: tenant.companyId, saleNumber: input.saleNumber }).session(session)) throw new SaleError('SALE_EXISTS');
  await assertCustomer(input.customerCode, tenant, session);
  const lines = []; const movements = [];
  for (const requested of input.lines) {
    const lineTotalCents = Math.round(requested.quantity * requested.unitPriceCents);
    const movement = await applySaleMovement({ ...requested, warehouseCode: input.warehouseCode, saleNumber: input.saleNumber }, tenant, createdBy, operationId, lines.length, session);
    lines.push({ ...requested, lineTotalCents, returnedQuantity: 0, returnedCents: 0 });
    if (movement) movements.push({ productCode: requested.productCode, balance: movement.balance, movement: movement.movement });
  }
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const discountCents = Math.round(subtotalCents * input.discountBps / 10000);
  const taxableCents = subtotalCents - discountCents;
  const taxCents = Math.round(taxableCents * input.taxBps / 10000);
  const totalCents = taxableCents + taxCents;
  const [sale] = await SaleModel.create([{
    ...input, ...tenant, posSessionNumber, lines, subtotalCents, discountCents, taxCents, totalCents, paidCents: 0, returnedCents: 0,
    outstandingCents: totalCents, customerRefundDueCents: 0, status: totalCents === 0 ? 'PAID' : 'COMPLETED', createdBy
  }], { session });
  if (!sale) throw new Error('No se pudo guardar la venta');
  return { sale: sale.toObject(), inventoryMovements: movements };
}

export async function createSale(input: CreateSaleInput, createdBy: string, tenant: Tenant, idempotencyKey: string) {
  const payload = { ...input, lines: input.lines.map((line) => ({ ...line, returnedQuantity: 0, returnedCents: 0 })) };
  return runIdempotent('SALE', idempotencyKey, payload, createdBy, tenant, async (session, operationId) => {
    return createSaleInSession(input, createdBy, tenant, session, operationId);
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new SaleError('SALE_EXISTS');
    throw error;
  });
}

export async function listPayments(saleNumber: string, companyId: string, branchId: string) {
  return PaymentModel.find({ saleNumber, companyId, branchId }).sort({ createdAt: -1 }).limit(200);
}

export async function createPayment(saleNumber: string, input: CreatePaymentInput, receivedBy: string, tenant: Tenant, idempotencyKey: string) {
  return runIdempotent('SALE_PAYMENT', idempotencyKey, { saleNumber, ...input }, receivedBy, tenant, async (session, operationId) => {
    const sale = await SaleModel.findOne({ ...tenant, saleNumber }).session(session);
    if (!sale) throw new SaleError('SALE_NOT_FOUND');
    if (sale.status === 'CANCELLED') throw new SaleError('SALE_CANCELLED');
    const oldPayments = await PaymentModel.find({ ...tenant, saleNumber }).select('amountCents').session(session);
    const oldRefunds = await SaleReturnModel.aggregate([{ $match: { ...tenant, saleNumber } }, { $group: { _id: null, total: { $sum: '$refundedCents' } } }]).session(session);
    sale.paidCents = oldPayments.reduce((sum, payment) => sum + payment.amountCents, 0) - (oldRefunds[0]?.total ?? 0);
    if (input.amountCents > sale.totalCents - sale.returnedCents - sale.paidCents) throw new SaleError('PAYMENT_EXCEEDS_TOTAL');
    const [payment] = await PaymentModel.create([{ ...tenant, saleNumber, ...input, receivedBy, operationId }], { session });
    if (!payment) throw new Error('No se pudo guardar el pago');
    sale.paidCents += input.amountCents;
    sale.outstandingCents = Math.max(0, sale.totalCents - sale.returnedCents - sale.paidCents);
    sale.customerRefundDueCents = Math.max(0, sale.paidCents + sale.returnedCents - sale.totalCents);
    sale.status = sale.outstandingCents === 0 ? sale.returnedCents >= sale.totalCents ? 'RETURNED' : 'PAID' : sale.paidCents > 0 ? 'PARTIALLY_PAID' : 'COMPLETED';
    await sale.save({ session });
    await SalesInvoiceModel.updateMany({ ...tenant, saleNumber }, { $set: { status: sale.outstandingCents === 0 ? 'PAID' : sale.paidCents > 0 ? 'PARTIALLY_PAID' : 'OPEN' } }, { session });
    return { sale: sale.toObject(), payment: payment.toObject() };
  });
}

export async function listSaleReturns(saleNumber: string | undefined, tenant: Tenant) {
  return SaleReturnModel.find({ ...tenant, ...(saleNumber ? { saleNumber: saleNumber.toUpperCase() } : {}) }).sort({ createdAt: -1 }).limit(200);
}

export async function returnSale(saleNumber: string, input: CreateSaleReturnInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('SALE_RETURN', idempotencyKey, { saleNumber: saleNumber.toUpperCase(), ...input }, createdBy, tenant, async (session, operationId) => {
    const sale = await SaleModel.findOne({ ...tenant, saleNumber: saleNumber.toUpperCase() }).session(session);
    if (!sale) throw new SaleError('SALE_NOT_FOUND');
    if (sale.status === 'CANCELLED') throw new SaleError('SALE_CANCELLED');
    if (await SaleReturnModel.exists({ ...tenant, returnNumber: input.returnNumber }).session(session)) throw new SaleError('RETURN_EXISTS');
    const earlierReturns = await SaleReturnModel.find({ ...tenant, saleNumber: sale.saleNumber }).select('lines').session(session);
    const previouslyReturnedSerials = new Set(earlierReturns.flatMap((returned) => returned.lines.flatMap((line) => line.serialNumbers ?? [])));
    const lines = []; const movements = [];
    const discountedLines = sale.lines.map((line) => Math.round(line.lineTotalCents * (10000 - sale.discountBps) / 10000));
    const adjustedSubtotalCents = discountedLines.reduce((sum, amount) => sum + amount, 0);
    const taxByProduct = new Map<string, number>(); let allocatedTaxCents = 0;
    sale.lines.forEach((line, index) => {
      const lineTaxCents = index === sale.lines.length - 1 ? sale.taxCents - allocatedTaxCents : adjustedSubtotalCents > 0 ? Math.round(sale.taxCents * discountedLines[index]! / adjustedSubtotalCents) : 0;
      allocatedTaxCents += lineTaxCents; taxByProduct.set(line.productCode, lineTaxCents);
    });
    for (const requested of input.lines) {
      const sold = sale.lines.find((line) => line.productCode === requested.productCode);
      if (!sold || requested.quantity > sold.quantity - (sold.returnedQuantity ?? 0) + 1e-9) throw new SaleError('RETURN_INVALID');
      if (sold.lotCode && requested.lotCode !== sold.lotCode) throw new SaleError('RETURN_INVALID');
      if (sold.serialNumbers && (requested.serialNumbers ?? []).some((serial) => !sold.serialNumbers!.includes(serial) || previouslyReturnedSerials.has(serial))) throw new SaleError('RETURN_INVALID');
      const discountedLineTotal = discountedLines[sale.lines.findIndex((line) => line.productCode === requested.productCode)]!;
      const lineTaxCents = taxByProduct.get(requested.productCode) ?? 0;
      const adjustedLineTotal = discountedLineTotal + lineTaxCents;
      const priorReturned = sold.returnedQuantity ?? 0;
      const priorCents = sold.returnedCents ?? Math.round(adjustedLineTotal * priorReturned / sold.quantity);
      const nextQuantity = Number((priorReturned + requested.quantity).toFixed(6));
      const totalForLine = Math.round(adjustedLineTotal * nextQuantity / sold.quantity);
      const amountCents = Math.max(0, totalForLine - priorCents);
      const movement = await applySaleReturnMovement({ ...requested, warehouseCode: sale.warehouseCode, returnNumber: input.returnNumber }, tenant, createdBy, operationId, lines.length, session);
      if (movement) movements.push({ productCode: requested.productCode, balance: movement.balance, movement: movement.movement });
      lines.push({ ...requested, amountCents });
      sold.returnedQuantity = nextQuantity; sold.returnedCents = totalForLine;
    }
    const totalCreditCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
    const payments = await PaymentModel.find({ ...tenant, saleNumber: sale.saleNumber }).select('amountCents').session(session);
    const previousRefunds = await SaleReturnModel.aggregate([{ $match: { ...tenant, saleNumber: sale.saleNumber } }, { $group: { _id: null, total: { $sum: '$refundedCents' } } }]).session(session);
    const netPaid = payments.reduce((sum, payment) => sum + payment.amountCents, 0) - (previousRefunds[0]?.total ?? 0);
    if (input.refundAmountCents > totalCreditCents || input.refundAmountCents > netPaid) throw new SaleError('REFUND_EXCEEDS_BALANCE');
    const [returnDoc] = await SaleReturnModel.create([{ ...tenant, saleNumber: sale.saleNumber, ...input, lines, totalCreditCents, refundedCents: input.refundAmountCents, createdBy, operationId }], { session });
    if (!returnDoc) throw new Error('No se pudo registrar la devolucion');
    sale.returnedCents += totalCreditCents;
    sale.paidCents = netPaid - input.refundAmountCents;
    sale.outstandingCents = Math.max(0, sale.totalCents - sale.paidCents - sale.returnedCents);
    sale.customerRefundDueCents = Math.max(0, sale.paidCents + sale.returnedCents - sale.totalCents);
    sale.status = sale.lines.every((line) => (line.returnedQuantity ?? 0) >= line.quantity - 1e-9) ? 'RETURNED' : sale.outstandingCents === 0 ? 'PAID' : sale.paidCents > 0 ? 'PARTIALLY_PAID' : 'COMPLETED';
    await sale.save({ session });
    await SalesInvoiceModel.updateMany({ ...tenant, saleNumber: sale.saleNumber }, { $set: { status: sale.outstandingCents === 0 ? 'PAID' : sale.paidCents > 0 ? 'PARTIALLY_PAID' : 'OPEN' } }, { session });
    return { sale: sale.toObject(), return: returnDoc.toObject(), inventoryMovements: movements };
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new SaleError('RETURN_EXISTS');
    throw error;
  });
}
