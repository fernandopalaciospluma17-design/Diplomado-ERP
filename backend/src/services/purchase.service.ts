import { CatalogModel } from '../models/catalog.model.js';
import { getMasterDataModel } from '../models/master-data.model.js';
import mongoose, { type ClientSession } from 'mongoose';
import { PurchaseInvoiceModel, PurchaseModel, PurchaseReceiptModel, PurchaseReturnModel, SupplierCreditNoteModel, SupplierPaymentModel } from '../models/purchase.model.js';
import { PurchaseRequestModel, SupplierQuoteModel } from '../models/procurement.model.js';
import { applyPurchaseReceiptMovement, applyPurchaseReturnMovement, runIdempotent } from './inventory.service.js';
import type { ApplySupplierCreditInput, AwardSupplierQuoteInput, CreatePurchaseInput, CreatePurchaseInvoiceInput, CreatePurchaseRequestInput, CreatePurchaseReturnInput, CreateSupplierPaymentInput, CreateSupplierQuoteInput, PurchaseDecisionInput, ReceivePurchaseInput } from '../validators/purchase.validators.js';

type Tenant = { companyId: string; branchId: string };

export class PurchaseError extends Error {
  constructor(public readonly code: 'PURCHASE_EXISTS' | 'PURCHASE_NOT_FOUND' | 'PURCHASE_NOT_RECEIVABLE' | 'PURCHASE_REFERENCE_INVALID' | 'OVER_RECEIPT' | 'RECEIPT_EXISTS' | 'PURCHASE_HAS_RECEIPTS' | 'REQUEST_EXISTS' | 'REQUEST_NOT_FOUND' | 'REQUEST_NOT_OPEN' | 'QUOTE_EXISTS' | 'QUOTE_NOT_FOUND' | 'QUOTE_INVALID' | 'QUOTE_EXPIRED' | 'QUOTE_ALREADY_AWARDED' | 'PROCUREMENT_TRANSACTION_REQUIRED' | 'INVOICE_EXISTS' | 'INVOICE_NOT_FOUND' | 'INVOICE_NOT_READY' | 'INVOICE_OVERBILL' | 'PAYMENT_EXISTS' | 'PAYMENT_OVERDUE_BALANCE' | 'PAYMENT_METHOD_INVALID' | 'PURCHASE_APPROVAL_STATE' | 'RETURN_EXISTS' | 'RETURN_INVALID' | 'CREDIT_NOTE_EXISTS' | 'CREDIT_NOTE_NOT_FOUND' | 'CREDIT_OVERBALANCE') {
    const messages = {
      PURCHASE_EXISTS: 'El numero de compra ya esta registrado', PURCHASE_NOT_FOUND: 'Compra no encontrada',
      PURCHASE_NOT_RECEIVABLE: 'La compra no admite recepciones', PURCHASE_REFERENCE_INVALID: 'Proveedor, producto o almacen no existe o esta inactivo',
      OVER_RECEIPT: 'La cantidad recibida supera lo ordenado', RECEIPT_EXISTS: 'El numero de recepcion ya fue registrado',
      PURCHASE_HAS_RECEIPTS: 'No se puede cancelar una compra con recepciones registradas',
      REQUEST_EXISTS: 'El numero de solicitud ya esta registrado', REQUEST_NOT_FOUND: 'Solicitud de compra no encontrada', REQUEST_NOT_OPEN: 'La solicitud ya fue convertida o cancelada',
      QUOTE_EXISTS: 'El numero de cotizacion ya esta registrado', QUOTE_NOT_FOUND: 'Cotizacion no encontrada', QUOTE_INVALID: 'La cotizacion no corresponde a todos los productos y cantidades solicitados',
      QUOTE_EXPIRED: 'La cotizacion ya vencio', QUOTE_ALREADY_AWARDED: 'La solicitud ya tiene una cotizacion adjudicada', PROCUREMENT_TRANSACTION_REQUIRED: 'MongoDB debe operar como replica set para completar esta operacion atomica',
      INVOICE_EXISTS: 'El numero de factura ya esta registrado', INVOICE_NOT_FOUND: 'Factura de proveedor no encontrada', INVOICE_NOT_READY: 'La orden aun no tiene recepciones facturables', INVOICE_OVERBILL: 'La cantidad facturada supera lo recibido',
      PAYMENT_EXISTS: 'El numero de pago ya esta registrado', PAYMENT_OVERDUE_BALANCE: 'El pago supera el saldo pendiente de la factura', PAYMENT_METHOD_INVALID: 'El metodo de pago no existe o esta inactivo', PURCHASE_APPROVAL_STATE: 'La orden ya fue aprobada, rechazada o no admite decision',
      RETURN_EXISTS: 'El numero de devolucion ya esta registrado', RETURN_INVALID: 'La devolucion no coincide con cantidades recibidas y facturadas', CREDIT_NOTE_EXISTS: 'El numero de nota de credito ya esta registrado', CREDIT_NOTE_NOT_FOUND: 'Nota de credito de proveedor no encontrada', CREDIT_OVERBALANCE: 'La aplicacion supera la nota de credito disponible o la cuenta por pagar'
    } satisfies Record<PurchaseError['code'], string>;
    super(messages[code]);
  }
}

async function existsMasterOrLegacy(kind: 'suppliers' | 'products' | 'warehouses', legacyKind: 'SUPPLIER' | 'PRODUCT' | 'WAREHOUSE', code: string, tenant: Tenant, session?: ClientSession) {
  const typedFilter = kind === 'warehouses'
    ? { companyId: tenant.companyId, branchId: tenant.branchId, code, status: 'ACTIVE' }
    : { companyId: tenant.companyId, code, status: 'ACTIVE' };
  if (await getMasterDataModel(kind).exists(typedFilter).session(session ?? null)) return true;
  return Boolean(await CatalogModel.exists({ companyId: tenant.companyId, branchId: tenant.branchId, kind: legacyKind, code, status: 'ACTIVE' }).session(session ?? null));
}

export async function listPurchases(companyId: string, branchId: string) {
  return PurchaseModel.find({ companyId, branchId }).sort({ createdAt: -1 }).limit(100);
}

export async function decidePurchase(purchaseNumber: string, input: PurchaseDecisionInput, actorId: string, tenant: Tenant) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const purchase = await PurchaseModel.findOne({ ...tenant, purchaseNumber: purchaseNumber.toUpperCase() }).session(session);
      if (!purchase) throw new PurchaseError('PURCHASE_NOT_FOUND');
      const targetStatus = input.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      if (purchase.status === targetStatus) { result = purchase.toObject(); return; }
      if (purchase.status !== 'PENDING_APPROVAL') throw new PurchaseError('PURCHASE_APPROVAL_STATE');
      purchase.status = targetStatus;
      if (input.decision === 'APPROVE') { purchase.approvedBy = actorId; purchase.approvedAt = new Date(); purchase.approvalReason = input.reason; }
      else purchase.approvalReason = input.reason;
      await purchase.save({ session });
      result = purchase.toObject();
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support transactions/i.test((error as Error).message ?? '')) throw new PurchaseError('PROCUREMENT_TRANSACTION_REQUIRED');
    throw error;
  } finally { await session.endSession(); }
}

export async function listPurchaseRequests(companyId: string, branchId: string) {
  return PurchaseRequestModel.find({ companyId, branchId }).sort({ createdAt: -1 }).limit(100);
}

export async function createPurchaseRequest(input: CreatePurchaseRequestInput, createdBy: string, tenant: Tenant) {
  if (await PurchaseRequestModel.exists({ ...tenant, requestNumber: input.requestNumber })) throw new PurchaseError('REQUEST_EXISTS');
  const refs = await Promise.all([
    existsMasterOrLegacy('warehouses', 'WAREHOUSE', input.warehouseCode, tenant),
    ...input.lines.map((line) => existsMasterOrLegacy('products', 'PRODUCT', line.productCode, tenant))
  ]);
  if (refs.some((exists) => !exists)) throw new PurchaseError('PURCHASE_REFERENCE_INVALID');
  try { return await PurchaseRequestModel.create({ ...tenant, ...input, status: 'REQUESTED', createdBy }); }
  catch (error) { if ((error as { code?: number }).code === 11000) throw new PurchaseError('REQUEST_EXISTS'); throw error; }
}

export async function listSupplierQuotes(requestNumber: string, tenant: Tenant) {
  if (!await PurchaseRequestModel.exists({ ...tenant, requestNumber: requestNumber.toUpperCase() })) throw new PurchaseError('REQUEST_NOT_FOUND');
  return SupplierQuoteModel.find({ ...tenant, requestNumber: requestNumber.toUpperCase() }).sort({ createdAt: -1 }).limit(100);
}

export async function createSupplierQuote(requestNumber: string, input: CreateSupplierQuoteInput, createdBy: string, tenant: Tenant) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const request = await PurchaseRequestModel.findOne({ ...tenant, requestNumber: requestNumber.toUpperCase() }).session(session);
      if (!request) throw new PurchaseError('REQUEST_NOT_FOUND');
      if (request.status !== 'REQUESTED' && request.status !== 'QUOTED') throw new PurchaseError('REQUEST_NOT_OPEN');
      if (input.validUntil <= new Date()) throw new PurchaseError('QUOTE_EXPIRED');
      if (await SupplierQuoteModel.exists({ ...tenant, quoteNumber: input.quoteNumber }).session(session)) throw new PurchaseError('QUOTE_EXISTS');
      if (!await existsMasterOrLegacy('suppliers', 'SUPPLIER', input.supplierCode, tenant, session)) throw new PurchaseError('PURCHASE_REFERENCE_INVALID');
      const requested = new Map(request.lines.map((line) => [line.productCode, line.quantity]));
      if (input.lines.length !== requested.size || input.lines.some((line) => requested.get(line.productCode) !== line.quantity)) throw new PurchaseError('QUOTE_INVALID');
      const [quote] = await SupplierQuoteModel.create([{ ...tenant, requestNumber: request.requestNumber, ...input, status: 'RECEIVED', createdBy }], { session });
      if (!quote) throw new Error('No se pudo guardar la cotizacion');
      request.status = 'QUOTED';
      await request.save({ session });
      result = quote.toObject();
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new PurchaseError('QUOTE_EXISTS');
    if ((error as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support transactions/i.test((error as Error).message ?? '')) throw new PurchaseError('PROCUREMENT_TRANSACTION_REQUIRED');
    throw error;
  } finally { await session.endSession(); }
}

export async function awardSupplierQuote(requestNumber: string, input: AwardSupplierQuoteInput, createdBy: string, tenant: Tenant) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const request = await PurchaseRequestModel.findOne({ ...tenant, requestNumber: requestNumber.toUpperCase() }).session(session);
      if (!request) throw new PurchaseError('REQUEST_NOT_FOUND');
      if (request.status === 'ORDERED') throw new PurchaseError('QUOTE_ALREADY_AWARDED');
      if (request.status !== 'REQUESTED' && request.status !== 'QUOTED') throw new PurchaseError('REQUEST_NOT_OPEN');
      const quote = await SupplierQuoteModel.findOne({ ...tenant, requestNumber: request.requestNumber, quoteNumber: input.quoteNumber }).session(session);
      if (!quote) throw new PurchaseError('QUOTE_NOT_FOUND');
      if (quote.status !== 'RECEIVED') throw new PurchaseError('QUOTE_ALREADY_AWARDED');
      if (quote.validUntil <= new Date()) throw new PurchaseError('QUOTE_EXPIRED');
      const references = await Promise.all([
        existsMasterOrLegacy('suppliers', 'SUPPLIER', quote.supplierCode, tenant, session),
        existsMasterOrLegacy('warehouses', 'WAREHOUSE', request.warehouseCode, tenant, session),
        ...request.lines.map((line) => existsMasterOrLegacy('products', 'PRODUCT', line.productCode, tenant, session))
      ]);
      if (references.some((exists) => !exists)) throw new PurchaseError('PURCHASE_REFERENCE_INVALID');
      if (await PurchaseModel.exists({ ...tenant, purchaseNumber: input.purchaseNumber }).session(session)) throw new PurchaseError('PURCHASE_EXISTS');
      const lines = quote.lines.map((line) => ({ ...line, lineTotalCents: Math.round(line.quantity * line.unitCostCents), receivedQuantity: 0, invoicedQuantity: 0, returnedQuantity: 0 }));
      const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
      const [purchase] = await PurchaseModel.create([{ ...tenant, purchaseNumber: input.purchaseNumber, supplierCode: quote.supplierCode, warehouseCode: request.warehouseCode, requestNumber: request.requestNumber, quoteNumber: quote.quoteNumber, lines, subtotalCents, totalCents: subtotalCents, status: 'PENDING_APPROVAL', createdBy }], { session });
      if (!purchase) throw new Error('No se pudo crear la orden de compra');
      quote.status = 'AWARDED';
      quote.purchaseNumber = purchase.purchaseNumber;
      await quote.save({ session });
      await SupplierQuoteModel.updateMany({ ...tenant, requestNumber: request.requestNumber, _id: { $ne: quote._id }, status: 'RECEIVED' }, { $set: { status: 'NOT_SELECTED' } }, { session });
      request.status = 'ORDERED';
      request.awardedQuoteNumber = quote.quoteNumber;
      request.purchaseNumber = purchase.purchaseNumber;
      await request.save({ session });
      result = { request: request.toObject(), quote: quote.toObject(), purchase: purchase.toObject() };
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new PurchaseError('PURCHASE_EXISTS');
    if ((error as { code?: number }).code === 20 || /Transaction numbers are only allowed|does not support transactions/i.test((error as Error).message ?? '')) throw new PurchaseError('PROCUREMENT_TRANSACTION_REQUIRED');
    throw error;
  } finally { await session.endSession(); }
}

export async function createPurchase(input: CreatePurchaseInput, createdBy: string, tenant: Tenant) {
  if (await PurchaseModel.exists({ companyId: tenant.companyId, purchaseNumber: input.purchaseNumber })) throw new PurchaseError('PURCHASE_EXISTS');
  const refs = await Promise.all([
    existsMasterOrLegacy('suppliers', 'SUPPLIER', input.supplierCode, tenant),
    existsMasterOrLegacy('warehouses', 'WAREHOUSE', input.warehouseCode, tenant),
    ...input.lines.map((line) => existsMasterOrLegacy('products', 'PRODUCT', line.productCode, tenant))
  ]);
  if (refs.some((exists) => !exists)) throw new PurchaseError('PURCHASE_REFERENCE_INVALID');
  const lines = input.lines.map((line) => ({ ...line, lineTotalCents: Math.round(line.quantity * line.unitCostCents), receivedQuantity: 0, invoicedQuantity: 0, returnedQuantity: 0 }));
  const subtotalCents = lines.reduce((total, line) => total + line.lineTotalCents, 0);
  try {
    return await PurchaseModel.create({ ...input, ...tenant, lines, subtotalCents, totalCents: subtotalCents, status: 'PENDING_APPROVAL', createdBy });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new PurchaseError('PURCHASE_EXISTS');
    throw error;
  }
}

export async function receivePurchase(purchaseNumber: string, input: ReceivePurchaseInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('PURCHASE_RECEIPT', idempotencyKey, { purchaseNumber, ...input }, createdBy, tenant, async (session, operationId) => {
    const purchase = await PurchaseModel.findOne({ ...tenant, purchaseNumber: purchaseNumber.toUpperCase() }).session(session);
    if (!purchase) throw new PurchaseError('PURCHASE_NOT_FOUND');
    if (purchase.status !== 'APPROVED' && purchase.status !== 'ORDERED' && purchase.status !== 'PARTIALLY_RECEIVED') throw new PurchaseError('PURCHASE_NOT_RECEIVABLE');
    if (await PurchaseReceiptModel.exists({ ...tenant, receiptNumber: input.receiptNumber }).session(session)) throw new PurchaseError('RECEIPT_EXISTS');

    const lines = [];
    let totalCostCents = 0;
    for (const requested of input.lines) {
      const ordered = purchase.lines.find((line) => line.productCode === requested.productCode);
      if (!ordered) throw new PurchaseError('OVER_RECEIPT');
      const remaining = ordered.quantity - (ordered.receivedQuantity ?? 0);
      if (requested.quantity > remaining + 1e-9) throw new PurchaseError('OVER_RECEIPT');
      const amountCents = Math.round(requested.quantity * ordered.unitCostCents);
      const movementResult = await applyPurchaseReceiptMovement({ productCode: requested.productCode, warehouseCode: purchase.warehouseCode, locationCode: input.locationCode, quantity: requested.quantity, receiptNumber: input.receiptNumber, lotCode: requested.lotCode, expiresAt: requested.expiresAt, serialNumbers: requested.serialNumbers }, tenant, createdBy, operationId, lines.length, session);
      ordered.receivedQuantity = Number(((ordered.receivedQuantity ?? 0) + requested.quantity).toFixed(6));
      totalCostCents += amountCents;
      lines.push({ productCode: requested.productCode, quantity: requested.quantity, unitCostCents: ordered.unitCostCents, lineTotalCents: amountCents, lotCode: requested.lotCode, expiresAt: requested.expiresAt, serialNumbers: requested.serialNumbers, balance: movementResult.balance, movement: movementResult.movement });
    }
    purchase.status = purchase.lines.every((line) => (line.receivedQuantity ?? 0) >= line.quantity - 1e-9) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    const [receipt] = await PurchaseReceiptModel.create([{
      ...tenant, purchaseNumber: purchase.purchaseNumber, receiptNumber: input.receiptNumber, warehouseCode: purchase.warehouseCode, locationCode: input.locationCode,
      lines: lines.map(({ productCode, quantity, unitCostCents, lineTotalCents, lotCode, expiresAt, serialNumbers }) => ({ productCode, quantity, unitCostCents, lineTotalCents, lotCode, expiresAt, serialNumbers })),
      totalCostCents, createdBy, operationId
    }], { session });
    if (!receipt) throw new Error('No se pudo guardar la recepcion de compra');
    await purchase.save({ session });
    return { purchase: purchase.toObject(), receipt: receipt.toObject(), inventory: lines.map(({ productCode, balance, movement }) => ({ productCode, balance, movement })) };
  });
}

export async function listPurchaseReceipts(purchaseNumber: string, companyId: string, branchId: string) {
  return PurchaseReceiptModel.find({ companyId, branchId, purchaseNumber: purchaseNumber.toUpperCase() }).sort({ createdAt: -1 }).limit(100);
}

export async function listPurchaseInvoices(companyId: string, branchId: string, outstandingOnly = false) {
  return PurchaseInvoiceModel.find({ companyId, branchId, ...(outstandingOnly ? { outstandingCents: { $gt: 0 } } : {}) }).sort({ dueAt: 1, createdAt: -1 }).limit(200);
}

export async function createPurchaseInvoice(purchaseNumber: string, input: CreatePurchaseInvoiceInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('PURCHASE_INVOICE', idempotencyKey, { purchaseNumber: purchaseNumber.toUpperCase(), ...input }, createdBy, tenant, async (session, operationId) => {
    const purchase = await PurchaseModel.findOne({ ...tenant, purchaseNumber: purchaseNumber.toUpperCase() }).session(session);
    if (!purchase) throw new PurchaseError('PURCHASE_NOT_FOUND');
    if (purchase.status === 'CANCELLED') throw new PurchaseError('INVOICE_NOT_READY');
    if (await PurchaseInvoiceModel.exists({ ...tenant, invoiceNumber: input.invoiceNumber }).session(session)) throw new PurchaseError('INVOICE_EXISTS');
    const lines = [];
    for (const requested of input.lines) {
      const ordered = purchase.lines.find((line) => line.productCode === requested.productCode);
      if (!ordered || requested.quantity > (ordered.receivedQuantity ?? 0) - (ordered.invoicedQuantity ?? 0) + 1e-9) throw new PurchaseError('INVOICE_OVERBILL');
      const lineTotalCents = Math.round(requested.quantity * requested.unitCostCents);
      lines.push({ ...requested, lineTotalCents });
      ordered.invoicedQuantity = Number(((ordered.invoicedQuantity ?? 0) + requested.quantity).toFixed(6));
    }
    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const totalCents = subtotalCents + input.taxCents;
    if (!Number.isSafeInteger(totalCents)) throw new PurchaseError('INVOICE_OVERBILL');
    const [invoice] = await PurchaseInvoiceModel.create([{
      ...tenant, invoiceNumber: input.invoiceNumber, purchaseNumber: purchase.purchaseNumber, supplierCode: purchase.supplierCode!, issuedAt: input.issuedAt, dueAt: input.dueAt,
      lines, subtotalCents, taxCents: input.taxCents, totalCents, paidCents: 0, outstandingCents: totalCents, status: totalCents === 0 ? 'PAID' : 'OPEN', createdBy, operationId
    }], { session });
    if (!invoice) throw new Error('No se pudo guardar la factura de proveedor');
    await purchase.save({ session });
    return invoice.toObject();
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new PurchaseError('INVOICE_EXISTS');
    throw error;
  });
}

export async function listSupplierPayments(invoiceNumber: string, tenant: Tenant) {
  if (!await PurchaseInvoiceModel.exists({ ...tenant, invoiceNumber: invoiceNumber.toUpperCase() })) throw new PurchaseError('INVOICE_NOT_FOUND');
  return SupplierPaymentModel.find({ ...tenant, invoiceNumber: invoiceNumber.toUpperCase() }).sort({ paidAt: -1 }).limit(100);
}

export async function listPurchaseReturns(tenant: Tenant, purchaseNumber?: string) {
  return PurchaseReturnModel.find({ ...tenant, ...(purchaseNumber ? { purchaseNumber: purchaseNumber.toUpperCase() } : {}) }).sort({ createdAt: -1 }).limit(100);
}

export async function listSupplierCreditNotes(tenant: Tenant) {
  return SupplierCreditNoteModel.find({ ...tenant, remainingCents: { $gt: 0 } }).sort({ createdAt: -1 }).limit(200);
}

export async function reconcilePurchases(tenant: Tenant) {
  const [invoices, payments, creditNotes, purchases, receipts, returns] = await Promise.all([
    PurchaseInvoiceModel.find(tenant).lean(), SupplierPaymentModel.find(tenant).lean(), SupplierCreditNoteModel.find(tenant).lean(),
    PurchaseModel.find(tenant).lean(), PurchaseReceiptModel.find(tenant).lean(), PurchaseReturnModel.find(tenant).lean()
  ]);
  const paymentsByInvoice = new Map<string, number>();
  for (const payment of payments) paymentsByInvoice.set(payment.invoiceNumber, (paymentsByInvoice.get(payment.invoiceNumber) ?? 0) + payment.amountCents);
  const creditsByInvoice = new Map<string, number>();
  for (const credit of creditNotes) for (const application of credit.applications) creditsByInvoice.set(application.invoiceNumber, (creditsByInvoice.get(application.invoiceNumber) ?? 0) + application.amountCents);
  const invoiceChecks = invoices.map((invoice) => {
    const paymentTotal = paymentsByInvoice.get(invoice.invoiceNumber) ?? 0;
    const creditTotal = creditsByInvoice.get(invoice.invoiceNumber) ?? 0;
    const expectedOutstanding = invoice.totalCents - invoice.paidCents - invoice.creditedCents;
    return { invoiceNumber: invoice.invoiceNumber, balanced: paymentTotal === invoice.paidCents && creditTotal === invoice.creditedCents && expectedOutstanding === invoice.outstandingCents && invoice.creditedCents <= invoice.totalCents - invoice.paidCents, storedPaidCents: invoice.paidCents, paymentTotalCents: paymentTotal, storedCreditedCents: invoice.creditedCents, appliedCreditCents: creditTotal, storedOutstandingCents: invoice.outstandingCents, expectedOutstandingCents: expectedOutstanding };
  });
  const receivedByPurchase = new Map<string, Map<string, number>>();
  for (const receipt of receipts) for (const line of receipt.lines) {
    const byProduct = receivedByPurchase.get(receipt.purchaseNumber) ?? new Map<string, number>();
    byProduct.set(line.productCode, (byProduct.get(line.productCode) ?? 0) + line.quantity); receivedByPurchase.set(receipt.purchaseNumber, byProduct);
  }
  const returnedByPurchase = new Map<string, Map<string, number>>();
  for (const returned of returns) for (const line of returned.lines) {
    const byProduct = returnedByPurchase.get(returned.purchaseNumber) ?? new Map<string, number>();
    byProduct.set(line.productCode, (byProduct.get(line.productCode) ?? 0) + line.quantity); returnedByPurchase.set(returned.purchaseNumber, byProduct);
  }
  const purchaseLineChecks = purchases.flatMap((purchase) => purchase.lines.map((line) => {
    const receiptTotal = receivedByPurchase.get(purchase.purchaseNumber)?.get(line.productCode) ?? 0;
    const returnTotal = returnedByPurchase.get(purchase.purchaseNumber)?.get(line.productCode) ?? 0;
    const storedReceived = line.receivedQuantity ?? 0; const storedReturned = line.returnedQuantity ?? 0;
    return { purchaseNumber: purchase.purchaseNumber, productCode: line.productCode, balanced: Math.abs(receiptTotal - storedReceived) < 1e-6 && Math.abs(returnTotal - storedReturned) < 1e-6 && storedReturned <= storedReceived + 1e-6 && line.invoicedQuantity <= storedReceived + 1e-6, storedReceived, receiptTotal, storedReturned, returnTotal, invoicedQuantity: line.invoicedQuantity };
  }));
  const discrepancyCount = [...invoiceChecks, ...purchaseLineChecks].filter((item) => !item.balanced).length;
  return { balanced: discrepancyCount === 0, discrepancyCount, invoiceChecks, purchaseLineChecks, checkedAt: new Date() };
}

export async function returnPurchase(purchaseNumber: string, input: CreatePurchaseReturnInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('PURCHASE_RETURN', idempotencyKey, { purchaseNumber: purchaseNumber.toUpperCase(), ...input }, createdBy, tenant, async (session, operationId) => {
    const purchase = await PurchaseModel.findOne({ ...tenant, purchaseNumber: purchaseNumber.toUpperCase() }).session(session);
    if (!purchase || !purchase.supplierCode) throw new PurchaseError('PURCHASE_NOT_FOUND');
    if (purchase.status === 'PENDING_APPROVAL' || purchase.status === 'REJECTED' || purchase.status === 'CANCELLED') throw new PurchaseError('RETURN_INVALID');
    const invoice = await PurchaseInvoiceModel.findOne({ ...tenant, invoiceNumber: input.invoiceNumber, purchaseNumber: purchase.purchaseNumber, supplierCode: purchase.supplierCode }).session(session);
    if (!invoice) throw new PurchaseError('INVOICE_NOT_FOUND');
    if (await PurchaseReturnModel.exists({ ...tenant, returnNumber: input.returnNumber }).session(session)) throw new PurchaseError('RETURN_EXISTS');
    if (await SupplierCreditNoteModel.exists({ ...tenant, creditNoteNumber: input.creditNoteNumber }).session(session)) throw new PurchaseError('CREDIT_NOTE_EXISTS');
    const lines = [];
    for (const requested of input.lines) {
      const ordered = purchase.lines.find((line) => line.productCode === requested.productCode);
      const billed = invoice.lines.find((line) => line.productCode === requested.productCode);
      if (!ordered || !billed || requested.quantity > (ordered.receivedQuantity ?? 0) - (ordered.returnedQuantity ?? 0) + 1e-9 || requested.quantity > billed.quantity - (billed.creditedQuantity ?? 0) + 1e-9) throw new PurchaseError('RETURN_INVALID');
      const movement = await applyPurchaseReturnMovement({ productCode: requested.productCode, warehouseCode: purchase.warehouseCode, locationCode: requested.locationCode, quantity: requested.quantity, returnNumber: input.returnNumber, lotCode: requested.lotCode, serialNumbers: requested.serialNumbers }, tenant, createdBy, operationId, lines.length, session);
      const lineTotalCents = Math.round(requested.quantity * billed.unitCostCents);
      lines.push({ ...requested, unitCostCents: billed.unitCostCents, lineTotalCents, movement: movement.movement });
      ordered.returnedQuantity = Number(((ordered.returnedQuantity ?? 0) + requested.quantity).toFixed(6));
      billed.creditedQuantity = Number(((billed.creditedQuantity ?? 0) + requested.quantity).toFixed(6));
    }
    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const priorReturns = await PurchaseReturnModel.find({ ...tenant, invoiceNumber: invoice.invoiceNumber }).select('taxCreditCents').session(session);
    const alreadyCreditedTax = priorReturns.reduce((sum, item) => sum + item.taxCreditCents, 0);
    const taxCreditCents = invoice.subtotalCents > 0 ? Math.min(invoice.taxCents - alreadyCreditedTax, Math.round(subtotalCents * invoice.taxCents / invoice.subtotalCents)) : 0;
    const totalCreditCents = subtotalCents + taxCreditCents;
    const [returnDoc] = await PurchaseReturnModel.create([{
      ...tenant, returnNumber: input.returnNumber, purchaseNumber: purchase.purchaseNumber, invoiceNumber: invoice.invoiceNumber, creditNoteNumber: input.creditNoteNumber,
      warehouseCode: purchase.warehouseCode, reason: input.reason, lines: lines.map(({ movement: _movement, ...line }) => line), subtotalCents, taxCreditCents, totalCreditCents, createdBy, operationId
    }], { session });
    if (!returnDoc) throw new Error('No se pudo guardar la devolucion');
    const [creditNote] = await SupplierCreditNoteModel.create([{
      ...tenant, creditNoteNumber: input.creditNoteNumber, supplierCode: purchase.supplierCode, purchaseNumber: purchase.purchaseNumber, returnNumber: input.returnNumber,
      invoiceNumber: invoice.invoiceNumber, amountCents: totalCreditCents, appliedCents: 0, remainingCents: totalCreditCents, applications: [], status: 'OPEN', createdBy, operationId
    }], { session });
    if (!creditNote) throw new Error('No se pudo emitir la nota de credito');
    await purchase.save({ session });
    await invoice.save({ session });
    return { purchase: purchase.toObject(), invoice: invoice.toObject(), return: returnDoc.toObject(), creditNote: creditNote.toObject(), inventoryMovements: lines.map((line) => line.movement) };
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) {
      const fields = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
      throw new PurchaseError(fields.includes('creditNoteNumber') ? 'CREDIT_NOTE_EXISTS' : 'RETURN_EXISTS');
    }
    throw error;
  });
}

export async function applySupplierCredit(creditNoteNumber: string, invoiceNumber: string, input: ApplySupplierCreditInput, idempotencyKey: string, actorId: string, tenant: Tenant) {
  return runIdempotent('APPLY_SUPPLIER_CREDIT', idempotencyKey, { creditNoteNumber: creditNoteNumber.toUpperCase(), invoiceNumber: invoiceNumber.toUpperCase(), ...input }, actorId, tenant, async (session) => {
    const credit = await SupplierCreditNoteModel.findOne({ ...tenant, creditNoteNumber: creditNoteNumber.toUpperCase() }).session(session);
    const invoice = await PurchaseInvoiceModel.findOne({ ...tenant, invoiceNumber: invoiceNumber.toUpperCase() }).session(session);
    if (!credit) throw new PurchaseError('CREDIT_NOTE_NOT_FOUND');
    if (!invoice) throw new PurchaseError('INVOICE_NOT_FOUND');
    if (credit.supplierCode !== invoice.supplierCode || input.amountCents > credit.remainingCents || input.amountCents > invoice.outstandingCents) throw new PurchaseError('CREDIT_OVERBALANCE');
    credit.appliedCents += input.amountCents;
    credit.remainingCents -= input.amountCents;
    credit.status = credit.remainingCents === 0 ? 'APPLIED' : 'PARTIALLY_APPLIED';
    credit.applications.push({ invoiceNumber: invoice.invoiceNumber, amountCents: input.amountCents });
    invoice.creditedCents += input.amountCents;
    invoice.outstandingCents -= input.amountCents;
    invoice.status = invoice.outstandingCents === 0 ? 'PAID' : invoice.paidCents + invoice.creditedCents > 0 ? 'PARTIALLY_PAID' : 'OPEN';
    await credit.save({ session });
    await invoice.save({ session });
    return { invoice: invoice.toObject(), creditNote: credit.toObject() };
  });
}

export async function paySupplierInvoice(invoiceNumber: string, input: CreateSupplierPaymentInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('SUPPLIER_PAYMENT', idempotencyKey, { invoiceNumber: invoiceNumber.toUpperCase(), ...input }, createdBy, tenant, async (session, operationId) => {
    const invoice = await PurchaseInvoiceModel.findOne({ ...tenant, invoiceNumber: invoiceNumber.toUpperCase() }).session(session);
    if (!invoice) throw new PurchaseError('INVOICE_NOT_FOUND');
    if (input.amountCents > invoice.outstandingCents) throw new PurchaseError('PAYMENT_OVERDUE_BALANCE');
    if (await SupplierPaymentModel.exists({ ...tenant, paymentNumber: input.paymentNumber }).session(session)) throw new PurchaseError('PAYMENT_EXISTS');
    const paymentMethod = await getMasterDataModel('payment-methods').exists({ companyId: tenant.companyId, code: input.methodCode, status: 'ACTIVE' }).session(session);
    if (!paymentMethod) throw new PurchaseError('PAYMENT_METHOD_INVALID');
    invoice.paidCents += input.amountCents;
    invoice.outstandingCents -= input.amountCents;
    invoice.status = invoice.outstandingCents === 0 ? 'PAID' : 'PARTIALLY_PAID';
    const [payment] = await SupplierPaymentModel.create([{ ...tenant, ...input, paidAt: input.paidAt ?? new Date(), invoiceNumber: invoice.invoiceNumber, createdBy, operationId }], { session });
    if (!payment) throw new Error('No se pudo guardar el pago a proveedor');
    await invoice.save({ session });
    return { invoice: invoice.toObject(), payment: payment.toObject() };
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new PurchaseError('PAYMENT_EXISTS');
    throw error;
  });
}

export async function cancelPurchase(purchaseNumber: string, reason: string, tenant: Tenant) {
  const purchase = await PurchaseModel.findOne({ ...tenant, purchaseNumber: purchaseNumber.toUpperCase() });
  if (!purchase) throw new PurchaseError('PURCHASE_NOT_FOUND');
  if (purchase.lines.some((line) => (line.receivedQuantity ?? 0) > 0)) throw new PurchaseError('PURCHASE_HAS_RECEIPTS');
  if (purchase.status === 'CANCELLED') return purchase;
  if (!['PENDING_APPROVAL', 'APPROVED', 'ORDERED'].includes(purchase.status)) throw new PurchaseError('PURCHASE_NOT_RECEIVABLE');
  purchase.status = 'CANCELLED';
  purchase.cancellationReason = reason;
  await purchase.save();
  return purchase;
}
