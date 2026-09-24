import { describe, expect, it } from 'vitest';
import { createMasterDataSchema } from '../src/validators/master-data.validators.js';
import { inventoryCountSchema, inventoryMovementSchema, inventoryReservationSchema, inventoryTransferSchema, warehouseLocationSchema } from '../src/validators/inventory.validators.js';
import { receivePurchaseSchema } from '../src/validators/purchase.validators.js';

describe('Inventory lot and serial validators', () => {
  it('defaults typed products to non-traceable inventory', () => {
    const product = createMasterDataSchema('products').parse({ code: 'P1', name: 'Producto 1', attributes: { categoryId: 'a'.repeat(24), unitId: 'b'.repeat(24), priceCents: 100 } }) as { attributes: { trackLots: boolean; trackSerials: boolean; minStock: number; reorderPoint: number } };
    expect(product.attributes.trackLots).toBe(false);
    expect(product.attributes.trackSerials).toBe(false);
    expect(product.attributes.minStock).toBe(0);
    expect(product.attributes.reorderPoint).toBe(0);
  });

  it('validates the product min, max and reorder thresholds', () => {
    const input = { code: 'P1', name: 'Producto 1', attributes: { categoryId: 'a'.repeat(24), unitId: 'b'.repeat(24), priceCents: 100, minStock: 5, maxStock: 20, reorderPoint: 8 } };
    expect(createMasterDataSchema('products').safeParse(input).success).toBe(true);
    expect(createMasterDataSchema('products').safeParse({ ...input, attributes: { ...input.attributes, maxStock: 4 } }).success).toBe(false);
    expect(createMasterDataSchema('products').safeParse({ ...input, attributes: { ...input.attributes, reorderPoint: 21 } }).success).toBe(false);
  });

  it('normalizes a lot code and serial numbers', () => {
    const parsed = inventoryMovementSchema.parse({ productCode: 'p1', warehouseCode: 'wh1', type: 'IN', quantity: 2, reason: 'Recepcion', lotCode: ' l-1 ', expiresAt: '2027-01-01', serialNumbers: ['s-1', 's-2'] });
    expect(parsed.lotCode).toBe('L-1');
    expect(parsed.serialNumbers).toEqual(['S-1', 'S-2']);
  });

  it('requires a lot when expiry is supplied and rejects duplicate serials', () => {
    expect(inventoryMovementSchema.safeParse({ productCode: 'P1', warehouseCode: 'WH1', type: 'IN', quantity: 1, reason: 'Entrada', expiresAt: '2027-01-01' }).success).toBe(false);
    expect(inventoryMovementSchema.safeParse({ productCode: 'P1', warehouseCode: 'WH1', type: 'IN', quantity: 2, reason: 'Entrada', serialNumbers: ['S1', 'S1'] }).success).toBe(false);
  });

  it('accepts per-lot count lines but rejects duplicate product-lot pairs', () => {
    const valid = { countNumber: 'C-1', warehouseCode: 'WH1', reason: 'Inventario mensual', lines: [{ productCode: 'P1', lotCode: 'L1', countedQuantity: 2, serialNumbers: ['S1', 'S2'] }, { productCode: 'P1', lotCode: 'L2', countedQuantity: 3, serialNumbers: ['S3', 'S4', 'S5'] }] };
    expect(inventoryCountSchema.safeParse(valid).success).toBe(true);
    expect(inventoryCountSchema.safeParse({ ...valid, lines: [valid.lines[0], { ...valid.lines[0], countedQuantity: 1 }] }).success).toBe(false);
    expect(inventoryCountSchema.safeParse({ ...valid, lines: [valid.lines[0], { ...valid.lines[1], serialNumbers: ['S2', 'S4', 'S5'] }] }).success).toBe(false);
  });

  it('accepts absolute lot quantity and the complete serial set for adjustments', () => {
    const parsed = inventoryMovementSchema.parse({ productCode: 'P1', warehouseCode: 'WH1', type: 'ADJUSTMENT', quantity: 2, lotCode: 'L1', serialNumbers: ['S1', 'S2'], reason: 'Conteo por lote' });
    expect(parsed.lotCode).toBe('L1');
    expect(parsed.serialNumbers).toHaveLength(2);
  });

  it('carries lot and serial traceability in receipts and reservations', () => {
    const receipt = receivePurchaseSchema.parse({ receiptNumber: 'r-1', lines: [{ productCode: 'p1', quantity: 2, lotCode: 'lot-a', serialNumbers: ['sn-1', 'sn-2'] }] });
    expect(receipt.lines[0]?.lotCode).toBe('LOT-A');
    expect(receipt.lines[0]?.serialNumbers).toEqual(['SN-1', 'SN-2']);
    const reservation = inventoryReservationSchema.parse({ reservationNumber: 'R-1', productCode: 'p1', warehouseCode: 'wh1', quantity: 1, serialNumbers: ['sn-1'], reason: 'Pedido cliente' });
    expect(reservation.serialNumbers).toEqual(['SN-1']);
  });

  it('accepts traceability on transfers but rejects duplicate serials', () => {
    const valid = { transferNumber: 'T-1', productCode: 'P1', sourceWarehouseCode: 'A', destinationWarehouseCode: 'B', quantity: 1, reason: 'Reubicacion', serialNumbers: ['SN-1'] };
    expect(inventoryTransferSchema.safeParse(valid).success).toBe(true);
    expect(inventoryTransferSchema.safeParse({ ...valid, serialNumbers: ['SN-1', 'SN-1'], quantity: 2 }).success).toBe(false);
  });

  it('normalizes warehouse locations and location-aware inventory requests', () => {
    expect(warehouseLocationSchema.parse({ warehouseCode: 'wh1', code: ' a-01 ', name: 'Pasillo A' })).toEqual({ warehouseCode: 'WH1', code: 'A-01', name: 'Pasillo A' });
    expect(inventoryMovementSchema.parse({ productCode: 'p1', warehouseCode: 'wh1', locationCode: 'a-01', type: 'IN', quantity: 3, reason: 'Recepcion' }).locationCode).toBe('A-01');
    expect(inventoryCountSchema.parse({ countNumber: 'c-bin-1', warehouseCode: 'wh1', locationCode: 'a-01', reason: 'Conteo de bin', lines: [{ productCode: 'p1', countedQuantity: 3 }] }).locationCode).toBe('A-01');
  });

  it('allows same-warehouse bin transfers only when locations differ', () => {
    const transfer = { transferNumber: 'T-BIN-1', productCode: 'P1', sourceWarehouseCode: 'WH1', destinationWarehouseCode: 'WH1', sourceLocationCode: 'A-01', destinationLocationCode: 'B-01', quantity: 1, reason: 'Reubicacion' };
    expect(inventoryTransferSchema.safeParse(transfer).success).toBe(true);
    expect(inventoryTransferSchema.safeParse({ ...transfer, destinationLocationCode: 'A-01' }).success).toBe(false);
  });
});
