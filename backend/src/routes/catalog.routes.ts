import { Router } from 'express';
import { createCatalogController, listCatalogController, updateCatalogController } from '../controllers/catalog.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const catalogRouter = Router();

catalogRouter.get('/:kind', requireAuth, requirePermission('master-data.catalogs.read'), listCatalogController);
catalogRouter.post('/:kind', requireAuth, requirePermission('master-data.catalogs.create'), auditAction('CATALOG_CREATE'), createCatalogController);
catalogRouter.patch('/:kind/:code', requireAuth, requirePermission('master-data.catalogs.update'), auditAction('CATALOG_UPDATE'), updateCatalogController);
