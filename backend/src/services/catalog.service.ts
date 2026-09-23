import { CatalogModel, type CatalogKind } from '../models/catalog.model.js';
import type { CreateCatalogInput, UpdateCatalogInput } from '../validators/catalog.validators.js';

export class CatalogError extends Error {
  constructor(public readonly code: 'CATALOG_EXISTS' | 'CATALOG_NOT_FOUND') {
    super(code === 'CATALOG_EXISTS' ? 'El codigo ya esta registrado' : 'Catalogo no encontrado');
  }
}

function toCatalogResponse(item: { _id: { toString(): string }; kind: CatalogKind; code: string; name: string; description?: string; status: string; metadata?: unknown; createdAt: Date; updatedAt: Date }) {
  return {
    id: item._id.toString(),
    kind: item.kind,
    code: item.code,
    name: item.name,
    description: item.description,
    status: item.status,
    metadata: item.metadata,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

export async function listCatalog(kind: CatalogKind) {
  const items = await CatalogModel.find({ kind }).sort({ name: 1 });
  return items.map(toCatalogResponse);
}

export async function createCatalog(kind: CatalogKind, input: CreateCatalogInput) {
  const existing = await CatalogModel.exists({ kind, code: input.code });
  if (existing) {
    throw new CatalogError('CATALOG_EXISTS');
  }

  const item = await CatalogModel.create({ kind, ...input });
  return toCatalogResponse(item);
}

export async function updateCatalog(kind: CatalogKind, code: string, input: UpdateCatalogInput) {
  const item = await CatalogModel.findOneAndUpdate({ kind, code: code.toUpperCase() }, input, { new: true, runValidators: true });
  if (!item) {
    throw new CatalogError('CATALOG_NOT_FOUND');
  }

  return toCatalogResponse(item);
}