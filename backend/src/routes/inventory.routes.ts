import { Router } from 'express';
import { applyInventoryMovementController, getInventoryController, listInventoryMovementsController } from '../controllers/inventory.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const inventoryRouter = Router();

inventoryRouter.get('/:productCode/:warehouseCode', requireAuth, getInventoryController);
inventoryRouter.get('/:productCode/:warehouseCode/movements', requireAuth, listInventoryMovementsController);
inventoryRouter.post('/movements', requireAuth, requireRole('ADMIN'), auditAction('INVENTORY_MOVEMENT'), applyInventoryMovementController);