import { z } from 'zod';
import { masterDataKinds, type MasterDataKind } from '../models/master-data.model.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Debe ser un ObjectId valido').transform((value) => value.toLowerCase());
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const phone = z.string().trim().min(7).max(30).optional();
const address = z.object({ line1: z.string().trim().min(1).max(160), line2: z.string().trim().max(160).optional(), city: z.string().trim().min(1).max(100), region: z.string().trim().max(100).optional(), postalCode: z.string().trim().max(20).optional(), countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()) }).optional();
const common = z.object({ code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()), name: z.string().trim().min(2).max(120), description: z.string().trim().max(500).optional(), status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE') });
const productAttributes = z.object({ barcode: z.string().trim().max(80).optional(), categoryId: objectId, brandId: objectId.optional(), unitId: objectId, taxId: objectId.optional(), costCents: z.number().int().nonnegative().max(2_000_000_000).default(0), priceCents: z.number().int().nonnegative().max(2_000_000_000), trackInventory: z.boolean().default(true), trackLots: z.boolean().default(false), trackSerials: z.boolean().default(false), minStock: z.number().nonnegative().max(1_000_000_000).default(0), maxStock: z.number().nonnegative().max(1_000_000_000).optional(), reorderPoint: z.number().nonnegative().max(1_000_000_000).default(0) }).superRefine((attributes, context) => {
  if (attributes.maxStock !== undefined && attributes.maxStock < attributes.minStock) context.addIssue({ code: 'custom', path: ['maxStock'], message: 'maxStock debe ser mayor o igual a minStock' });
  if (attributes.maxStock !== undefined && attributes.reorderPoint > attributes.maxStock) context.addIssue({ code: 'custom', path: ['reorderPoint'], message: 'reorderPoint no puede superar maxStock' });
});
const schemas = {
  customers: common.extend({ attributes: z.object({ taxId: z.string().trim().max(40).optional(), email: email.optional(), phone, address, creditLimitCents: z.number().int().nonnegative().max(2_000_000_000).default(0), paymentTermDays: z.number().int().min(0).max(365).default(0) }).default(() => ({ creditLimitCents: 0, paymentTermDays: 0 })) }),
  suppliers: common.extend({ attributes: z.object({ taxId: z.string().trim().max(40).optional(), email: email.optional(), phone, contactName: z.string().trim().max(120).optional(), address }).default({}) }),
  categories: common.extend({ attributes: z.object({ parentId: objectId.optional() }).default({}) }),
  brands: common.extend({ attributes: z.object({ website: z.string().url().max(240).optional() }).default({}) }),
  products: common.extend({ attributes: productAttributes }),
  units: common.extend({ attributes: z.object({ symbol: z.string().trim().min(1).max(12), decimalPlaces: z.number().int().min(0).max(6).default(0) }) }),
  taxes: common.extend({ attributes: z.object({ rateBasisPoints: z.number().int().min(0).max(10000), isIncludedInPrice: z.boolean().default(false) }) }),
  warehouses: common.extend({ attributes: z.object({ location: z.string().trim().max(240).optional(), allowNegativeStock: z.boolean().default(false), isDefault: z.boolean().default(false) }).default(() => ({ allowNegativeStock: false, isDefault: false })) }),
  'payment-methods': common.extend({ attributes: z.object({ methodType: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK', 'OTHER']), requiresReference: z.boolean().default(false) }) }),
  'price-lists': common.extend({ attributes: z.object({ currency: z.string().trim().length(3).transform((value) => value.toUpperCase()), effectiveFrom: z.coerce.date().optional(), effectiveTo: z.coerce.date().optional(), items: z.array(z.object({ productId: objectId, priceCents: z.number().int().nonnegative().max(2_000_000_000) })).max(5000).default([]) }).refine((value) => !value.effectiveFrom || !value.effectiveTo || value.effectiveFrom <= value.effectiveTo, { path: ['effectiveTo'], message: 'La fecha final debe ser posterior o igual a la inicial' }) })
} satisfies Record<MasterDataKind, z.ZodType>;

export const masterDataKindSchema = z.enum(masterDataKinds);
const updateSchemas: Record<MasterDataKind, z.ZodType> = {
  customers: schemas.customers.omit({ code: true }).partial(),
  suppliers: schemas.suppliers.omit({ code: true }).partial(),
  categories: schemas.categories.omit({ code: true }).partial(),
  brands: schemas.brands.omit({ code: true }).partial(),
  products: schemas.products.omit({ code: true }).partial(),
  units: schemas.units.omit({ code: true }).partial(),
  taxes: schemas.taxes.omit({ code: true }).partial(),
  warehouses: schemas.warehouses.omit({ code: true }).partial(),
  'payment-methods': schemas['payment-methods'].omit({ code: true }).partial(),
  'price-lists': schemas['price-lists'].omit({ code: true }).partial()
};
export function createMasterDataSchema(kind: MasterDataKind): z.ZodType { return schemas[kind]; }
export function updateMasterDataSchema(kind: MasterDataKind): z.ZodType {
  return updateSchemas[kind].refine((value) => Object.keys(value as object).length > 0, { message: 'Debe enviar al menos un campo para actualizar' });
}
