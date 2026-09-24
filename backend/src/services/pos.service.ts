import mongoose from 'mongoose';
import { PaymentModel } from '../models/payment.model.js';
import { POSSessionModel, POSTicketModel } from '../models/pos.model.js';
import { SaleModel } from '../models/sale.model.js';
import { runIdempotent } from './inventory.service.js';
import { createSaleInSession } from './sale.service.js';
import type { ClosePOSessionInput, CreatePOSTicketInput, OpenPOSessionInput } from '../validators/pos.validators.js';

type Tenant = { companyId: string; branchId: string };
export class POSError extends Error {
  constructor(public readonly code: 'POS_SESSION_EXISTS' | 'POS_SESSION_NOT_FOUND' | 'POS_SESSION_CLOSED' | 'POS_TICKET_EXISTS' | 'POS_TICKET_INVALID' | 'TRANSACTION_REQUIRED') {
    const messages = { POS_SESSION_EXISTS: 'Ya existe una sesión abierta en esta terminal', POS_SESSION_NOT_FOUND: 'Sesión POS no encontrada', POS_SESSION_CLOSED: 'La sesión POS está cerrada', POS_TICKET_EXISTS: 'El identificador del ticket/pago ya existe', POS_TICKET_INVALID: 'El ticket requiere un total de venta mayor a cero', TRANSACTION_REQUIRED: 'MongoDB debe operar como replica set para esta operación POS' };
    super(messages[code]);
  }
}
export async function listPOSSessions(tenant: Tenant) { return POSSessionModel.find(tenant).sort({ openedAt: -1 }).limit(100); }
export async function openPOSession(input: OpenPOSessionInput, actorId: string, tenant: Tenant) {
  if (await POSSessionModel.exists({ ...tenant, terminalCode: input.terminalCode, status: 'OPEN' })) throw new POSError('POS_SESSION_EXISTS');
  try { return await POSSessionModel.create({ ...tenant, ...input, openedBy: actorId, openedAt: new Date(), cashSalesCents: 0, nonCashSalesCents: 0, status: 'OPEN' }); }
  catch (error) { if ((error as { code?: number }).code === 11000) throw new POSError('POS_SESSION_EXISTS'); throw error; }
}
export async function closePOSession(sessionNumber: string, input: ClosePOSessionInput, actorId: string, tenant: Tenant) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const pos = await POSSessionModel.findOne({ ...tenant, sessionNumber: sessionNumber.toUpperCase() }).session(session);
      if (!pos) throw new POSError('POS_SESSION_NOT_FOUND');
      if (pos.status === 'CLOSED') { result = pos.toObject(); return; }
      pos.expectedCashCents = pos.openingCashCents + pos.cashSalesCents;
      pos.countedCashCents = input.countedCashCents;
      pos.cashDifferenceCents = input.countedCashCents - pos.expectedCashCents;
      pos.status = 'CLOSED'; pos.closedBy = actorId; pos.closedAt = new Date();
      await pos.save({ session }); result = pos.toObject();
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support transactions/i.test((error as Error).message ?? '')) throw new POSError('TRANSACTION_REQUIRED');
    throw error;
  } finally { await session.endSession(); }
}
export async function listPOSTickets(sessionNumber: string, tenant: Tenant) {
  if (!await POSSessionModel.exists({ ...tenant, sessionNumber: sessionNumber.toUpperCase() })) throw new POSError('POS_SESSION_NOT_FOUND');
  return POSTicketModel.find({ ...tenant, sessionNumber: sessionNumber.toUpperCase() }).sort({ createdAt: -1 }).limit(500);
}
export async function createPOSTicket(input: CreatePOSTicketInput, idempotencyKey: string, actorId: string, tenant: Tenant) {
  return runIdempotent('POS_TICKET', idempotencyKey, input, actorId, tenant, async (session, operationId) => {
    const pos = await POSSessionModel.findOne({ ...tenant, sessionNumber: input.sessionNumber }).session(session);
    if (!pos) throw new POSError('POS_SESSION_NOT_FOUND');
    if (pos.status !== 'OPEN') throw new POSError('POS_SESSION_CLOSED');
    const created = await createSaleInSession(input.sale, actorId, tenant, session, operationId, pos.sessionNumber);
    const sale = await SaleModel.findOne({ ...tenant, saleNumber: input.sale.saleNumber }).session(session);
    if (!sale) throw new Error('No se encontró la venta del ticket POS');
    if (sale.totalCents <= 0) throw new POSError('POS_TICKET_INVALID');
    const [payment] = await PaymentModel.create([{
      ...tenant, saleNumber: sale.saleNumber, paymentNumber: input.paymentNumber, amountCents: sale.totalCents, method: input.paymentMethod,
      reference: input.reference, receivedBy: actorId, operationId, posSessionNumber: pos.sessionNumber
    }], { session });
    if (!payment) throw new Error('No se pudo registrar el cobro POS');
    sale.paidCents = sale.totalCents; sale.outstandingCents = 0; sale.status = 'PAID'; await sale.save({ session });
    const [ticket] = await POSTicketModel.create([{
      ...tenant, ticketNumber: input.ticketNumber, sessionNumber: pos.sessionNumber, saleNumber: sale.saleNumber, paymentNumber: input.paymentNumber,
      totalCents: sale.totalCents, paymentMethod: input.paymentMethod, createdBy: actorId, operationId
    }], { session });
    if (!ticket) throw new Error('No se pudo guardar el ticket POS');
    if (input.paymentMethod === 'CASH') pos.cashSalesCents += sale.totalCents;
    else pos.nonCashSalesCents += sale.totalCents;
    await pos.save({ session });
    return { ticket: ticket.toObject(), sale: sale.toObject(), payment: payment.toObject(), inventoryMovements: created.inventoryMovements, session: pos.toObject() };
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new POSError('POS_TICKET_EXISTS');
    throw error;
  });
}
