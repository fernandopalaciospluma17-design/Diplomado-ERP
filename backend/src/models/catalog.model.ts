import { Schema, model } from 'mongoose';

export const catalogKinds = ['CUSTOMER', 'SUPPLIER', 'CATEGORY', 'BRAND', 'PRODUCT', 'WAREHOUSE'] as const;
export type CatalogKind = (typeof catalogKinds)[number];

export interface CatalogDocument {
  kind: CatalogKind;
  code: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const catalogSchema = new Schema<CatalogDocument>(
  {
    kind: { type: String, enum: catalogKinds, required: true },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', required: true },
    metadata: { type: Map, of: String }
  },
  { timestamps: true }
);

catalogSchema.index({ kind: 1, code: 1 }, { unique: true });
catalogSchema.index({ kind: 1, status: 1, name: 1 });

export const CatalogModel = model<CatalogDocument>('Catalog', catalogSchema);