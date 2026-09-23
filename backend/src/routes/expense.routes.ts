import { Router } from 'express';
import { createExpenseController, listExpensesController } from '../controllers/expense.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const expenseRouter = Router();
expenseRouter.get('/', requireAuth, listExpensesController);
expenseRouter.post('/', requireAuth, requireRole('ADMIN'), auditAction('EXPENSE_CREATE'), createExpenseController);