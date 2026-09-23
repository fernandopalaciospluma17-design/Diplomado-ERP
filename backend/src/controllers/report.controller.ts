import type { RequestHandler } from 'express';
import { ExpenseModel } from '../models/expense.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { PurchaseModel } from '../models/purchase.model.js';
import { SaleModel } from '../models/sale.model.js';

export const summaryReportController: RequestHandler = async (_request, response, next) => {
  try {
    const { companyId, branchId } = _request.user ?? {};
    if (!companyId || !branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const scope = { companyId, branchId };
    const [sales, purchases, expenses, payments] = await Promise.all([
      SaleModel.aggregate([{ $match: { ...scope, status: 'COMPLETED' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' }, count: { $sum: 1 } } }]),
      PurchaseModel.aggregate([{ $match: { ...scope, status: 'RECEIVED' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' }, count: { $sum: 1 } } }]),
      ExpenseModel.aggregate([{ $match: scope }, { $group: { _id: null, totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } }]),
      PaymentModel.aggregate([{ $match: scope }, { $group: { _id: null, totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } }])
    ]);
    response.json({ success: true, message: 'Resumen consultado', data: { sales: sales[0] ?? { totalCents: 0, count: 0 }, purchases: purchases[0] ?? { totalCents: 0, count: 0 }, expenses: expenses[0] ?? { totalCents: 0, count: 0 }, payments: payments[0] ?? { totalCents: 0, count: 0 } } });
  } catch (error) { next(error); }
};
