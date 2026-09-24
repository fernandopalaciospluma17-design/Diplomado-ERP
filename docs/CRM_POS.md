# CRM y punto de venta

## CRM

Rutas bajo `/api/v1/crm`: altas y listas de leads y oportunidades, actualizaciones de estado/etapa y actividades asociadas a leads u oportunidades. Todos los documentos se filtran por empresa y sucursal. Las oportunidades requieren lead o cliente y no pueden reabrirse una vez ganadas o perdidas.

Permisos: `crm.lead.read/create/update`, `crm.opportunity.read/create/update` y `crm.activity.read/create/update`. El rol USER recibe lectura; las escrituras dependen de los permisos asignados al rol.

La conversión de una oportunidad ganada a pedido/venta no está implementada todavía. Las listas son acotadas a 100 documentos y no incluyen búsqueda/paginación.

## POS

- `GET/POST /api/v1/pos/sessions`: consultar y abrir sesiones de caja.
- `POST /api/v1/pos/sessions/:sessionNumber/close`: cerrar la sesión con efectivo contado; guarda esperado y diferencia.
- `GET /api/v1/pos/sessions/:sessionNumber/tickets`: consultar tickets de una sesión.
- `POST /api/v1/pos/tickets`: crea venta, descuenta inventario, registra el pago completo y ticket en una transacción; requiere `Idempotency-Key`.

Permisos: `pos.session.read/create/approve` y `pos.ticket.read/create`. Una terminal solo admite una sesión abierta por empresa y sucursal. El cierre calcula efectivo esperado como fondo inicial más ventas pagadas en efectivo; requiere MongoDB replica set. Tarjeta y transferencia se registran como cobros no efectivo, sin conciliación bancaria.

Devoluciones, retiros/ingresos de caja, cancelación de tickets y reembolsos integrados con una sesión POS quedan pendientes. Antes de uso real deben probarse concurrencia y atomicidad en un replica set MongoDB.
