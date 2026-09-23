import { Router } from 'express';
import { createExpenseController, listExpensesController } from '../controllers/expense.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const expenseRouter = Router();
expenseRouter.get('/', requireAuth, requirePermission('finance.expenses.read'), listExpensesController);
expenseRouter.post('/', requireAuth, requirePermission('finance.expenses.create'), auditAction('EXPENSE_CREATE'), createExpenseController);
