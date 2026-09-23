import { ExpenseModel } from '../models/expense.model.js';
import type { CreateExpenseInput } from '../validators/expense.validators.js';

export class ExpenseError extends Error {
  constructor() { super('El numero de gasto ya esta registrado'); }
}

export async function listExpenses() { return ExpenseModel.find().sort({ paidAt: -1 }).limit(100); }

export async function createExpense(input: CreateExpenseInput, createdBy: string) {
  if (await ExpenseModel.exists({ expenseNumber: input.expenseNumber })) throw new ExpenseError();
  return ExpenseModel.create({ ...input, createdBy });
}