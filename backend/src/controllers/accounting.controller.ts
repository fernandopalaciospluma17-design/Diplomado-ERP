import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { AccountingError, closeAccountingPeriod, createAccount, createAccountingPeriod, getTrialBalance, listAccountingPeriods, listAccounts, listJournalEntries, postJournalEntry } from '../services/accounting.service.js';
import { InventoryError } from '../services/inventory.service.js';
import { closeAccountingPeriodSchema, createAccountSchema, createAccountingPeriodSchema, createJournalEntrySchema, trialBalanceQuerySchema } from '../validators/accounting.validators.js';

function tenant(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) {
  if (!req.user?.companyId || !req.user.branchId) { res.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return undefined; }
  return { companyId: req.user.companyId, branchId: req.user.branchId };
}
function handleError(error: unknown, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) { res.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; }
  if (error instanceof AccountingError) { const status = error.code === 'PERIOD_NOT_FOUND' || error.code === 'ACCOUNT_NOT_FOUND' ? 404 : error.code === 'TRANSACTION_REQUIRED' ? 503 : ['ACCOUNT_EXISTS', 'PERIOD_EXISTS', 'PERIOD_OVERLAP', 'PERIOD_CLOSED', 'ENTRY_EXISTS', 'SOURCE_ALREADY_POSTED', 'ENTRY_INVALID', 'ACCOUNT_NOT_POSTABLE'].includes(error.code) ? 409 : 422; res.status(status).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  if (error instanceof InventoryError) { res.status(error.code === 'TRANSACTION_REQUIRED' ? 503 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  next(error);
}
const idempotencyKey = (req: Parameters<RequestHandler>[0]) => z.string().trim().min(8).max(120).parse(req.get('idempotency-key'));

export const listAccountsController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Plan de cuentas consultado', data: await listAccounts(t.companyId) }); } catch (e) { next(e); } };
export const createAccountController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(201).json({ success: true, message: 'Cuenta contable creada', data: await createAccount(createAccountSchema.parse(req.body), t.companyId) }); } catch (e) { handleError(e, res, next); } };
export const listAccountingPeriodsController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Periodos contables consultados', data: await listAccountingPeriods(t.companyId) }); } catch (e) { next(e); } };
export const createAccountingPeriodController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(201).json({ success: true, message: 'Periodo contable creado', data: await createAccountingPeriod(createAccountingPeriodSchema.parse(req.body), t.companyId) }); } catch (e) { handleError(e, res, next); } };
export const closeAccountingPeriodController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; const number = z.string().trim().min(1).max(20).parse(req.params.periodNumber); const { reason } = closeAccountingPeriodSchema.parse(req.body); res.status(200).json({ success: true, message: 'Periodo contable cerrado', data: await closeAccountingPeriod(number, t.companyId, req.user!.sub, reason) }); } catch (e) { handleError(e, res, next); } };
export const listJournalEntriesController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Asientos consultados', data: await listJournalEntries(t) }); } catch (e) { next(e); } };
export const postJournalEntryController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; const input = createJournalEntrySchema.parse(req.body); res.status(201).json({ success: true, message: 'Asiento contabilizado', data: await postJournalEntry(input, idempotencyKey(req), req.user!.sub, t) }); } catch (e) { handleError(e, res, next); } };
export const trialBalanceController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; const range = trialBalanceQuerySchema.parse(req.query); const data = await getTrialBalance(t, range.from, range.to); res.status(200).json({ success: true, message: 'Balance de comprobación consultado', data }); } catch (e) { handleError(e, res, next); } };
