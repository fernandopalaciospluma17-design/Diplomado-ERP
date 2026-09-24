# Fase 2 — datos maestros

La API canónica está bajo `/api/v1/master-data/:kind`. Los recursos son `customers`, `suppliers`, `categories`, `brands`, `products`, `units`, `taxes`, `warehouses`, `payment-methods` y `price-lists`. Cada tipo usa una colección Mongo propia, códigos únicos por empresa y los campos comunes `code`, `name`, `description`, `status` y `attributes`.

## Rutas

- `GET /:kind?page=1&limit=50&q=texto&status=ACTIVE` lista con paginación (1–100), filtro de texto y estado.
- `POST /:kind` crea un registro.
- `PATCH /:kind/:code` actualiza nombre, descripción, estado o `attributes`. El código no cambia; `attributes` se reemplaza completo y debe incluir sus campos obligatorios.
- Para desactivar un registro envía `{"status":"INACTIVE"}`. No hay borrado físico. No se puede desactivar una categoría, marca, unidad o impuesto utilizado por un producto ni un producto utilizado por una lista de precios.

Las rutas exigen sesión y permiso para el tipo exacto (`master-data.products.read`, por ejemplo). Los datos se limitan a la empresa del usuario. Clientes, proveedores y catálogos de producto son visibles a nivel de empresa; los almacenes se asignan y consultan por sucursal. Los IDs de referencias deben existir y estar activos dentro de la misma empresa.

## Atributos tipados

| Tipo | Atributos principales |
|---|---|
| customers | `taxId`, `email`, `phone`, `address`, `creditLimitCents`, `paymentTermDays` |
| suppliers | `taxId`, `email`, `phone`, `contactName`, `address` |
| categories | `parentId` opcional, sin ciclos |
| brands | `website` |
| products | `barcode`, references, `costCents`, `priceCents`, `trackInventory`, `trackLots`, `trackSerials`, `minStock`, `maxStock`, `reorderPoint` |
| units | `symbol`, `decimalPlaces` |
| taxes | `rateBasisPoints` (0–10000), `isIncludedInPrice` |
| warehouses | `location`, `allowNegativeStock`, `isDefault`; se limita a la sucursal del usuario |
| payment-methods | `methodType` (`CASH`, `CARD`, `TRANSFER`, `CHECK`, `OTHER`), `requiresReference` |
| price-lists | `currency`, vigencia opcional e `items` con `productId` y `priceCents` |

Los importes se expresan en centavos enteros y las tasas en puntos base. La moneda se informa en cada lista de precios; la moneda base por empresa e impuestos fiscales regionales quedan para una decisión de negocio posterior.

## Permisos e índices

La herramienta `migrate:single-company -- --apply` también siembra los permisos de esta fase, los añade a los roles iniciales existentes y crea los índices de las colecciones. En una instalación de Fase 1 ya migrada se puede volver a ejecutar tras backup y revisión del destino; el migrador es repetible. El rol `USER` obtiene lectura y el administrador de empresa puede crear/actualizar.

## Compatibilidad pendiente

La API legada `/api/v1/catalogs/:kind` sigue disponible por compatibilidad. No se copia automáticamente su contenido a las colecciones tipadas: antes de adoptar `/master-data` para datos ya existentes, se requiere mapear `metadata` legado a atributos y resolver referencias de producto. No uses ambas rutas como fuentes de escritura paralelas para los mismos registros.

For product tracking, `trackLots` and `trackSerials` default to false. Enable them before the first inventory movement and before any opening quantity is loaded. The API locks changes to those settings once movements or nonzero balances exist; this avoids creating aggregate stock with no matching lot/serial ledger. Tracked stock supports inbound, outbound, purchase receipt, and transfer operations. Counts, adjustments, and reservations for tracked products remain unsupported and are rejected atomically.
