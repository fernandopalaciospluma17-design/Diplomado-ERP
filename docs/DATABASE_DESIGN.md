# Diseño de base de datos — Fases 1 y 2

## Colecciones actuales

| Colección | Forma / referencias | Índices principales | Nota |
|---|---|---|---|
| Company | code, legalName, name, taxId?, status | code único; taxId sparse único | Empresa inicial se crea por migrador |
| Branch | companyId, code, name, address?, status | companyId+code único | Pertenece a Company |
| User | email, hash, companyId, branchId, roleId, status, lastLogin | email único; company/branch/status | Email globalmente único |
| Permission | code, module, resource, action | code único y módulo/recurso/acción único | Catálogo sembrado |
| Role | companyId, code, name, permissionIds, status | companyId+code único | Solo delega permisos del actor |
| Configuration | companyId, branchId?, key, value, updatedBy | companyId+branchId+key único | Configuración por tenant |
| Session | userId, companyId?, branchId?, expira/revoca, IP/agente | userId+fecha; TTL expiración | Sin refresh token todavía |
| Catalog | tenant, kind, code, name, descripción, status, metadata | company+kind+code único | Seis tipos, sigue siendo genérico |
| Customer / Supplier | tenant, code, name, estado, atributos tipados de contacto/fiscal/crédito | company+code único; taxId único cuando se informa | Datos maestros de cliente/proveedor |
| ProductCategory / Brand / Product | tenant, código, nombre, estado, atributos tipados y referencias a registros de la empresa | company+code único; barcode único cuando se informa | Producto requiere categoría y unidad activas |
| Unit / Tax | tenant, code, símbolo/decimales o tasa en puntos base | company+code único | Valores tipados y acotados |
| Warehouse / PaymentMethod / PriceList | tenant, sucursal de almacén, atributos operativos/de pago/precios | company+code único | Lista de precios guarda moneda, vigencia y precios por producto |
| InventoryBalance | tenant, producto/almacén, existencia, reservado, revisión | company+branch+product+warehouse único | disponible = existencia - reservado |
| InventoryMovement | tenant, códigos, tipo, diferencia, conteo/meta, antes/después, operación, actor | tenant+códigos+fecha; operación+secuencia | Ledger inmutable |
| InventoryOperation | tenant, idempotencyKey, requestHash, tipo, resultado | company+branch+idempotencyKey único | Reproduce respuesta segura en reintentos |
| InventoryTransfer / InventoryCount | tenant, almacenes, detalle, diferencias, operación, actor | company+branch+número único | Transferencia y conteo físico atómicos |
| InventoryReservation | tenant, producto/almacén, cantidad, estado, operación | company+branch+número único; status scope | Consume o libera stock reservado |
| Sale / Purchase | tenant, número, referencias de código, líneas embebidas y totales | company+número único | Ventas: descuento/impuesto, saldo y unidades/importe devueltos |
| Payment | tenant, saleNumber, amountCents, método, referencia, actor, operationId | tenant+saleNumber+fecha | Pago idempotente y límite transaccional de saldo |
| SaleReturn | tenant, returnNumber, saleNumber, líneas, crédito/reembolso, operationId | tenant+sucursal+número único | Repone stock y recalcula saldo de venta en una transacción |
| SalesQuote / SalesOrder / SalesDelivery / SalesInvoice | tenant, código comercial, líneas/totales y estados | tenant+sucursal+número único | Cotiza, convierte, entrega parcialmente con salida de stock y conserva snapshot de factura |
| Expense | tenant, número, categoría, importe, fecha, actor | company+expenseNumber único | Sin ledger contable |
| Audit | tenant opcional, actor, acción, módulo/entidad, método/ruta/status, IP/requestId | company+actor/fecha; company+fecha | Snapshot before/after pendiente |

## Decisiones

- Ventas y compras embeben líneas mientras cada documento sea de tamaño razonable. Las referencias actuales por código deben evolucionar a IDs estables y snapshots documentales cuando se definan las reglas.
- Los documentos de negocio llevan `companyId`/`branchId`; controladores obtienen ese ámbito de la sesión persistida y servicios lo incluyen en cada consulta/escritura.
- La migración asigna los registros previos sin tenant a la empresa/sucursal inicial confirmada. Reemplaza los índices globales conocidos por índices compuestos. Ver `PHASE1_MIGRATION.md`.
- Los permisos son globales y sembrados; los roles están limitados por empresa. Configuración usa claves por empresa o sucursal.
- Fase 2 separa los datos maestros por colección y ámbito de empresa; almacenes se filtran por sucursal. Las referencias activas se validan dentro de la misma empresa.
- Sesiones guardan expiración/revocación e índice TTL. El access JWT dura según `JWT_EXPIRES_IN` (15 minutos por defecto); refresh token aún no existe.
- La prueba Core usó una instancia Mongo desechable local. No se ejecutó migración en la base real/desarrollo.
- `/catalogs/:kind` conserva compatibilidad; convertir sus metadatos a colecciones tipadas requiere mapear referencias y no se hace automáticamente.

## Consistencia pendiente

Completar los flujos compuestos restantes con transacciones; verificar concurrencia de balance general y saldos por lote/serie; proteger idempotencia; traducir conflictos E11000 a 409; definir moneda, impuestos, redondeo, retención de snapshots, periodos y borrado lógico.


## Colecciones adicionales de inventario

| Colección | Campos | Índices principales | Nota |
|---|---|---|---|
| InventoryLotBalance | tenant, producto, almacén, lote, caducidad, cantidad | tenant+producto+almacén+lote único | Subsaldo sincronizado con movimientos en la transacción |
| InventorySerial | tenant, producto, serie, almacén, estado IN/OUT | tenant+producto+serie único | Una serie no puede existir simultáneamente en dos almacenes |
| PurchaseRequest / SupplierQuote | tenant, solicitud, productos, proveedor/precio/validez, estado | tenant+sucursal+número único | Adjudicación transaccional crea orden y marca cotizaciones |
| PurchaseInvoice / SupplierPayment | tenant, orden/factura, líneas, importes, saldo, fecha/método | tenant+sucursal+número único | Factura no supera recepción; pagos reducen AP en transacción |
