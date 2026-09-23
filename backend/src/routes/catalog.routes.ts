import { Router } from 'express';
import { createCatalogController, listCatalogController, updateCatalogController } from '../controllers/catalog.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

export const catalogRouter = Router();

catalogRouter.get('/:kind', requireAuth, listCatalogController);
catalogRouter.post('/:kind', requireAuth, requireRole('ADMIN'), createCatalogController);
catalogRouter.patch('/:kind/:code', requireAuth, requireRole('ADMIN'), updateCatalogController);