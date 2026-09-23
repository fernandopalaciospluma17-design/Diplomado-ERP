import { ExpenseModel } from '../models/expense.model.js';
import type { CreateExpenseInput } from '../validators/expense.validators.js';

export class ExpenseError extends Error {
  constructor() { super('El numero de gasto ya esta registrado'); }
}

export async function listExpenses(companyId: string, branchId: string) { return ExpenseModel.find({ companyId, branchId }).sort({ paidAt: -1 }).limit(100); }

export async function createExpense(input: CreateExpenseInput, createdBy: string, companyId: string, branchId: string) {
  if (await ExpenseModel.exists({ companyId, expenseNumber: input.expenseNumber })) throw new ExpenseError();
  return ExpenseModel.create({ ...input, companyId, branchId, createdBy });
}
