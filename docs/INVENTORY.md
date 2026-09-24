# Fase 3 — inventario

## Requisitos de MongoDB

Las escrituras usan transacciones para confirmar el saldo, el ledger y el documento de operación en conjunto. MongoDB debe ser un replica set (MongoDB Atlas ya cumple). El Compose local inicia `rs0`; configura la URI como `mongodb://127.0.0.1:27017/erp?replicaSet=rs0`. El usuario Mongo necesita crear índices. Si sigue activo el contenedor standalone `erp-mongo-integration` de la prueba anterior, detenlo antes de iniciar Compose porque ocupa el puerto 27017.

## API

Todas las operaciones requieren sesión, permiso y ámbito del usuario. Las escrituras requieren el header `Idempotency-Key` (8–120 caracteres). Repetir una clave con el mismo contenido reproduce el resultado original; reutilizarla con contenido distinto devuelve `409 IDEMPOTENCY_CONFLICT`.

- `GET /api/v1/inventory/:productCode/:warehouseCode` devuelve existencia, reservado y disponible.
- `GET /api/v1/inventory/:productCode/:warehouseCode/movements` consulta hasta 100 movimientos inmutables.
- `POST /api/v1/inventory/movements` registra `IN`, `OUT` o `ADJUSTMENT`; en ajuste, `quantity` representa el nuevo conteo absoluto.
- `POST /api/v1/inventory/transfers` transfiere entre dos almacenes de la misma sucursal con débito y crédito atómicos.
- `POST /api/v1/inventory/counts` aplica un conteo físico de hasta 500 productos al instante y conserva esperado, contado y diferencia. Número de conteo único por sucursal.
- `GET /api/v1/inventory/counts` lista los últimos 100 conteos.
- `POST /api/v1/inventory/reservations` separa cantidad disponible de stock utilizable.
- `POST /api/v1/inventory/reservations/:reservationNumber/release` libera una reserva.
- `POST /api/v1/inventory/reservations/:reservationNumber/consume` descuenta la reserva del stock y registra el movimiento.
- `GET /api/v1/inventory/reservations` lista reservas activas.
- `GET /api/v1/inventory/locations?warehouseCode=WH1` lista ubicaciones físicas activas del almacén indicado.
- `POST /api/v1/inventory/locations` registra una ubicación con `{ warehouseCode, code, name, description? }`; el código es único dentro del almacén.
- `GET /api/v1/inventory/:productCode/:warehouseCode/locations` devuelve saldos positivos por ubicación.

Los códigos de producto/almacén deben referenciar maestros activos del tenant; se admite temporalmente resolver los catálogos legados. La precisión se valida según los decimales de la unidad del producto tipado (los productos legados usan tres decimales). Almacenes pueden configurar `allowNegativeStock`; las reservas y conteos siguen protegidos contra sobrecompromiso. El default es impedir stock negativo.

Los movimientos no se editan ni borran; una corrección requiere un nuevo movimiento de ajuste. Las reservas no expiran automáticamente: deben consumirse o liberarse explícitamente. Conteos se registran como `POSTED` de inmediato, no tienen borrador ni aprobación todavía. Transferencias son intra-sucursal.

## Alcance por completar

Los lotes y series se soportan en entradas, salidas, compras, transferencias, reservas, ajustes y conteos a nivel de almacén. Para productos sin trazabilidad por lote/serie, entradas, salidas, ajustes, recepciones, transferencias, reservas y conteos admiten ubicación. El saldo del bin y el saldo general se actualizan dentro de la misma transacción. Los traslados pueden hacerse entre almacenes o entre ubicaciones (incluida la existencia no asignada a bin); no pueden dejar existencia negativa ni consumir reservas locales.

Las existencias antiguas y los movimientos sin `locationCode` permanecen a nivel de almacén sin asignación física; se pueden asignar con una transferencia dentro del mismo almacén indicando solo `destinationLocationCode`. Los conteos por ubicación actualizan la diferencia contra el saldo del almacén. Los productos con seguimiento por lote/serie aún no admiten bins. La verificación de atomicidad/concurrencia en Mongo replica set también sigue pendiente.

## Lot and serial traceability (incremental scope)

- Products may set `attributes.trackLots` and/or `attributes.trackSerials` to `true`; both default to `false` for existing compatibility.
- For tracked lots, `IN` and purchase receipts require `lotCode`; `expiresAt` is optional. Lot balances are stored per company, branch, product, warehouse and lot. `OUT` and transfers require enough stock in that lot.
- For tracked serials, `IN` and purchase receipts require exactly one serial number per whole unit. `OUT` requires those serials to be currently in the selected warehouse. Transfers atomically move their warehouse assignment.
- `GET /api/v1/inventory/:productCode/:warehouseCode/lots` lists positive lot balances; `/serials` lists serials currently in stock at that warehouse.
- Lot-tracked `ADJUSTMENT` treats `quantity` as the target quantity for the specified `lotCode`; serial-tracked adjustments require the complete target `serialNumbers` set. Reserved stock cannot be reduced or silently removed.
- Lot/serial transaction behavior still needs integration and concurrency verification against a disposable Mongo replica set.

## Inventory API traceability

- `GET /inventory/:productCode/:warehouseCode/lots` returns positive lot balances and expiry dates.
- `GET /inventory/:productCode/:warehouseCode/serials` returns serials currently in stock.

`POST /inventory/movements` accepts `lotCode`, `expiresAt` and `serialNumbers` according to product tracking. For lot-tracked adjustments, quantity is the absolute target for that lot; serial-tracked adjustments provide the complete target serial set. `POST /inventory/transfers` moves lot/serial balances transactionally. `POST /inventory/counts` reconciles all existing lots and/or series for each included product; omitted existing lots or reserved series reject the whole count.

### Reservations for traceable inventory

Reservations require `lotCode` for lot-tracked products and exact `serialNumbers` for serial-tracked products. Aggregate and lot reserved balances update together. Serials transition `IN -> RESERVED -> IN` on release or `OUT` on consume. Generic outbound movements cannot consume reserved lots or serials.

Product stock thresholds (`minStock`, optional `maxStock`, `reorderPoint`) are validated in master data and returned with the stock query. The API reports below-minimum/reorder flags and a suggested quantity to the maximum; it does not create replenishment requests automatically.
