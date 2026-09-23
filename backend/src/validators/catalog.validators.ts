import { z } from 'zod';
import { catalogKinds } from '../models/catalog.model.js';

export const catalogKindSchema = z.enum(catalogKinds);

export const createCatalogSchema = z.object({
  code: z.string().trim().min(1).max(40).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  metadata: z.record(z.string(), z.string().trim().max(200)).optional()
});

export type CreateCatalogInput = z.infer<typeof createCatalogSchema>;

export const updateCatalogSchema = createCatalogSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'Debe enviar al menos un campo para actualizar'
});

export type UpdateCatalogInput = z.infer<typeof updateCatalogSchema>;