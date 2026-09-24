# Contrato API

Base: `/api/v1`. Respuestas: `{ success, message, data }`; errores: `{ success:false, message, error:{ code, details } }`. No hay especificacion OpenAPI. Login y health son publicos; el resto requiere JWT con sesion persistida. Los endpoints de negocio además requieren permiso y filtran por empresa/sucursal guardadas en el contexto autenticado.

## Rutas de negocio existentes

| Metodo y ruta | Permiso | Comportamiento |
|---|---|---|
| GET `/` | Publico | Identificacion API/version |
| GET `/health` | Publico | Health basico |
| GET `/health/protected` | Sesion valida | Prueba de auth, devuelve userId |
| POST `/auth/login` | Publico | Credenciales; crea sesion y access JWT |
| GET `/auth/me` | Sesion valida | Perfil actual |
| GET `/auth/users` | `platform.users.read` | Lista usuarios de empresa |
| POST `/auth/users` | `platform.users.create` | Crea usuario en empresa/sucursal del actor |
| GET `/catalogs/:kind` | `master-data.catalogs.read` | Lista catalogo (6 kinds) |
| POST `/catalogs/:kind` | `master-data.catalogs.create` | Alta catalogo |
| PATCH `/catalogs/:kind/:code` | `master-data.catalogs.update` | Actualiza catalogo |
| GET `/master-data/:kind?page=&limit=&q=&status=` | `master-data.<kind>.read` | Lista paginada y limitada al tenant de los 10 tipos tipados |
| POST `/master-data/:kind` | `master-data.<kind>.create` | Crea; valida atributos y referencias de empresa |
| PATCH `/master-data/:kind/:code` | `master-data.<kind>.update` | Actualiza sin cambiar código; permite desactivar |
| POST `/inventory/movements` | `inventory.movement.create` | Movimiento atómico e idempotente; requiere `Idempotency-Key` |
| POST `/inventory/transfers` | `inventory.transfer.create` | Transferencia atómica entre almacenes de la misma sucursal |
| GET/POST `/inventory/counts` | `inventory.count.read/create` | Consulta y aplica conteos físicos |
| GET/POST `/inventory/reservations` | `inventory.reservation.read/create` | Consulta reservas activas y reserva disponible |
| POST `/inventory/reservations/:reservationNumber/release` | `inventory.reservation.update` | Libera una reserva |
| POST `/inventory/reservations/:reservationNumber/consume` | `inventory.reservation.update` | Consume reserva y descuenta stock |
| GET `/inventory/:productCode/:warehouseCode` | `inventory.stock.read` | Saldo, reservado/disponible y umbrales min/max/reorden |
| GET `/inventory/:productCode/:warehouseCode/movements` | `inventory.stock.read` | Historial, ultimos 100 |
| POST `/inventory/movements` | `inventory.movement.create` | Aplica IN/OUT/ADJUSTMENT |
| GET `/sales` | `sales.sale.read` | Ultimas 100 ventas |
| POST `/sales` | `sales.sale.create` | Crea venta, calcula descuento/impuesto y descuenta inventario; requiere `Idempotency-Key` |
| GET/POST `/sales/quotes` | `sales.quote.read/create` | Consulta o crea cotizaciones comerciales |
| POST `/sales/quotes/:quoteNumber/convert` | `sales.order.create` | Convierte cotización abierta en pedido en una transacción |
| GET/POST `/sales/orders` | `sales.order.read/create` | Consulta o crea pedidos sin reservar existencias |
| GET/POST `/sales/orders/:orderNumber/deliveries` | `sales.delivery.read/create` | Entrega total/parcial, genera venta y descuenta stock en transacción; POST requiere `Idempotency-Key` |
| GET `/sales/invoices` | `sales.invoice.read` | Consulta snapshots internos de facturas de venta |
| POST `/sales/:saleNumber/invoices` | `sales.invoice.create` | Emite factura interna con líneas/importes; una por venta; requiere `Idempotency-Key` |
| GET `/sales/:saleNumber/payments` | `sales.payment.read` | Consulta pagos |
| POST `/sales/:saleNumber/payments` | `sales.payment.create` | Registra pago parcial/total sin exceder saldo; requiere `Idempotency-Key` |
| GET `/sales/returns` | `sales.return.read` | Consulta devoluciones del tenant |
| GET/POST `/sales/:saleNumber/returns` | `sales.return.read/create` | Consulta o registra devolución; puede incluir reembolso y requiere `Idempotency-Key` al crear |
| GET `/purchases` | `purchases.purchase.read` | Ultimas 100 compras |
| POST `/purchases/:purchaseNumber/decision` | `purchases.purchase.approve` | Aprueba o rechaza una orden pendiente; rechazo requiere motivo |
| GET/POST `/purchases/requests` | `purchases.request.read/create` | Consulta o crea solicitudes de compra |
| GET/POST `/purchases/requests/:requestNumber/quotes` | `purchases.quote.read/create` | Consulta o registra cotizaciones de proveedores |
| POST `/purchases/requests/:requestNumber/award` | `purchases.quote.approve` | Adjudica cotizacion vigente y crea la orden atomicamente |
| POST `/purchases/:purchaseNumber/invoices` | `purchases.invoice.create` | Registra factura sobre cantidades recibidas; requiere `Idempotency-Key` |
| GET `/purchases/invoices` | `purchases.invoice.read` | Consulta facturas de proveedores |
| GET `/purchases/payables` | `purchases.payable.read` | Consulta facturas con saldo pendiente |
| POST `/purchases/invoices/:invoiceNumber/payments` | `purchases.payment.create` | Registra pago parcial/total; requiere `Idempotency-Key` |
| GET `/purchases/invoices/:invoiceNumber/payments` | `purchases.payment.read` | Consulta pagos aplicados a la factura |
| POST `/purchases` | `purchases.purchase.create` | Crea orden; no aumenta inventario hasta recibir |
| GET `/purchases/:purchaseNumber/receipts` | `purchases.receipt.read` | Consulta recepciones de la orden |
| POST `/purchases/:purchaseNumber/receipts` | `purchases.receipt.create` | Recibe cantidades parciales/totales y actualiza stock en transaccion; requiere `Idempotency-Key` y `receiptNumber` |
| POST `/purchases/:purchaseNumber/cancel` | `purchases.purchase.cancel` | Cancela orden solo si no tiene recepciones; requiere motivo |
| POST/GET `/purchases/:purchaseNumber/returns` | `purchases.return.create/read` | Registra o consulta devoluciones; escritura exige `Idempotency-Key` y crea nota de crédito |
| GET `/purchases/returns` | `purchases.return.read` | Lista devoluciones del tenant |
| GET `/purchases/credit-notes` | `purchases.credit.read` | Consulta notas de crédito con saldo disponible |
| POST `/purchases/credit-notes/:creditNoteNumber/invoices/:invoiceNumber/applications` | `purchases.credit.approve` | Aplica saldo de crédito a cuenta por pagar; requiere `Idempotency-Key` |
| GET `/purchases/reconciliation` | `purchases.reconciliation.read` | Conciliación de pagos/créditos y cantidades recibidas/devueltas |
| GET `/expenses` | `finance.expenses.read` | Lista gastos, actualmente limitada a 100 |
| POST `/expenses` | `finance.expenses.create` | Alta gasto |
| GET `/reports/summary` | `analytics.reports.read` | Totales agregados por tenant |
| GET/POST `/accounting/accounts` | `finance.account.read/create` | Consulta o crea cuentas del catálogo contable |
| GET/POST `/accounting/periods` | `finance.period.read/create` | Consulta o crea periodos contables sin solape |
| POST `/accounting/periods/:periodNumber/close` | `finance.period.approve` | Cierra periodo con motivo; bloquea nuevos asientos |
| GET/POST `/accounting/journal-entries` | `finance.journal.read/create` | Consulta o contabiliza asientos balanceados; POST requiere `Idempotency-Key` |
| GET `/accounting/trial-balance?from=&to=` | `finance.report.read` | Balance de comprobación por cuenta y rango opcional |

## Core ERP — Fase 1

| Metodo y ruta | Permiso | Comportamiento |
|---|---|---|
| GET `/core/companies` | `platform.companies.read` | Consulta empresa de la sesion |
| PATCH `/core/companies/:companyId` | `platform.companies.update` | Actualiza solo empresa propia |
| GET `/core/companies/:companyId/branches` | `platform.branches.read` | Lista sucursales propias |
| POST `/core/companies/:companyId/branches` | `platform.branches.create` | Crea sucursal propia |
| PATCH `/core/companies/:companyId/branches/:branchId` | `platform.branches.update` | Actualiza sucursal propia |
| GET `/core/permissions` | `platform.permissions.read` | Catalogo sembrado de permisos |
| GET `/core/roles` | `platform.roles.read` | Roles de empresa |
| POST `/core/roles` | `platform.roles.create` | Crea rol; solo delega permisos propios |
| PATCH `/core/roles/:roleId` | `platform.roles.update` | Actualiza rol de empresa |
| GET `/core/configuration` | `platform.configuration.read` | Configuracion de sucursal propia |
| PUT `/core/configuration/:key` | `platform.configuration.update` | Guarda clave/valor de sucursal |
| GET `/core/sessions` | Sesion propia | Sesiones activas del usuario |
| DELETE `/core/sessions` | Sesion propia | Revoca todas las sesiones del usuario |
| GET `/core/audit` | `platform.audit.read` | Ultimos 100 eventos de empresa/sucursal |

La empresa inicial y el administrador inicial se crean mediante `PHASE1_MIGRATION.md`. No hay API global para crear tenants adicionales ni para modificar el catalogo de permisos.

## Limites y compatibilidad

- Validacion Zod devuelve 422; errores conocidos usan 401/403/404/409. JSON limitado a 1 MB.
- Algunas listas carecen de filtros/paginacion; usuarios, catálogos y auditoria deben limitarse antes de crecer en volumen.
- Importes siguen siendo centavos enteros; moneda no esta expresada.
- Las escrituras de inventario y recepciones de compra requieren idempotencia; no hay contrato OpenAPI.
- JWT anteriores sin `sid` reciben 401 `SESSION_REQUIRED`; iniciar sesion de nuevo crea una sesion persistida.
- Los tipos de `master-data` son `customers`, `suppliers`, `categories`, `brands`, `products`, `units`, `taxes`, `warehouses`, `payment-methods` y `price-lists`; atributos y reglas están en `MASTER_DATA.md`.
- Las escrituras de inventario requieren Mongo replica set y el header `Idempotency-Key`; detalles en `INVENTORY.md`.
- Se conservan las rutas de negocio, pero las peticiones autenticadas deben tener tenant activo.
- Siguen pendientes solicitudes y cotizaciones de compra, facturas, devoluciones, CRM, POS, RRHH y asientos contables.


## Inventario por lote y serie

- `GET /inventory/:productCode/:warehouseCode/lots` (`inventory.stock.read`) consulta saldos por lote y caducidad.
- `GET /inventory/:productCode/:warehouseCode/serials` (`inventory.stock.read`) consulta series disponibles en ese almacén.
- Movimientos, recepciones y transferencias admiten lote/serie según la configuración del producto; ver `INVENTORY.md`.

Para productos con seguimiento por lote, `POST /inventory/reservations` requiere `lotCode`; para seguimiento serial requiere una lista `serialNumbers` igual a la cantidad entera reservada. Release/consume aplican al detalle reservado original.

## Ubicaciones de almacén

- `GET /inventory/locations?warehouseCode=WH1` lista ubicaciones activas del almacén para la sucursal del usuario.
- `POST /inventory/locations` crea una ubicación; requiere permiso `inventory.movement.create` y cuerpo `{ warehouseCode, code, name, description? }`. `code` es único por empresa, sucursal y almacén.
- `GET /inventory/:productCode/:warehouseCode/locations` consulta saldos físicos positivos por ubicación.
- Movimientos, recepciones, reservas, transferencias y conteos admiten ubicación para productos sin seguimiento por lote/serie. En transferencias se usan `sourceLocationCode` y `destinationLocationCode`; para asignar saldo antiguo a un bin, se puede indicar solo destino en una transferencia dentro del mismo almacén.
- Los cambios en saldos de ubicación y almacén comparten la transacción. Los productos con control de lote/serie aún no aceptan bins.

## CRM y POS — Fase 7

| Método y ruta | Permiso | Comportamiento |
|---|---|---|
| GET/POST `/crm/leads` | `crm.lead.read/create` | Consulta o crea leads del tenant |
| PATCH `/crm/leads/:leadNumber` | `crm.lead.update` | Actualiza estado, asignación o notas |
| GET/POST `/crm/opportunities` | `crm.opportunity.read/create` | Consulta o crea oportunidades |
| PATCH `/crm/opportunities/:opportunityNumber` | `crm.opportunity.update` | Cambia etapa, monto o probabilidad |
| GET/POST `/crm/activities` | `crm.activity.read/create` | Consulta/crea actividad asociada a entidad |
| POST `/crm/activities/:activityNumber/complete` | `crm.activity.update` | Marca actividad completada |
| GET/POST `/pos/sessions` | `pos.session.read/create` | Consulta o abre sesión de caja |
| POST `/pos/sessions/:sessionNumber/close` | `pos.session.approve` | Cierra con efectivo contado y calcula diferencia |
| GET `/pos/sessions/:sessionNumber/tickets` | `pos.ticket.read` | Consulta tickets de la sesión |
| POST `/pos/tickets` | `pos.ticket.create` | Crea venta, salida de stock, pago y ticket; requiere `Idempotency-Key` |

Condiciones y límites de CRM/POS están descritos en `CRM_POS.md`. Las escrituras POS requieren transacciones de MongoDB replica set.
