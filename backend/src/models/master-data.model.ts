import mongoose, { model, Schema, Types, type Model } from 'mongoose';

export const masterDataKinds = [
  'customers', 'suppliers', 'categories', 'brands', 'products', 'units', 'taxes', 'warehouses', 'payment-methods', 'price-lists'
] as const;
export type MasterDataKind = (typeof masterDataKinds)[number];

export interface MasterDataDocument {
  companyId: Types.ObjectId;
  branchId?: Types.ObjectId | null;
  code: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  attributes: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const collectionNames: Record<MasterDataKind, string> = {
  customers: 'customers', suppliers: 'suppliers', categories: 'categories', brands: 'brands', products: 'products',
  units: 'units', taxes: 'taxes', warehouses: 'warehouses', 'payment-methods': 'paymentmethods', 'price-lists': 'pricelists'
};

const commonSchema = new Schema<MasterDataDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
  code: { type: String, required: true, trim: true, uppercase: true, minlength: 1, maxlength: 40 },
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], required: true, default: 'ACTIVE' },
  attributes: { type: Schema.Types.Mixed, required: true, default: {} }
}, { timestamps: true, strict: 'throw' });
commonSchema.index({ companyId: 1, code: 1 }, { unique: true });
commonSchema.index({ companyId: 1, branchId: 1, status: 1, name: 1 });
commonSchema.index({ companyId: 1, 'attributes.taxId': 1 }, { unique: true, partialFilterExpression: { 'attributes.taxId': { $type: 'string' } } });
commonSchema.index({ companyId: 1, 'attributes.barcode': 1 }, { unique: true, partialFilterExpression: { 'attributes.barcode': { $type: 'string' } } });

const modelNames: Record<MasterDataKind, string> = {
  customers: 'Customer', suppliers: 'Supplier', categories: 'ProductCategory', brands: 'Brand', products: 'Product',
  units: 'Unit', taxes: 'Tax', warehouses: 'Warehouse', 'payment-methods': 'PaymentMethod', 'price-lists': 'PriceList'
};

export function getMasterDataModel(kind: MasterDataKind) {
  const name = modelNames[kind];
  return (mongoose.models[name] as Model<MasterDataDocument> | undefined) ?? model<MasterDataDocument>(name, commonSchema, collectionNames[kind]);
}
