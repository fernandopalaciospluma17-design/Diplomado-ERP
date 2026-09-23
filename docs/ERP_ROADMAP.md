# Roadmap ERP

El avance respeta el orden de fases solicitado. Estado actualizado al 2026-09-23.

| Fase | Alcance | Estado actual | Siguiente salida |
|---|---|---|---|
| 0 Auditoría/arquitectura | Baseline, GAP, contratos y riesgos | Documentada | Cerrada |
| 1 Core ERP | Empresa, sucursal, usuario, RBAC, configuración, auditoría, sesión | Código implementado; migración e integración Mongo pendientes | Ejecutar dry-run, respaldo y migración documentada; probar tenant y sesión |
| 2 Master Data | Clientes, proveedores, productos, categorías, marcas, unidades, impuestos, almacenes, medios de pago, precios | Catálogo genérico parcial | Relaciones y reglas de cada entidad |
| 3 Inventario | Balance, ubicaciones, transferencias, ajustes, conteos, reservas, lotes/series | Balance/movimientos simples con scope tenant | Concurrencia, atomicidad, trazabilidad e invariantes |
| 4 Compras | Solicitud/cotización/orden/recepción/factura/AP/pago | Documento simple sin entrada a stock | Flujo y recepción transaccional |
| 5 Ventas | Cotización/pedido/venta/entrega/factura/pago/devolución | Documento simple y pagos | Estados, impuestos, descuentos, devoluciones |
| 6 Finanzas/contabilidad | Caja/banco, AR/AP, periodos, plan y diario | Gastos y resumen agregado parcial | Partida doble y conciliación |
| 7 CRM/POS | Pipeline y ciclo de caja/ticket | Faltante | Conversión CRM y caja conciliada |
| 8 RRHH | Empleado, estructura, asistencia, vacaciones, nómina | Faltante | Dominio desacoplado |
| 9 Analytics/BI | KPIs y reportes | Resumen simple | Métricas reconciliables y filtros |
| 10 Frontend multiplataforma | Web y mobile | Pantalla Expo de health | Auth, Core y módulos responsive/accesibles |
| 11 QA/seguridad/producción | Pruebas, hardening y operación | Tests unitarios/API parciales; sin DB/E2E | Integración, seguridad, backups, monitoreo |

## Secuencia

1. Completar gate operacional de Fase 1 en MongoDB. No se avanzará a Master Data antes de confirmar migración e aislamiento.
2. Completar maestros y referencias antes de integrar procesos comerciales.
3. Endurecer inventario antes de conectarlo con compras/ventas.
4. Implementar documentos financieros y contabilidad a partir de decisiones de negocio aprobadas.
5. CRM/POS, RRHH, BI y frontend avanzan sobre contratos estables.
6. Cada fase necesita pruebas y documentación; el hardening de producción acompaña, no reemplaza los gates de cada dominio.

La Fase 1 se probó con typecheck/build y pruebas sin base de datos. No se conectó ni modificó MongoDB en esta sesión; los pasos operativos están en `PHASE1_MIGRATION.md`.
