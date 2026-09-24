# Compras — Fase 4

## Flujo implementado

- Solicitudes internas (`POST/GET /api/v1/purchases/requests`) y cotizaciones por proveedor (`POST/GET /requests/:requestNumber/quotes`).
- Adjudicar una cotización vigente (`POST /requests/:requestNumber/award`) crea una orden y actualiza estados en una transacción MongoDB.
- Órdenes directas y adjudicadas quedan `PENDING_APPROVAL`. `POST /:purchaseNumber/decision` admite `APPROVE` o `REJECT`; el rechazo exige motivo. El actor y fecha de aprobación quedan registrados. Recepciones admiten órdenes aprobadas y documentos legados `ORDERED`.
- Recepciones parciales o totales (`POST/GET /:purchaseNumber/receipts`) actualizan existencias, lotes/series y ledger de inventario atómicamente. Se requiere `Idempotency-Key`.
- Facturas (`POST /:purchaseNumber/invoices`) no pueden exceder cantidades recibidas. `GET /invoices` y `GET /payables` consultan facturas y saldos.
- Pagos (`POST/GET /invoices/:invoiceNumber/payments`) permiten abonos parciales, requieren medio de pago activo y no exceden el saldo. Las escrituras exigen `Idempotency-Key`.
- Devoluciones (`POST /:purchaseNumber/returns`) requieren cantidad recibida y facturada disponible, y generan salida de inventario, documento de devolución y nota de crédito en la misma transacción. `GET /returns` lista; también se puede filtrar por orden.
- `GET /credit-notes` consulta notas disponibles. `POST /credit-notes/:creditNoteNumber/invoices/:invoiceNumber/applications` aplica crédito a una cuenta del mismo proveedor, respetando el saldo disponible de ambos documentos.
- `GET /reconciliation` compara facturas contra pagos y créditos aplicados, y líneas de orden contra recibos y devoluciones. Informa diferencias por documento y no hace ajustes automáticos.
- `POST /:purchaseNumber/cancel` cancela órdenes no recibidas.

## Integridad, permisos y límites

Las operaciones que actualizan más de un documento requieren MongoDB como replica set. Las claves idempotentes tienen entre 8 y 120 caracteres; la misma clave y payload devuelve el resultado previo y otra carga útil produce conflicto. Los identificadores de negocio se limitan por empresa/sucursal según los índices de cada modelo. Los usuarios tienen permisos de lectura de compras; las escrituras y aprobaciones están reservadas al rol administrador por defecto y pueden asignarse con RBAC.

Los importes están en centavos enteros. La nota de crédito calcula el impuesto proporcional sobre el valor devuelto. La conciliación cubre los documentos y cantidades modelados; no sustituye un ledger contable ni reconcilia estados de cuenta bancarios. Ejecutar el gate Mongo replica set de `QA_STRATEGY.md` antes de producción.
