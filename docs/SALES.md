# Ventas — Fase 5

## Flujo implementado

- `POST/GET /api/v1/sales/quotes` crea o consulta cotizaciones vigentes. `POST /sales/quotes/:quoteNumber/convert` convierte una cotización abierta en un pedido en una transacción; una cotización solo se convierte una vez y no reserva stock.
- `POST/GET /api/v1/sales/orders` crea o consulta pedidos directos. `POST/GET /sales/orders/:orderNumber/deliveries` realiza/consulta entregas parciales. Cada entrega idempotente crea una venta y descuenta stock, lotes y series junto al avance del pedido en una sola transacción.
- `POST /api/v1/sales` crea una venta, valida cliente opcional y productos, calcula importes y descuenta inventario dentro de una transacción MongoDB. Requiere `Idempotency-Key`.
- Cada línea admite cantidad decimal según la unidad, precio en centavos y trazabilidad opcional por lote/serie. Los productos de servicio (`trackInventory: false`) no mueven stock.
- `discountBps` y `taxBps` son tasas enteras en puntos base (100 = 1%); descuento se aplica primero y el impuesto sobre el neto. El descuento/impuesto monetario se calcula en centavos, con redondeo al centavo más cercano.
- `GET /api/v1/sales` lista ventas del tenant.
- `POST /api/v1/sales/:saleNumber/invoices` emite un snapshot de factura con líneas e importes; una factura por venta, emisión idempotente. `GET /api/v1/sales/invoices` lista facturas. La factura representa documento interno; no timbra ni sustituye factura electrónica fiscal.
- `POST/GET /api/v1/sales/:saleNumber/payments` registra o consulta pagos. El alta requiere `Idempotency-Key`, ocurre en transacción y bloquea sobrepagos, incluso con solicitudes concurrentes.
- `POST /api/v1/sales/:saleNumber/returns` devuelve cantidades no devueltas, registra crédito, repone stock con lotes/series cuando corresponde, y permite reembolsar una cantidad indicando `refundAmountCents` y `refundMethod`. Exige idempotencia.
- `GET /api/v1/sales/returns` y `GET /api/v1/sales/:saleNumber/returns` consultan devoluciones.

## Estados e integridad

La venta inicia `COMPLETED` con saldo por cobrar. Los pagos actualizan `PARTIALLY_PAID` o `PAID`; una venta completamente devuelta queda `RETURNED`. Saldo pendiente = total − pagos netos − devoluciones; si el pago recibido supera el total después de una devolución, se informa `customerRefundDueCents`. El reembolso reduce el pago neto. No se admite devolver más unidades de las vendidas ni reembolsar más de lo devuelto o de los pagos netos recibidos.

Inventario, venta/pago/devolución y ledger se confirman en la misma transacción. MongoDB debe ejecutarse como replica set. Los identificadores comerciales son únicos por empresa/sucursal; ventas, pagos y devoluciones siempre filtran por ámbito autenticado. Quedan el timbrado/folio fiscal y la conciliación contable de pagos/reembolsos; el libro financiero corresponde a Fase 6.
