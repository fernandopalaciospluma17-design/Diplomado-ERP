import { Router } from 'express';
import { closeAccountingPeriodController, createAccountController, createAccountingPeriodController, listAccountsController, listAccountingPeriodsController, listJournalEntriesController, postJournalEntryController, trialBalanceController } from '../controllers/accounting.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const accountingRouter = Router();
accountingRouter.get('/accounts', requireAuth, requirePermission('finance.account.read'), listAccountsController);
accountingRouter.post('/accounts', requireAuth, requirePermission('finance.account.create'), auditAction('ACCOUNT_CREATE'), createAccountController);
accountingRouter.get('/periods', requireAuth, requirePermission('finance.period.read'), listAccountingPeriodsController);
accountingRouter.post('/periods', requireAuth, requirePermission('finance.period.create'), auditAction('ACCOUNTING_PERIOD_CREATE'), createAccountingPeriodController);
accountingRouter.post('/periods/:periodNumber/close', requireAuth, requirePermission('finance.period.approve'), auditAction('ACCOUNTING_PERIOD_CLOSE'), closeAccountingPeriodController);
accountingRouter.get('/journal-entries', requireAuth, requirePermission('finance.journal.read'), listJournalEntriesController);
accountingRouter.post('/journal-entries', requireAuth, requirePermission('finance.journal.create'), auditAction('JOURNAL_ENTRY_POST'), postJournalEntryController);
accountingRouter.get('/trial-balance', requireAuth, requirePermission('finance.report.read'), trialBalanceController);
