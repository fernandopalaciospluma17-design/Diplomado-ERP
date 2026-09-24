import { Router } from 'express';
import { applyInventoryMovementController, consumeInventoryReservationController, createInventoryCountController, createInventoryReservationController, createWarehouseLocationController, getInventoryController, listInventoryCountsController, listInventoryLocationBalancesController, listInventoryLotsController, listInventoryMovementsController, listInventoryReservationsController, listInventorySerialsController, listWarehouseLocationsController, releaseInventoryReservationController, transferInventoryController } from '../controllers/inventory.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const inventoryRouter = Router();

inventoryRouter.get('/:productCode/:warehouseCode', requireAuth, requirePermission('inventory.stock.read'), getInventoryController);
inventoryRouter.get('/locations', requireAuth, requirePermission('inventory.stock.read'), listWarehouseLocationsController);
inventoryRouter.post('/locations', requireAuth, requirePermission('inventory.movement.create'), auditAction('WAREHOUSE_LOCATION_CREATE'), createWarehouseLocationController);
inventoryRouter.get('/:productCode/:warehouseCode/movements', requireAuth, requirePermission('inventory.stock.read'), listInventoryMovementsController);
inventoryRouter.get('/:productCode/:warehouseCode/lots', requireAuth, requirePermission('inventory.stock.read'), listInventoryLotsController);
inventoryRouter.get('/:productCode/:warehouseCode/serials', requireAuth, requirePermission('inventory.stock.read'), listInventorySerialsController);
inventoryRouter.get('/:productCode/:warehouseCode/locations', requireAuth, requirePermission('inventory.stock.read'), listInventoryLocationBalancesController);
inventoryRouter.post('/movements', requireAuth, requirePermission('inventory.movement.create'), auditAction('INVENTORY_MOVEMENT'), applyInventoryMovementController);
inventoryRouter.post('/transfers', requireAuth, requirePermission('inventory.transfer.create'), auditAction('INVENTORY_TRANSFER'), transferInventoryController);
inventoryRouter.get('/counts', requireAuth, requirePermission('inventory.count.read'), listInventoryCountsController);
inventoryRouter.post('/counts', requireAuth, requirePermission('inventory.count.create'), auditAction('INVENTORY_COUNT'), createInventoryCountController);
inventoryRouter.get('/reservations', requireAuth, requirePermission('inventory.reservation.read'), listInventoryReservationsController);
inventoryRouter.post('/reservations', requireAuth, requirePermission('inventory.reservation.create'), auditAction('INVENTORY_RESERVATION'), createInventoryReservationController);
inventoryRouter.post('/reservations/:reservationNumber/release', requireAuth, requirePermission('inventory.reservation.update'), auditAction('INVENTORY_RESERVATION_RELEASE'), releaseInventoryReservationController);
inventoryRouter.post('/reservations/:reservationNumber/consume', requireAuth, requirePermission('inventory.reservation.update'), auditAction('INVENTORY_RESERVATION_CONSUME'), consumeInventoryReservationController);
