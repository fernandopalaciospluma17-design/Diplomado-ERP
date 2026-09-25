import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { ExpenseModel } from '../models/expense.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { PurchaseModel } from '../models/purchase.model.js';
import { SaleModel } from '../models/sale.model.js';
import { JournalEntryModel } from '../models/accounting.model.js';
import { buildSummaryReport } from '../utils/report-summary.js';
import { z } from 'zod';

const summaryQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  branchId: z.string().trim().min(1).optional()
}).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'El rango de fechas es invalido' });

export const summaryReportController: RequestHandler = async (_request, response, next) => {
  try {
    const { companyId, branchId } = _request.user ?? {};
    if (!companyId) {
      response.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'TENANT_REQUIRED', details: [] } });
      return;
    }

    const query = summaryQuerySchema.parse(_request.query);
    if (query.branchId && query.branchId !== branchId) {
      response.status(403).json({ success: false, message: 'La sucursal solicitada no pertenece a la sesión', error: { code: 'BRANCH_SCOPE_FORBIDDEN', details: [] } });
      return;
    }
    const scopedBranchId = query.branchId ?? branchId;
    const scope = scopedBranchId ? { companyId, branchId: scopedBranchId } : { companyId };
    const salesDate = query.from || query.to ? { createdAt: { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) } } : {};
    const expenseDate = query.from || query.to ? { paidAt: { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) } } : {};
    const ledgerDate = query.from || query.to ? { entryAt: { ...(query.from ? { $gte: query.from } : {}), ...(query.to ? { $lte: query.to } : {}) } } : {};
    const ledgerScope = { companyId: new Types.ObjectId(companyId), ...(scopedBranchId ? { branchId: new Types.ObjectId(scopedBranchId) } : {}), ...ledgerDate, status: 'POSTED' };
    const [sales, purchases, expenses, payments, ledger] = await Promise.all([
      SaleModel.aggregate([{ $match: { ...scope, ...salesDate, status: 'COMPLETED' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' }, count: { $sum: 1 } } }]),
      PurchaseModel.aggregate([{ $match: { ...scope, ...salesDate, status: 'RECEIVED' } }, { $group: { _id: null, totalCents: { $sum: '$totalCents' }, count: { $sum: 1 } } }]),
      ExpenseModel.aggregate([{ $match: { ...scope, ...expenseDate } }, { $group: { _id: null, totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } }]),
      PaymentModel.aggregate([{ $match: { ...scope, ...salesDate } }, { $group: { _id: null, totalCents: { $sum: '$amountCents' }, count: { $sum: 1 } } }]),
      JournalEntryModel.aggregate([{ $match: ledgerScope }, { $unwind: '$lines' }, { $group: { _id: null, debitCents: { $sum: '$lines.debitCents' }, creditCents: { $sum: '$lines.creditCents' }, entryCount: { $addToSet: '$_id' } } }, { $project: { debitCents: 1, creditCents: 1, entryCount: { $size: '$entryCount' } } }])
    ]);

    response.json({
      success: true,
      message: 'Resumen consultado',
      data: buildSummaryReport({
        sales: sales[0],
        purchases: purchases[0],
        expenses: expenses[0],
        payments: payments[0],
        ledger: ledger[0] ? { debitCents: ledger[0].debitCents, creditCents: ledger[0].creditCents, entryCount: ledger[0].entryCount } : undefined
      })
    });
  } catch (error) { if (error instanceof z.ZodError) { response.status(422).json({ success: false, message: 'Filtros invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; } next(error); }
};
