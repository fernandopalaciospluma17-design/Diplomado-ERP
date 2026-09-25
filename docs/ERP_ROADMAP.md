# Roadmap ERP

El avance respeta el orden de fases solicitado. Estado actualizado al 2026-09-24.

| Fase | Alcance | Estado actual | Siguiente salida |
|---|---|---|---|
| 0 Auditoría/arquitectura | Baseline, GAP, contratos y riesgos | Documentada | Cerrada |
| 1 Core ERP | Empresa, sucursal, usuario, RBAC, configuración, auditoría, sesión | Implementada; tenant/branch fixture e integración transaccional pasan en Mongo desechable | Aplicar con respaldo al entorno objetivo y verificar aislamiento multitenant |
| 2 Master Data | Clientes, proveedores, productos, categorías, marcas, unidades, impuestos, almacenes, medios de pago, precios | API tipada implementada; permisos/índices requieren aplicar el migrador; mapeo de catálogo legado pendiente | Importar metadata legado con relaciones revisadas; validar contratos con frontend |
| 3 Inventario | Balance, ubicaciones, transferencias, ajustes, conteos, reservas, lotes/series, mínimos/máximos/reorden | Gate integrado de movimientos, idempotencia, reserva y transferencia pasa en Mongo replica set; falta trazabilidad por ubicación de lotes/series y concurrencia amplia | Completar bins para lotes/series; pruebas de concurrencia |
| 4 Compras | Solicitud/cotizacion/orden/recepcion/factura/AP/pago | Gate integrado de solicitud, cotización, adjudicación, aprobación, recepción, factura y pago pasa en Mongo replica set | Completar concurrencia, devoluciones, créditos y conciliación ampliada |
| 5 Ventas | Cotización/pedido/venta/entrega/factura/pago/devolución | Gate integrado de cotización, pedido, entrega, factura, pago y devolución pasa en Mongo replica set | Completar concurrencia, E2E y timbrado fiscal |
| 6 Finanzas/contabilidad | Caja/banco, AR/AP, periodos, plan y diario | Gate integrado de cuentas, periodo, asiento idempotente y balance de comprobación pasa en Mongo replica set | Auto-posteo de ventas/AP/gastos, reversas y conciliación de caja/bancos |
| 7 CRM/POS | Pipeline y ciclo de caja/ticket | Gate integrado de sesión, ticket, venta, cobro y cierre POS pasa en Mongo replica set; CRM conversión y reembolsos POS siguen pendientes | Completar ciclo CRM/POS y pruebas de concurrencia |
| 8 RRHH | Empleado, estructura, asistencia, vacaciones, nómina | Empleados, ausencias y asistencia implementadas y auditadas en Mongo; nómina pendiente de política fiscal | Completar departamentos, vacaciones avanzadas y nómina definida |
| 9 Analytics/BI | KPIs y reportes | Resumen con filtros y señal de conciliación del ledger | Reconciliación por documento, exportación y KPIs ampliados |
| 10 Frontend multiplataforma | Web y mobile | Auth, sesión persistida, dashboard, módulos y expiración 401 | CRUD, selección de sucursal, E2E y accesibilidad ampliada |
| 11 QA/seguridad/producción | Pruebas, hardening y operación | Readiness, redacción, guardas de producción, auditoría y runbook | Integración Mongo, E2E, backups/restore y monitoreo |

## Secuencia

1. Completar gate operacional de Fase 1 en la base objetivo: respaldo, migración y aislamiento real. La instancia desechable solo validó el flujo inicial.
2. Completar maestros y referencias antes de integrar procesos comerciales.
3. Endurecer inventario antes de conectarlo con compras/ventas.
4. Implementar documentos financieros y contabilidad a partir de decisiones de negocio aprobadas.
5. CRM/POS, RRHH, BI y frontend avanzan sobre contratos estables.
6. Cada fase necesita pruebas y documentación; el hardening de producción acompaña, no reemplaza los gates de cada dominio.

La Fase 1 se validó con typecheck/build y pruebas, además de un smoke integration en un contenedor Mongo local desechable. La migración de una base real o compartida no se ha ejecutado.
