import mongoose from 'mongoose';
import { CatalogModel } from '../models/catalog.model.js';
import { getMasterDataModel } from '../models/master-data.model.js';
import { SaleModel } from '../models/sale.model.js';
import { SalesDeliveryModel, SalesInvoiceModel, SalesOrderModel, SalesQuoteModel } from '../models/sales-workflow.model.js';
import { runIdempotent } from './inventory.service.js';
import { createSaleInSession, SaleError } from './sale.service.js';
import type { ConvertSalesQuoteInput, CreateSalesDeliveryInput, CreateSalesInvoiceInput, CreateSalesOrderInput, CreateSalesQuoteInput } from '../validators/sales-workflow.validators.js';

type Tenant = { companyId: string; branchId: string };

async function validateRefs(input: { customerCode?: string; warehouseCode: string; lines: { productCode: string }[] }, tenant: Tenant, session?: mongoose.ClientSession) {
  const warehouse = await getMasterDataModel('warehouses').exists({ companyId: tenant.companyId, branchId: tenant.branchId, code: input.warehouseCode, status: 'ACTIVE' }).session(session ?? null)
    || await CatalogModel.exists({ companyId: tenant.companyId, branchId: tenant.branchId, kind: 'WAREHOUSE', code: input.warehouseCode, status: 'ACTIVE' }).session(session ?? null);
  if (!warehouse) throw new SaleError('SALE_REFERENCE_INVALID');
  if (input.customerCode) {
    const customer = await getMasterDataModel('customers').exists({ companyId: tenant.companyId, code: input.customerCode, status: 'ACTIVE' }).session(session ?? null)
      || await CatalogModel.exists({ companyId: tenant.companyId, branchId: tenant.branchId, kind: 'CUSTOMER', code: input.customerCode, status: 'ACTIVE' }).session(session ?? null);
    if (!customer) throw new SaleError('SALE_REFERENCE_INVALID');
  }
  const products = await Promise.all(input.lines.map(async ({ productCode }) => Boolean(
    await getMasterDataModel('products').exists({ companyId: tenant.companyId, code: productCode, status: 'ACTIVE' }).session(session ?? null)
      || await CatalogModel.exists({ companyId: tenant.companyId, branchId: tenant.branchId, kind: 'PRODUCT', code: productCode, status: 'ACTIVE' }).session(session ?? null)
  )));
  if (products.some((exists) => !exists)) throw new SaleError('SALE_REFERENCE_INVALID');
}

export async function listSalesQuotes(tenant: Tenant) { return SalesQuoteModel.find(tenant).sort({ createdAt: -1 }).limit(200); }
export async function createSalesQuote(input: CreateSalesQuoteInput, createdBy: string, tenant: Tenant) {
  if (input.validUntil <= new Date()) throw new SaleError('QUOTE_INVALID');
  await validateRefs(input, tenant);
  try { return await SalesQuoteModel.create({ ...tenant, ...input, status: 'OPEN', createdBy }); }
  catch (error) { if ((error as { code?: number }).code === 11000) throw new SaleError('QUOTE_EXISTS'); throw error; }
}

export async function convertSalesQuote(input: ConvertSalesQuoteInput, quoteNumber: string, createdBy: string, tenant: Tenant) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const quote = await SalesQuoteModel.findOne({ ...tenant, quoteNumber: quoteNumber.toUpperCase() }).session(session);
      if (!quote) throw new SaleError('QUOTE_NOT_FOUND');
      if (quote.status !== 'OPEN' || quote.validUntil <= new Date()) throw new SaleError('QUOTE_INVALID');
      if (await SalesOrderModel.exists({ ...tenant, orderNumber: input.orderNumber }).session(session)) throw new SaleError('ORDER_EXISTS');
      await validateRefs(quote, tenant, session);
      const [order] = await SalesOrderModel.create([{
        ...tenant, orderNumber: input.orderNumber, quoteNumber: quote.quoteNumber, customerCode: quote.customerCode, warehouseCode: quote.warehouseCode,
        lines: quote.lines.map((line) => ({ ...line, deliveredQuantity: 0 })), discountBps: quote.discountBps, taxBps: quote.taxBps, status: 'OPEN', createdBy
      }], { session });
      if (!order) throw new Error('No se pudo crear el pedido a partir de la cotizacion');
      quote.status = 'CONVERTED'; quote.orderNumber = order.orderNumber; await quote.save({ session });
      result = { quote: quote.toObject(), order: order.toObject() };
    });
    return result;
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new SaleError('ORDER_EXISTS');
    throw error;
  } finally { await session.endSession(); }
}

export async function listSalesOrders(tenant: Tenant) { return SalesOrderModel.find(tenant).sort({ createdAt: -1 }).limit(200); }
export async function createSalesOrder(input: CreateSalesOrderInput, createdBy: string, tenant: Tenant) {
  await validateRefs(input, tenant);
  try { return await SalesOrderModel.create({ ...tenant, ...input, status: 'OPEN', lines: input.lines.map((line) => ({ ...line, deliveredQuantity: 0 })), createdBy }); }
  catch (error) { if ((error as { code?: number }).code === 11000) throw new SaleError('ORDER_EXISTS'); throw error; }
}

export async function listSalesDeliveries(orderNumber: string, tenant: Tenant) {
  if (!await SalesOrderModel.exists({ ...tenant, orderNumber: orderNumber.toUpperCase() })) throw new SaleError('ORDER_NOT_FOUND');
  return SalesDeliveryModel.find({ ...tenant, orderNumber: orderNumber.toUpperCase() }).sort({ createdAt: -1 }).limit(200);
}

export async function deliverSalesOrder(orderNumber: string, input: CreateSalesDeliveryInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('SALE_DELIVERY', idempotencyKey, { orderNumber: orderNumber.toUpperCase(), ...input }, createdBy, tenant, async (session, operationId) => {
    const order = await SalesOrderModel.findOne({ ...tenant, orderNumber: orderNumber.toUpperCase() }).session(session);
    if (!order) throw new SaleError('ORDER_NOT_FOUND');
    if (order.status === 'CANCELLED' || order.status === 'DELIVERED') throw new SaleError('ORDER_STATE');
    if (await SalesDeliveryModel.exists({ ...tenant, deliveryNumber: input.deliveryNumber }).session(session)) throw new SaleError('DELIVERY_EXISTS');
    const saleLines = input.lines.map((line) => {
      const planLine = order.lines.find((item) => item.productCode === line.productCode);
      if (!planLine || line.quantity > planLine.quantity - (planLine.deliveredQuantity ?? 0) + 1e-9) throw new SaleError('ORDER_STATE');
      planLine.deliveredQuantity = Number(((planLine.deliveredQuantity ?? 0) + line.quantity).toFixed(6));
      return { ...line, unitPriceCents: planLine.unitPriceCents };
    });
    const saleInput = {
      saleNumber: input.saleNumber, customerCode: order.customerCode, warehouseCode: order.warehouseCode,
      discountBps: order.discountBps, taxBps: order.taxBps, lines: saleLines
    };
    const created = await createSaleInSession(saleInput, createdBy, tenant, session, operationId);
    order.status = order.lines.every((line) => (line.deliveredQuantity ?? 0) >= line.quantity - 1e-9) ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
    const [delivery] = await SalesDeliveryModel.create([{
      ...tenant, orderNumber: order.orderNumber, deliveryNumber: input.deliveryNumber, saleNumber: input.saleNumber,
      lines: input.lines, createdBy, operationId
    }], { session });
    if (!delivery) throw new Error('No se pudo guardar la entrega');
    await order.save({ session });
    return { order: order.toObject(), delivery: delivery.toObject(), ...created };
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new SaleError('DELIVERY_EXISTS');
    throw error;
  });
}

export async function listSalesInvoices(tenant: Tenant) { return SalesInvoiceModel.find(tenant).sort({ issuedAt: -1 }).limit(200); }
export async function createSalesInvoice(saleNumber: string, input: CreateSalesInvoiceInput, idempotencyKey: string, createdBy: string, tenant: Tenant) {
  return runIdempotent('SALE_INVOICE', idempotencyKey, { saleNumber: saleNumber.toUpperCase(), ...input }, createdBy, tenant, async (session, operationId) => {
    const sale = await SaleModel.findOne({ ...tenant, saleNumber: saleNumber.toUpperCase() }).session(session);
    if (!sale) throw new SaleError('SALE_NOT_FOUND');
    if (sale.status === 'CANCELLED') throw new SaleError('SALE_CANCELLED');
    if (await SalesInvoiceModel.exists({ ...tenant, saleNumber: sale.saleNumber }).session(session)) throw new SaleError('SALE_ALREADY_INVOICED');
    if (await SalesInvoiceModel.exists({ ...tenant, invoiceNumber: input.invoiceNumber }).session(session)) throw new SaleError('INVOICE_EXISTS');
    const status = sale.outstandingCents === 0 ? 'PAID' : sale.paidCents > 0 ? 'PARTIALLY_PAID' : 'OPEN';
    const [invoice] = await SalesInvoiceModel.create([{
      ...tenant, invoiceNumber: input.invoiceNumber, saleNumber: sale.saleNumber, customerCode: sale.customerCode, issuedAt: input.issuedAt, dueAt: input.dueAt,
      lines: sale.lines.map((line) => ({ productCode: line.productCode, quantity: line.quantity, unitPriceCents: line.unitPriceCents, lineTotalCents: line.lineTotalCents })),
      discountBps: sale.discountBps, taxBps: sale.taxBps, subtotalCents: sale.subtotalCents, discountCents: sale.discountCents, taxCents: sale.taxCents, totalCents: sale.totalCents, status, createdBy, operationId
    }], { session });
    if (!invoice) throw new Error('No se pudo emitir la factura de venta');
    return invoice.toObject();
  }).catch((error: unknown) => {
    if ((error as { code?: number }).code === 11000) throw new SaleError('INVOICE_EXISTS');
    throw error;
  });
}
