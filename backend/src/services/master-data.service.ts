import { Types } from 'mongoose';
import { getMasterDataModel, type MasterDataKind } from '../models/master-data.model.js';
import { InventoryBalanceModel, InventoryMovementModel } from '../models/inventory.model.js';
import { createMasterDataSchema, updateMasterDataSchema } from '../validators/master-data.validators.js';

export class MasterDataError extends Error {
    constructor(public readonly code: 'MASTER_DATA_EXISTS' | 'MASTER_DATA_NOT_FOUND' | 'INVALID_REFERENCE' | 'MASTER_DATA_IN_USE' | 'TRACKING_CONFIGURATION_LOCKED') {
    super(code);
  }
}

function referenceFields(kind: MasterDataKind, attributes: Record<string, unknown>) {
  if (kind === 'products') {
    const fields: [MasterDataKind, string][] = [['categories', 'categoryId'], ['brands', 'brandId'], ['units', 'unitId'], ['taxes', 'taxId']];
    return fields.flatMap(([target, field]) => attributes[field] ? [[target, String(attributes[field])] as [MasterDataKind, string]] : []);
  }
  if (kind === 'categories' && attributes.parentId) return [['categories', String(attributes.parentId)] as [MasterDataKind, string]];
  if (kind === 'price-lists' && Array.isArray(attributes.items)) return (attributes.items as { productId: string }[]).map((item) => ['products', String(item.productId)] as [MasterDataKind, string]);
  return [];
}

async function assertReferences(kind: MasterDataKind, attributes: Record<string, unknown>, companyId: string, ownId?: string) {
  const references = referenceFields(kind, attributes);
  for (const [targetKind, id] of references) {
    if (!Types.ObjectId.isValid(id) || (targetKind === kind && id === ownId)) throw new MasterDataError('INVALID_REFERENCE');
    const exists = await getMasterDataModel(targetKind).exists({ _id: id, companyId, status: 'ACTIVE' });
    if (!exists) throw new MasterDataError('INVALID_REFERENCE');
  }
  if (kind === 'categories' && attributes.parentId) {
    const visited = new Set<string>(ownId ? [ownId] : []);
    let parentId: string | undefined = String(attributes.parentId);
    for (let depth = 0; parentId && depth < 100; depth += 1) {
      if (visited.has(parentId)) throw new MasterDataError('INVALID_REFERENCE');
      visited.add(parentId);
      const parent: { attributes?: Record<string, unknown> } | null = await getMasterDataModel('categories').findOne({ _id: parentId, companyId, status: 'ACTIVE' }).select('attributes').lean();
      parentId = parent?.attributes?.parentId ? String(parent.attributes.parentId) : undefined;
    }
    if (parentId) throw new MasterDataError('INVALID_REFERENCE');
  }
}

function visibleScope(kind: MasterDataKind, companyId: string, branchId: string) {
  return kind === 'warehouses'
    ? { companyId, branchId }
    : { companyId, $or: [{ branchId: null }, { branchId: { $exists: false } }, { branchId }] };
}

function serialize(document: { _id: Types.ObjectId; companyId: Types.ObjectId; branchId?: Types.ObjectId | null; code: string; name: string; description?: string; status: string; attributes: Record<string, unknown>; createdAt: Date; updatedAt: Date }) {
  return { id: document._id.toString(), companyId: document.companyId.toString(), branchId: document.branchId?.toString() ?? null, code: document.code, name: document.name, description: document.description, status: document.status, attributes: document.attributes, createdAt: document.createdAt, updatedAt: document.updatedAt };
}

export async function listMasterData(kind: MasterDataKind, companyId: string, branchId: string, options: { page: number; limit: number; q?: string; status?: 'ACTIVE' | 'INACTIVE' }) {
  const filter: Record<string, unknown> = visibleScope(kind, companyId, branchId);
  if (options.status) filter.status = options.status;
  if (options.q) filter.$and = [{ $or: [{ name: { $regex: escapeRegex(options.q), $options: 'i' } }, { code: { $regex: escapeRegex(options.q), $options: 'i' } }] }];
  const Model = getMasterDataModel(kind);
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ name: 1, _id: 1 }).skip((options.page - 1) * options.limit).limit(options.limit),
    Model.countDocuments(filter)
  ]);
  return { items: items.map(serialize), page: options.page, limit: options.limit, total, pages: Math.ceil(total / options.limit) };
}

function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export async function createMasterData(kind: MasterDataKind, raw: unknown, companyId: string, branchId: string) {
  const input = createMasterDataSchema(kind).parse(raw) as { code: string; name: string; description?: string; status: 'ACTIVE' | 'INACTIVE'; attributes: Record<string, unknown> };
  await assertReferences(kind, input.attributes, companyId);
  const Model = getMasterDataModel(kind);
  if (await Model.exists({ companyId, code: input.code })) throw new MasterDataError('MASTER_DATA_EXISTS');
  try {
    const item = await Model.create({ ...input, companyId, branchId: kind === 'warehouses' ? branchId : null });
    return serialize(item);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new MasterDataError('MASTER_DATA_EXISTS');
    throw error;
  }
}

export async function updateMasterData(kind: MasterDataKind, code: string, raw: unknown, companyId: string, branchId: string) {
  const input = updateMasterDataSchema(kind).parse(raw) as Record<string, unknown>;
  const Model = getMasterDataModel(kind);
  const item = await Model.findOne({ ...visibleScope(kind, companyId, branchId), code: code.toUpperCase() });
  if (!item) throw new MasterDataError('MASTER_DATA_NOT_FOUND');
  const nextAttributes = input.attributes ? { ...item.attributes, ...(input.attributes as Record<string, unknown>) } : item.attributes;
  if (kind === 'products' && (nextAttributes.trackLots !== item.attributes.trackLots || nextAttributes.trackSerials !== item.attributes.trackSerials)) {
    const hasInventoryHistory = await InventoryMovementModel.exists({ companyId, productCode: item.code });
    const hasOpeningStock = await InventoryBalanceModel.exists({ companyId, productCode: item.code, $or: [{ quantity: { $ne: 0 } }, { reservedQuantity: { $gt: 0 } }] });
    if (hasInventoryHistory || hasOpeningStock) throw new MasterDataError('TRACKING_CONFIGURATION_LOCKED');
  }
  if (input.attributes) input.attributes = nextAttributes;
  await assertReferences(kind, nextAttributes, companyId, item.id);
  if (input.status === 'INACTIVE') await assertNotInUse(kind, item.id, companyId);
  item.set(input);
  try { await item.save(); } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new MasterDataError('MASTER_DATA_EXISTS');
    throw error;
  }
  return serialize(item);
}

async function assertNotInUse(kind: MasterDataKind, id: string, companyId: string) {
  const dependency: Partial<Record<MasterDataKind, [MasterDataKind, string]>> = {
    categories: ['products', 'attributes.categoryId'], brands: ['products', 'attributes.brandId'],
    units: ['products', 'attributes.unitId'], taxes: ['products', 'attributes.taxId'], products: ['price-lists', 'attributes.items.productId']
  };
  const relation = dependency[kind];
  if (relation && await getMasterDataModel(relation[0]).exists({ companyId, status: 'ACTIVE', [relation[1]]: id })) throw new MasterDataError('MASTER_DATA_IN_USE');
}
