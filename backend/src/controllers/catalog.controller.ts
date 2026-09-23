import type { RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { CatalogError } from '../services/catalog.service.js';
import { createCatalog, listCatalog, updateCatalog } from '../services/catalog.service.js';
import { catalogKindSchema, createCatalogSchema, updateCatalogSchema } from '../validators/catalog.validators.js';

export const listCatalogController: RequestHandler = async (request, response, next) => {
  try {
    const kind = catalogKindSchema.parse(request.params.kind);
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const data = await listCatalog(kind, request.user.companyId, request.user.branchId);
    response.status(200).json({ success: true, message: 'Catalogo consultado', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Tipo de catalogo invalido', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    next(error);
  }
};

export const createCatalogController: RequestHandler = async (request, response, next) => {
  try {
    const kind = catalogKindSchema.parse(request.params.kind);
    const input = createCatalogSchema.parse(request.body);
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const data = await createCatalog(kind, input, request.user.companyId, request.user.branchId);
    response.status(201).json({ success: true, message: 'Elemento de catalogo creado', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof CatalogError && error.code === 'CATALOG_EXISTS') {
      response.status(409).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};

export const updateCatalogController: RequestHandler = async (request, response, next) => {
  try {
    const kind = catalogKindSchema.parse(request.params.kind);
    const code = z.string().min(1).parse(request.params.code);
    const input = updateCatalogSchema.parse(request.body);
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const data = await updateCatalog(kind, code, input, request.user.companyId, request.user.branchId);
    response.status(200).json({ success: true, message: 'Elemento de catalogo actualizado', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof CatalogError && error.code === 'CATALOG_NOT_FOUND') {
      response.status(404).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};
