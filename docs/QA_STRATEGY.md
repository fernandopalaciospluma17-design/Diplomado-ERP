# Estrategia QA

## Evidencia de revisión

Once archivos Vitest con 46 pruebas: utilidades de contraseña/JWT, health/API, validadores Core/compras/ventas/contabilidad/CRM/POS, middleware RBAC y trazabilidad de inventario. Typecheck y pruebas pasaron en la revisión local; repetir build/typecheck/tests al retomar. MongoDB Atlas configurado en el `.env` de la raíz agotó el tiempo de conexión en dos intentos; tampoco está disponible Mongo local ni Docker. Por ello no se ejecutó integración de transacciones en replica set. Tampoco hay E2E ni pruebas frontend.

## Capas objetivo

1. Unitarias: validadores, cálculos y reglas puras.
2. Integración: servicios/modelos sobre MongoDB aislado y transacciones disponibles.
3. API: contrato, sesión, permisos y códigos/status.
4. Concurrencia: stock, pagos, identificadores y estados.
5. E2E: flujos por rol en backend y web/móvil.
6. Seguridad: aislamiento multiempresa, autorización horizontal, abuso de login, configuración y auditoría.
7. Regresión: compatibilidad API y datos previos por fase.

## Gate de Fase 2

- Validar Zod por recurso, paginación y límites de consulta.
- Probar autorización específica por tipo (un permiso de customers no debe habilitar products).
- Probar unicidad por empresa y rechazo de referencias inexistentes, inactivas o de otra empresa.
- Verificar ciclos de categoría, dependencias al desactivar y filtros de warehouse por sucursal.
- Convertir datos `Catalog.metadata` con un informe de filas sin mapeo antes de usar la API tipada en una base existente.

## Gate de Fase 3

- Ejecutar integración sobre un Mongo replica set temporal; una instancia standalone debe rechazar las escrituras transaccionales sin persistir datos parciales.
- Probar carreras de salidas, reservas simultáneas y reintentos con la misma clave idempotente.
- Probar transferencia y conteo con rollback cuando una línea no sea válida y comprobar ledger/saldo posteriores.
- Verificar precisión por unidad, stock negativo solo cuando el almacén lo permite, e invariantes entre existencia, reservas y disponible.

## Gate de Fase 1 pendiente

- Ejecutar dry-run y migración con backup en la instancia acordada.
- Verificar asignación de empresa/sucursal, índices y unicidad.
- Probar login, revocación de sesión, permisos cambiados y aislamiento entre ámbitos en MongoDB.
- Revisar rutas con sesión válida y comportamiento de usuarios/roles desactivados.

Los fallos restantes de QA de inventario/pagos concurrentes pertenecen a la deuda anotada para las fases funcionales; no fueron cambiados en esta fase.

## Gate de Fase 4

- Verificar solicitud duplicada, referencias inactivas/fuera del tenant, producto duplicado y registro de cotización con productos/cantidades diferentes a lo solicitado.
- Adjudicar cotización vigente: orden, estado de solicitud y cotizaciones no seleccionadas deben confirmarse juntas; fallo/duplicate order debe revertir todo.
- Rechazar cotización vencida, cotización ajena a la solicitud, segunda adjudicación y usuarios sin `purchases.quote.approve`.
- Facturar solo cantidades recibidas no facturadas; verificar que fallo o idempotent retry no duplique saldo AP.
- Aplicar pagos parciales hasta saldo cero; rechazar sobrepago, número duplicado y método de pago inactivo, y comprobar rollback conjunto factura/pago.
- Verificar que crear una orden no altere existencias y que recepciones parciales actualicen cantidades pendientes.
- Confirmar que el exceso, producto/proveedor/almacen fuera del tenant, recepcion duplicada y cancelacion con recepciones se rechacen.
- Forzar error durante recepcion y verificar rollback conjunto de orden, recibo, ledger y saldo.
- Reintentar con la misma clave/payload y comprobar respuesta idempotente; misma clave con otro payload debe dar conflicto.
- Orden directa/adjudicada permanece `PENDING_APPROVAL`; solo decisión con permiso puede habilitar recepción; el rechazo exige motivo y no admite recepción posterior.
- Devolver únicamente unidades recibidas y facturadas; verificar salida de inventario, cantidades devueltas/facturadas, nota de crédito y rollback integral al forzar un error.
- Aplicar nota de crédito al mismo proveedor; rechazar proveedor distinto, aplicación mayor al saldo de la nota/factura y clave idempotente reutilizada con payload diferente.
- Conciliar un flujo sin diferencias y luego alterar cantidades/importes de prueba para comprobar que `/purchases/reconciliation` devuelve discrepancias explicativas.
- Ejecutar estos escenarios con Mongo replica set; no estan ejecutados por este cambio.

## Gate de Fase 5

- Crear venta con inventario suficiente, impuestos/descuento, lote y serie; comprobar importes y saldo de inventario/ledger confirmados conjuntamente.
- Rechazar venta sin stock, producto/cliente/almacén inactivo, serie o lote ajenos, productos repetidos e importes fuera del rango seguro.
- Reintentar venta/pago/devolución con la misma clave y comprobar que no se duplica; usar la clave con otra carga útil y verificar conflicto.
- Ejecutar pagos concurrentes cuya suma exceda el saldo: debe persistir solo el importe permitido. Comprobar estados `PARTIALLY_PAID`/`PAID`.
- Devolver parcialmente y totalmente; verificar límites de cantidades, lote/serie repuestos, impuesto/descuento prorrateados, crédito por cobrar y reembolso dentro de los pagos netos recibidos.
- Forzar error entre actualización de stock y documento comercial y verificar rollback integral.
- Ejecutar los escenarios sobre Mongo replica set aislado; no están ejecutados en esta revisión.
- Convertir cotización una sola vez; pedido no altera stock; entregas parciales actualizan el remanente y generan sus ventas/movimientos en conjunto.
- Emitir una sola factura snapshot por venta; pago posterior actualiza el estado de la factura.

## Gate de Fase 6

- Rechazar cuentas duplicadas, padres inválidos/no agrupadores y posteos en cuentas inactivas o de agrupación.
- Crear periodos y rechazar solapes; contabilizar dentro/fuera de fechas, cerrar periodos y probar carreras cierre/posteo.
- Postear diarios balanceados e idempotentes; rechazar débitos/créditos desbalanceados, fuentes duplicadas y claves idempotentes reutilizadas con otro payload.
- Comparar balance de comprobación con los asientos y verificar débitos = créditos en cualquier rango.
- Forzar error y comprobar rollback del asiento, periodo y operación idempotente en Mongo replica set.
### Fase 3 — lotes y series

- Recibir y consumir un lote preserva saldo, fecha de caducidad y ledger; bloquear salidas por encima del saldo del lote.
- Recibir, mover y consumir series conserva una sola ubicación y bloquea duplicados, serie inexistente o serie en otro almacén.
- Comprobar que un fallo en cualquier paso revierte tanto el balance agregado como el saldo de lote/serie y el movimiento.
- Verificar que ajustes y conteos trazables actualicen en conjunto saldos agregados, lotes, series, reservas y ledger; comprobar rechazo y rollback de reconciliaciones incompletas.
- Probar en Mongo replica set aislado; las pruebas de esta entrega solo cubren validadores y no reemplazan la integración transaccional.
- Reservar, liberar y consumir lotes/series debe conservar disponible, reservado, saldos detallados y ledger; salidas externas no deben consumir recursos reservados.
- Verificar reglas min/max/reorden, precisión de cantidades en conteos y consistencia entre suma de lotes/series y saldo agregado.
