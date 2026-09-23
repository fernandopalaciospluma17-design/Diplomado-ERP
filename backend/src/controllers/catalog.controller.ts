import type { RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { CatalogError } from '../services/catalog.service.js';
import { createCatalog, listCatalog, updateCatalog } from '../services/catalog.service.js';
import { catalogKindSchema, createCatalogSchema, updateCatalogSchema } from '../validators/catalog.validators.js';

export const listCatalogController: RequestHandler = async (request, response, next) => {
  try {
    const kind = catalogKindSchema.parse(request.params.kind);
    const data = await listCatalog(kind);
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
    const data = await createCatalog(kind, input);
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
    const data = await updateCatalog(kind, code, input);
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