# Reglas de negocio

## Core Fase 1

- Cada usuario activo pertenece a una empresa y sucursal activa y referencia un rol activo de su empresa.
- El usuario y su rol deben estar activos; sesiones persistidas deben existir, no estar revocadas y no haber expirado.
- La empresa y sucursal se resuelven desde el usuario/sesion almacenado; los IDs de tenant del body no se admiten como autoridad.
- Los permisos actuales se leen del rol persistido en cada llamada, por lo que los cambios se aplican de inmediato.
- Un rol solo puede delegar permisos que el actor tiene; el catalogo de permisos es sembrado, no editable por el administrador del tenant.
- Cambiar empresa/sucursal asignada, desactivar usuario/empresa/sucursal o revocar la sesion invalida el acceso.
- Los registros actuales sin tenant se asignan a la empresa/sucursal inicial aprobada mediante el migrador de `PHASE1_MIGRATION.md`.
- El administrador de empresa puede configurar su tenant inicial, pero no crear otras empresas. El alta de tenants requiere aprovisionamiento de plataforma pendiente.

## Reglas preexistentes conservadas

- Usuario tiene estado ACTIVE/INACTIVE; las contrasenas se guardan con hash.
- Codigo de catalogo es unico en el ambito de empresa/tipo.
- El saldo no puede ser negativo en salida; IN suma, OUT resta, ADJUSTMENT establece el saldo indicado. Esta semantica sigue pendiente de refinamiento en inventario.
- Compras y ventas guardan importes monetarios en centavos enteros y validan referencias dentro del tenant.

## Inventario — Fase 3

- Inventario requiere Mongo replica set. IN suma, OUT descuenta existencia disponible, ADJUSTMENT establece conteo absoluto; transferencias y conteos postean en una transacción.
- El stock reservado no está disponible para OUT/transferencias y un ajuste no puede dejar la existencia por debajo de reservas activas.
- Las mutaciones llevan `Idempotency-Key`; una misma clave con payload distinto se rechaza. El saldo, ledger y operación se confirman juntos.
- Transferencias son entre almacenes de la misma sucursal. Conteos registran cantidad esperada, contada y diferencia; conteos duplicados no se aceptan.
- Reservas separan disponible de existencia; deben consumirse o liberarse manualmente y no tienen caducidad automática.
- Cantidades respetan los decimales de la unidad; productos legados sin unidad aceptan hasta tres decimales.

## Datos maestros — Fase 2

- Los códigos de cada colección son únicos por empresa; referencias de productos/listas de precio deben apuntar a registros activos de la misma empresa.
- El producto exige categoría y unidad; el precio y costo se expresan en centavos enteros, las tasas en puntos base.
- Las categorías no pueden formar ciclos. Los almacenes pertenecen a una sucursal; el resto de catálogos se comparte a nivel de empresa.
- Desactivar es lógico. Se rechaza desactivar referencias usadas por productos activos o productos usados por listas de precio activas.
- La ruta anterior `/catalogs` no se debe usar en paralelo como origen de escritura para los mismos datos. Sus `metadata` requieren migración y revisión manual antes de convertirlos.

## Decisiones pendientes

Moneda e impuestos, zona horaria, numeración documental, crédito, cancelaciones/devoluciones, reglas de stock por sucursal, periodos contables, sesiones/renovación y retención de auditoría.

## Compras — Fase 4

- Crear una compra crea una orden pendiente de aprobación; no mueve inventario.
- Cada recepcion identifica almacen y numero unico dentro de empresa/sucursal, solo puede aceptar el saldo pendiente por linea y se guarda como documento independiente.
- La recepcion, sus lineas, el avance/estado de la orden y los movimientos/saldos de inventario se confirman en una transaccion MongoDB y comparten la clave de idempotencia.
- Una orden pasa a `PARTIALLY_RECEIVED` o `RECEIVED`; solo se cancela si aun no tiene recepciones.
- Proveedor, productos y almacen deben existir y estar activos dentro de la empresa; el almacen debe pertenecer a la sucursal activa.
- Facturas, pagos, devoluciones, notas de crédito y conciliación requieren la misma transacción MongoDB para sus efectos relacionados.

## Ventas — Fase 5

- El precio de línea y los porcentajes de descuento/impuesto se convierten a centavos enteros; descuento se aplica antes del impuesto.
- El alta de venta descuenta existencias y escribe el ledger en una transacción; productos no inventariables no generan movimiento. Productos trazables exigen lote o serie coherente con la cantidad.
- Las claves de idempotencia vinculan la solicitud y actor al resultado; reutilizarlas con distinto payload produce conflicto.
- Pagos no pueden exceder el saldo neto después de devoluciones; transacciones serializan el control para evitar sobrepago concurrente.
- Las devoluciones no pueden exceder cantidades vendidas; el crédito reduce el saldo por cobrar. El reembolso está limitado a la devolución y al pago neto recibido y repone inventario trazable en la misma transacción.
- Las ventas usan estados `COMPLETED`, `PARTIALLY_PAID`, `PAID`, `RETURNED` y `CANCELLED`; cobros y devoluciones actualizan saldo y estado juntos.

## Contabilidad — Fase 6 (base inicial)

- El plan de cuentas es propio de la empresa; los asientos y saldos se consultan dentro de la sucursal autenticada.
- Cada asiento contabilizado tiene dos o más líneas, una sola naturaleza por línea y totales de débito/crédito iguales.
- Solo se contabiliza en cuentas activas y contabilizables, en un periodo abierto y dentro de sus fechas.
- La misma fuente comercial no se contabiliza dos veces; una misma clave idempotente con payload distinto se rechaza.
- El cierre del periodo y el posteo de asientos modifican el documento de periodo dentro de la transacción para evitar escrituras cruzadas.
- Los asientos posteados son inmutables; corregirlos requiere reversa contable, aún pendiente.
## Trazabilidad de inventario — Fase 3 (incremental)

- Los productos tipados pueden activar `trackLots` y `trackSerials` antes de iniciar movimientos; ambos valores son falsos por defecto.
- Un producto con control por lote exige lote en entradas, salidas, recepciones y transferencias; una salida no puede exceder el saldo de ese lote.
- Un producto con control por serie exige una serie por unidad entera en entradas y recepciones; una salida solo acepta series existentes en ese almacén. Las transferencias cambian el almacén de cada serie en la misma transacción.
- Ajustes por lote y conteos por lote/serie actualizan juntos los saldos detallados y agregados. Las reservas se respetan y no se pueden reducir ni omitir en conteos/ajustes.
- No se permite cambiar la configuración de trazabilidad tras movimientos o saldo inicial distinto de cero. La carga de saldos iniciales trazables aún requiere una migración específica.

- Para productos trazables, la reserva también bloquea las cantidades del lote y/o las series concretas. Liberar repone la disponibilidad; consumir reduce el saldo agregado y el detallado en una sola transacción.
- Una salida genérica no puede usar cantidades o series reservadas; los conteos/ajustes deben incluir la traza completa para conciliar existencias.
- Los productos pueden definir mínimos, máximos y punto de reorden. La consulta de stock devuelve umbrales y marca si se alcanzó el mínimo o punto de reorden; la reposición automática no se ejecuta.
