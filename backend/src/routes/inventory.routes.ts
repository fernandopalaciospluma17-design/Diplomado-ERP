import { Router } from 'express';
import { applyInventoryMovementController, getInventoryController, listInventoryMovementsController } from '../controllers/inventory.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const inventoryRouter = Router();

inventoryRouter.get('/:productCode/:warehouseCode', requireAuth, requirePermission('inventory.stock.read'), getInventoryController);
inventoryRouter.get('/:productCode/:warehouseCode/movements', requireAuth, requirePermission('inventory.stock.read'), listInventoryMovementsController);
inventoryRouter.post('/movements', requireAuth, requirePermission('inventory.movement.create'), auditAction('INVENTORY_MOVEMENT'), applyInventoryMovementController);
