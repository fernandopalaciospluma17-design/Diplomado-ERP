import mongoose from 'mongoose';
import { AccountModel, AccountingPeriodModel, JournalEntryModel } from '../models/accounting.model.js';
import { runIdempotent } from './inventory.service.js';
import type { CreateAccountInput, CreateAccountingPeriodInput, CreateJournalEntryInput } from '../validators/accounting.validators.js';

type Tenant = { companyId: string; branchId: string };
export class AccountingError extends Error {
  constructor(public readonly code: 'ACCOUNT_EXISTS' | 'ACCOUNT_NOT_FOUND' | 'ACCOUNT_NOT_POSTABLE' | 'PERIOD_EXISTS' | 'PERIOD_OVERLAP' | 'PERIOD_NOT_FOUND' | 'PERIOD_CLOSED' | 'ENTRY_EXISTS' | 'SOURCE_ALREADY_POSTED' | 'ENTRY_INVALID' | 'TRANSACTION_REQUIRED') {
    const messages = { ACCOUNT_EXISTS: 'El código de cuenta ya existe', ACCOUNT_NOT_FOUND: 'Una o más cuentas no existen o están inactivas', ACCOUNT_NOT_POSTABLE: 'No se puede registrar en una cuenta de agrupación', PERIOD_EXISTS: 'El periodo ya existe', PERIOD_OVERLAP: 'El periodo se solapa con otro ya configurado', PERIOD_NOT_FOUND: 'Periodo contable no encontrado', PERIOD_CLOSED: 'El periodo está cerrado o la fecha está fuera de su rango', ENTRY_EXISTS: 'El número de asiento ya existe', SOURCE_ALREADY_POSTED: 'El documento de origen ya fue contabilizado', ENTRY_INVALID: 'Asiento contable inválido', TRANSACTION_REQUIRED: 'MongoDB debe operar como replica set para esta operacion contable' };
    super(messages[code]);
  }
}

export async function listAccounts(companyId: string) { return AccountModel.find({ companyId }).sort({ code: 1 }).limit(1000); }
export async function createAccount(input: CreateAccountInput, companyId: string) {
  if (input.parentCode && !await AccountModel.exists({ companyId, code: input.parentCode, status: 'ACTIVE', postable: false })) throw new AccountingError('ACCOUNT_NOT_FOUND');
  try { return await AccountModel.create({ ...input, companyId, status: 'ACTIVE' }); }
  catch (error) { if ((error as { code?: number }).code === 11000) throw new AccountingError('ACCOUNT_EXISTS'); throw error; }
}
export async function listAccountingPeriods(companyId: string) { return AccountingPeriodModel.find({ companyId }).sort({ startAt: -1 }).limit(100); }
export async function createAccountingPeriod(input: CreateAccountingPeriodInput, companyId: string) {
  const overlap = await AccountingPeriodModel.exists({ companyId, startAt: { $lte: input.endAt }, endAt: { $gte: input.startAt } });
  if (overlap) throw new AccountingError('PERIOD_OVERLAP');
  try { return await AccountingPeriodModel.create({ ...input, companyId, status: 'OPEN', entryCount: 0 }); }
  catch (error) { if ((error as { code?: number }).code === 11000) throw new AccountingError('PERIOD_EXISTS'); throw error; }
}
export async function closeAccountingPeriod(periodNumber: string, companyId: string, actorId: string, reason: string) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const period = await AccountingPeriodModel.findOne({ companyId, periodNumber: periodNumber.toUpperCase() }).session(session);
      if (!period) throw new AccountingError('PERIOD_NOT_FOUND');
      if (period.status === 'CLOSED') { result = period.toObject(); return; }
      period.status = 'CLOSED'; period.closedBy = actorId; period.closedAt = new Date(); period.closeReason = reason;
      await period.save({ session }); result = period.toObject();
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support transactions/i.test((error as Error).message ?? '')) throw new AccountingError('TRANSACTION_REQUIRED');
    throw error;
  } finally { await session.endSession(); }
}

export async function postJournalEntry(input: CreateJournalEntryInput, idempotencyKey: string, actorId: string, tenant: Tenant) {
  return runIdempotent('ACCOUNTING_POST', idempotencyKey, input, actorId, tenant, async (session, operationId) => {
    const period = await AccountingPeriodModel.findOne({ companyId: tenant.companyId, periodNumber: input.periodNumber }).session(session);
    if (!period) throw new AccountingError('PERIOD_NOT_FOUND');
    if (period.status !== 'OPEN' || input.entryAt < period.startAt || input.entryAt > period.endAt) throw new AccountingError('PERIOD_CLOSED');
    if (await JournalEntryModel.exists({ ...tenant, entryNumber: input.entryNumber }).session(session)) throw new AccountingError('ENTRY_EXISTS');
    if (input.sourceType && input.sourceId && await JournalEntryModel.exists({ companyId: tenant.companyId, sourceType: input.sourceType, sourceId: input.sourceId }).session(session)) throw new AccountingError('SOURCE_ALREADY_POSTED');
    const accountCodes = [...new Set(input.lines.map((line) => line.accountCode))];
    const accounts = await AccountModel.find({ companyId: tenant.companyId, code: { $in: accountCodes }, status: 'ACTIVE' }).session(session);
    if (accounts.length !== accountCodes.length) throw new AccountingError('ACCOUNT_NOT_FOUND');
    if (accounts.some((account) => !account.postable)) throw new AccountingError('ACCOUNT_NOT_POSTABLE');
    const totalDebitCents = input.lines.reduce((sum, line) => sum + line.debitCents, 0);
    const totalCreditCents = input.lines.reduce((sum, line) => sum + line.creditCents, 0);
    if (!Number.isSafeInteger(totalDebitCents) || totalDebitCents <= 0 || totalDebitCents !== totalCreditCents) throw new AccountingError('ENTRY_INVALID');
    const [entry] = await JournalEntryModel.create([{
      ...tenant, ...input, totalDebitCents, totalCreditCents, status: 'POSTED', postedBy: actorId, postedAt: new Date(), operationId
    }], { session });
    if (!entry) throw new Error('No se pudo contabilizar el asiento');
    period.entryCount += 1;
    await period.save({ session });
    return entry.toObject();
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) {
      const fields = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
      throw new AccountingError(fields.includes('sourceId') ? 'SOURCE_ALREADY_POSTED' : 'ENTRY_EXISTS');
    }
    throw error;
  });
}
export async function listJournalEntries(tenant: Tenant) { return JournalEntryModel.find(tenant).sort({ entryAt: -1 }).limit(500); }
export async function getTrialBalance(tenant: Tenant, from?: Date, to?: Date) {
  const match: Record<string, unknown> = { companyId: new mongoose.Types.ObjectId(tenant.companyId), branchId: new mongoose.Types.ObjectId(tenant.branchId), status: 'POSTED' };
  if (from || to) match.entryAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const totals = await JournalEntryModel.aggregate([
    { $match: match }, { $unwind: '$lines' },
    { $group: { _id: '$lines.accountCode', debitCents: { $sum: '$lines.debitCents' }, creditCents: { $sum: '$lines.creditCents' } } }, { $sort: { _id: 1 } }
  ]);
  const accounts = await AccountModel.find({ companyId: tenant.companyId, code: { $in: totals.map((line) => line._id) } }).lean();
  const accountMap = new Map(accounts.map((account) => [account.code, account]));
  const lines = totals.map((total) => {
    const account = accountMap.get(total._id);
    const debitCents = total.debitCents as number; const creditCents = total.creditCents as number;
    return { accountCode: total._id as string, accountName: account?.name ?? 'Cuenta sin catálogo', type: account?.type ?? 'UNKNOWN', debitCents, creditCents, balanceCents: account?.normalBalance === 'CREDIT' ? creditCents - debitCents : debitCents - creditCents };
  });
  const debitTotalCents = lines.reduce((sum, line) => sum + line.debitCents, 0);
  const creditTotalCents = lines.reduce((sum, line) => sum + line.creditCents, 0);
  return { balanced: debitTotalCents === creditTotalCents, debitTotalCents, creditTotalCents, lines, from, to, checkedAt: new Date() };
}
