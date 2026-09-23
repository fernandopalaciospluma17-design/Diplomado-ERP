import type { RequestHandler } from 'express';
import { ExpenseModel } from '../models/expense.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { PurchaseModel } from '../models/purchase.model.js';
import { SaleModel } from '../models/sale.model.js';

export const summaryReportController: RequestHandler = async (_request, response, next) => {
  try {
    const [sales, purchases, expenses, payments] = await Promise.all([
      SaleModel.aggregate([{ $match: { status: 'COMPLETED' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' }, count: { $sum: 1 } } }]),
      PurchaseModel.aggregate([{ $match: { status: 'RECEIVED' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' }, count: { $sum: 1 } } }]),
      ExpenseModel.aggregate([{ $group: { _id: null, totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } }]),
      PaymentModel.aggregate([{ $group: { _id: null, totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } }])
    ]);
    response.json({ success: true, message: 'Resumen consultado', data: { sales: sales[0] ?? { totalCents: 0, count: 0 }, purchases: purchases[0] ?? { totalCents: 0, count: 0 }, expenses: expenses[0] ?? { totalCents: 0, count: 0 }, payments: payments[0] ?? { totalCents: 0, count: 0 } } });
  } catch (error) { next(error); }
};