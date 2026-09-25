import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BranchModel } from '../../src/models/branch.model.js';
import { CompanyModel } from '../../src/models/company.model.js';
import { AttendanceModel, EmployeeModel, LeaveRequestModel } from '../../src/models/hr.model.js';
import { getMasterDataModel } from '../../src/models/master-data.model.js';
import { AccountModel, AccountingPeriodModel, JournalEntryModel } from '../../src/models/accounting.model.js';
import { InventoryBalanceModel } from '../../src/models/inventory.model.js';
import { POSSessionModel, POSTicketModel } from '../../src/models/pos.model.js';
import { PurchaseInvoiceModel, PurchaseModel } from '../../src/models/purchase.model.js';
import { SaleModel, SaleReturnModel } from '../../src/models/sale.model.js';
import { SalesInvoiceModel, SalesOrderModel, SalesQuoteModel } from '../../src/models/sales-workflow.model.js';
import { applyInventoryMovement, createInventoryReservation, releaseInventoryReservation, transferInventory } from '../../src/services/inventory.service.js';
import { createAccount, createAccountingPeriod, getTrialBalance, postJournalEntry } from '../../src/services/accounting.service.js';
import { createPurchaseInvoice, createPurchaseRequest, createSupplierQuote, decidePurchase, awardSupplierQuote, paySupplierInvoice, receivePurchase } from '../../src/services/purchase.service.js';
import { createPayment, createSale, returnSale } from '../../src/services/sale.service.js';
import { convertSalesQuote, createSalesInvoice, createSalesQuote, deliverSalesOrder } from '../../src/services/sales-workflow.service.js';
import { closePOSession, createPOSTicket, openPOSession } from '../../src/services/pos.service.js';
import { createAttendance, createEmployee, createLeaveRequest, HRError, reviewLeaveRequest } from '../../src/services/hr.service.js';

const enabled = process.env.RUN_MONGO_INTEGRATION === '1';

describe.skipIf(!enabled)('ERP transactional workflows on Mongo replica set', () => {
  const companyId = new Types.ObjectId();
  const branchId = new Types.ObjectId();
  const tenant = { companyId: companyId.toString(), branchId: branchId.toString() };
  const actor = new Types.ObjectId().toString();
  const productCode = `GATE-${Date.now()}`.toUpperCase();
  const supplierCode = `SUP-${Date.now()}`.toUpperCase();
  const warehouseCode = 'MAIN';
  const secondWarehouseCode = 'SECONDARY';

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is required when RUN_MONGO_INTEGRATION=1');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await CompanyModel.create({ _id: companyId, code: `GATE-${Date.now()}`, legalName: 'Gate Test SA', name: 'Gate Test', status: 'ACTIVE' });
    await BranchModel.create({ _id: branchId, companyId, code: `BR-${Date.now()}`, name: 'Sucursal Gate', status: 'ACTIVE' });
    const Product = getMasterDataModel('products');
    const Supplier = getMasterDataModel('suppliers');
    const Warehouse = getMasterDataModel('warehouses');
    const PaymentMethod = getMasterDataModel('payment-methods');
    await Product.create({ companyId, code: productCode, name: 'Producto Gate', status: 'ACTIVE', attributes: { trackInventory: true, trackLots: false, trackSerials: false, priceCents: 3000 } });
    await Supplier.create({ companyId, code: supplierCode, name: 'Proveedor Gate', status: 'ACTIVE', attributes: {} });
    await Warehouse.create([
      { companyId, branchId, code: warehouseCode, name: 'Almacen principal', status: 'ACTIVE', attributes: { allowNegativeStock: false } },
      { companyId, branchId, code: secondWarehouseCode, name: 'Almacen secundario', status: 'ACTIVE', attributes: { allowNegativeStock: false } }
    ]);
    await PaymentMethod.create({ companyId, code: 'CASH', name: 'Efectivo', status: 'ACTIVE', attributes: { methodType: 'CASH', requiresReference: false } });
  });

  afterAll(async () => {
    const companyFilters = [{ companyId }, { companyId: companyId.toString() }];
    const cleanupModels = [
      AccountModel, AccountingPeriodModel, JournalEntryModel, InventoryBalanceModel, POSSessionModel, POSTicketModel,
      PurchaseInvoiceModel, PurchaseModel, SaleModel, SaleReturnModel, SalesInvoiceModel, SalesOrderModel, SalesQuoteModel,
      AttendanceModel, EmployeeModel, LeaveRequestModel, EmployeeModel, CompanyModel, BranchModel
    ] as Array<{ deleteMany: (filter: unknown) => Promise<unknown> }>;
    for (const model of cleanupModels) await model.deleteMany({ $or: companyFilters });
    for (const kind of ['products', 'suppliers', 'warehouses', 'payment-methods'] as const) await getMasterDataModel(kind).deleteMany({ $or: companyFilters });
    await mongoose.disconnect();
  });

  it('executes inventory, purchasing, sales, accounting, and POS gates', async () => {
    await createEmployee({ employeeNumber: 'GATE-EMP-001', firstName: 'Ana', lastName: 'Gate', hiredAt: new Date('2026-01-01') }, actor, tenant);
    const attendance = await createAttendance({ employeeNumber: 'GATE-EMP-001', workDate: '2026-09-24', status: 'PRESENT', checkIn: new Date('2026-09-24T08:00:00Z'), checkOut: new Date('2026-09-24T17:00:00Z') }, actor, tenant);
    expect(attendance.status).toBe('PRESENT');
    await createLeaveRequest({ requestNumber: 'GATE-LEAVE-001', employeeNumber: 'GATE-EMP-001', type: 'VACATION', startDate: new Date('2026-10-01'), endDate: new Date('2026-10-02'), reason: 'Descanso' }, actor, tenant);
    expect((await reviewLeaveRequest('GATE-LEAVE-001', { status: 'APPROVED' }, actor, tenant)).status).toBe('APPROVED');
    await expect(createLeaveRequest({ requestNumber: 'GATE-LEAVE-002', employeeNumber: 'GATE-EMP-001', type: 'PERSONAL', startDate: new Date('2026-10-02'), endDate: new Date('2026-10-03') }, actor, tenant)).rejects.toMatchObject({ code: 'LEAVE_OVERLAP' } satisfies Partial<HRError>);

    const firstMovement = await applyInventoryMovement({ productCode, warehouseCode, type: 'IN', quantity: 10, reason: 'Carga inicial' }, 'gate-stock-001', actor, tenant);
    const repeatedMovement = await applyInventoryMovement({ productCode, warehouseCode, type: 'IN', quantity: 10, reason: 'Carga inicial' }, 'gate-stock-001', actor, tenant);
    expect(firstMovement.balance.quantity).toBe(10);
    expect(repeatedMovement.balance.quantity).toBe(10);

    const reservation = await createInventoryReservation({ reservationNumber: 'GATE-RES-001', productCode, warehouseCode, quantity: 2, reason: 'Reserva gate' }, 'gate-reserve-001', actor, tenant);
    expect(reservation.balance.reservedQuantity).toBe(2);
    await releaseInventoryReservation('GATE-RES-001', 'Liberacion gate', 'gate-release-001', actor, tenant);
    const transfer = await transferInventory({ transferNumber: 'GATE-TRF-001', productCode, sourceWarehouseCode: warehouseCode, destinationWarehouseCode: secondWarehouseCode, quantity: 2, reason: 'Traslado gate' }, 'gate-transfer-001', actor, tenant);
    expect(transfer.destination.quantity).toBe(2);

    const request = await createPurchaseRequest({ requestNumber: 'GATE-REQ-001', warehouseCode, reason: 'Reposicion gate', lines: [{ productCode, quantity: 5 }] }, actor, tenant);
    expect(request.status).toBe('REQUESTED');
    await createSupplierQuote('GATE-REQ-001', { quoteNumber: 'GATE-Q-001', supplierCode, validUntil: new Date(Date.now() + 86_400_000), lines: [{ productCode, quantity: 5, unitCostCents: 1000 }] }, actor, tenant);
    await awardSupplierQuote('GATE-REQ-001', { quoteNumber: 'GATE-Q-001', purchaseNumber: 'GATE-PUR-001' }, actor, tenant);
    expect((await PurchaseModel.findOne({ ...tenant, purchaseNumber: 'GATE-PUR-001' }))?.status).toBe('PENDING_APPROVAL');
    await decidePurchase('GATE-PUR-001', { decision: 'APPROVE', reason: 'Aprobado para gate' }, actor, tenant);
    const receipt = await receivePurchase('GATE-PUR-001', { receiptNumber: 'GATE-REC-001', lines: [{ productCode, quantity: 5 }] }, 'gate-receipt-001', actor, tenant);
    expect(receipt.purchase.status).toBe('RECEIVED');
    const purchaseInvoice = await createPurchaseInvoice('GATE-PUR-001', { invoiceNumber: 'GATE-PI-001', issuedAt: new Date(), dueAt: new Date(Date.now() + 86_400_000), taxCents: 0, lines: [{ productCode, quantity: 5, unitCostCents: 1000 }] }, 'gate-purchase-invoice-001', actor, tenant);
    const paidPurchase = await paySupplierInvoice('GATE-PI-001', { paymentNumber: 'GATE-SP-001', amountCents: purchaseInvoice.totalCents, methodCode: 'CASH' }, 'gate-supplier-payment-001', actor, tenant);
    expect(paidPurchase.invoice.status).toBe('PAID');

    const quote = await createSalesQuote({ quoteNumber: 'GATE-SQ-001', warehouseCode, validUntil: new Date(Date.now() + 86_400_000), discountBps: 0, taxBps: 0, lines: [{ productCode, quantity: 2, unitPriceCents: 3000 }] }, actor, tenant);
    await convertSalesQuote({ orderNumber: 'GATE-SO-001' }, quote.quoteNumber, actor, tenant);
    const delivery = await deliverSalesOrder('GATE-SO-001', { deliveryNumber: 'GATE-DEL-001', saleNumber: 'GATE-SALE-WF-001', lines: [{ productCode, quantity: 2 }] }, 'gate-delivery-001', actor, tenant);
    const salesInvoice = await createSalesInvoice('GATE-SALE-WF-001', { invoiceNumber: 'GATE-SI-001', issuedAt: new Date() }, 'gate-sales-invoice-001', actor, tenant);
    expect(delivery.sale.totalCents).toBe(6000);
    expect(salesInvoice.totalCents).toBe(6000);
    const paidSale = await createPayment('GATE-SALE-WF-001', { amountCents: 6000, method: 'CASH' }, actor, tenant, 'gate-sale-payment-001');
    expect(paidSale.sale.status).toBe('PAID');
    const returnedSale = await returnSale('GATE-SALE-WF-001', { returnNumber: 'GATE-RET-001', reason: 'Devolucion gate', refundAmountCents: 3000, refundMethod: 'CASH', lines: [{ productCode, quantity: 1 }] }, 'gate-sale-return-001', actor, tenant);
    expect(returnedSale.return.totalCreditCents).toBe(3000);

    await createAccount({ code: '1000', name: 'Caja', type: 'ASSET', normalBalance: 'DEBIT', postable: true }, companyId.toString());
    await createAccount({ code: '4000', name: 'Ventas', type: 'REVENUE', normalBalance: 'CREDIT', postable: true }, companyId.toString());
    await createAccountingPeriod({ periodNumber: '2026-01', startAt: new Date('2026-01-01'), endAt: new Date('2026-12-31') }, companyId.toString());
    await postJournalEntry({ entryNumber: 'GATE-JE-001', periodNumber: '2026-01', entryAt: new Date('2026-09-24'), description: 'Venta gate', sourceType: 'SALE', sourceId: 'GATE-SALE-WF-001', lines: [{ accountCode: '1000', debitCents: 6000, creditCents: 0 }, { accountCode: '4000', debitCents: 0, creditCents: 6000 }] }, 'gate-accounting-001', actor, tenant);
    const trialBalance = await getTrialBalance(tenant);
    expect(trialBalance.balanced).toBe(true);
    expect(trialBalance.debitTotalCents).toBe(6000);

    const pos = await openPOSession({ sessionNumber: 'GATE-POS-001', terminalCode: 'TERM-01', openingCashCents: 1000 }, actor, tenant);
    const ticket = await createPOSTicket({ ticketNumber: 'GATE-TICKET-001', sessionNumber: pos.sessionNumber, paymentNumber: 'GATE-POS-PAY-001', paymentMethod: 'CASH', sale: { saleNumber: 'GATE-SALE-POS-001', warehouseCode, discountBps: 0, taxBps: 0, lines: [{ productCode, quantity: 1, unitPriceCents: 3000 }] } }, 'gate-pos-ticket-001', actor, tenant);
    expect(ticket.sale.status).toBe('PAID');
    await closePOSession(pos.sessionNumber, { countedCashCents: 4000 }, actor, tenant);
    const closed = await POSSessionModel.findOne({ ...tenant, sessionNumber: pos.sessionNumber });
    expect(closed?.status).toBe('CLOSED');
    expect(closed?.cashDifferenceCents).toBe(0);
  }, 30000);
});