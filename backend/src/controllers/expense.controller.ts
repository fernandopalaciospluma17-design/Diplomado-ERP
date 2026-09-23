import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ExpenseError, createExpense, listExpenses } from '../services/expense.service.js';
import { createExpenseSchema } from '../validators/expense.validators.js';

export const listExpensesController: RequestHandler = async (request, response, next) => {
  try { if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; } response.json({ success: true, message: 'Gastos consultados', data: await listExpenses(request.user.companyId, request.user.branchId) }); } catch (error) { next(error); }
};

export const createExpenseController: RequestHandler = async (request, response, next) => {
  try { if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; } response.status(201).json({ success: true, message: 'Gasto creado', data: await createExpense(createExpenseSchema.parse(request.body), request.user.sub, request.user.companyId, request.user.branchId) }); }
  catch (error) {
    if (error instanceof ZodError) { response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; }
    if (error instanceof ExpenseError) { response.status(409).json({ success: false, message: error.message, error: { code: 'EXPENSE_EXISTS', details: [] } }); return; }
    next(error);
  }
};
