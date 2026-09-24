# Roadmap ERP

El avance respeta el orden de fases solicitado. Estado actualizado al 2026-09-24.

| Fase | Alcance | Estado actual | Siguiente salida |
|---|---|---|---|
| 0 Auditoría/arquitectura | Baseline, GAP, contratos y riesgos | Documentada | Cerrada |
| 1 Core ERP | Empresa, sucursal, usuario, RBAC, configuración, auditoría, sesión | Implementada; smoke integration en Mongo desechable pasó | Aplicar con respaldo al entorno objetivo y verificar aislamiento multitenant |
| 2 Master Data | Clientes, proveedores, productos, categorías, marcas, unidades, impuestos, almacenes, medios de pago, precios | API tipada implementada; permisos/índices requieren aplicar el migrador; mapeo de catálogo legado pendiente | Importar metadata legado con relaciones revisadas; validar contratos con frontend |
| 3 Inventario | Balance, ubicaciones, transferencias, ajustes, conteos, reservas, lotes/series, mínimos/máximos/reorden | Saldos por ubicación enlazados a movimientos, compras, transferencias, reservas y conteos para productos sin lote/serie; falta trazabilidad por ubicación de lotes/series y verificación Mongo replica set | Completar bins para lotes/series; integración y concurrencia en replica set |
| 4 Compras | Solicitud/cotizacion/orden/recepcion/factura/AP/pago | Flujo implementado: aprobacion de ordenes, recepcion, facturas, pagos, devoluciones, notas de credito y conciliacion | Ejecutar gate de integracion/atomicidad/concurrencia en Mongo replica set |
| 5 Ventas | Cotización/pedido/venta/entrega/factura/pago/devolución | Cotizaciones/pedidos, entrega parcial con salida de stock, venta, snapshot de factura, pagos, devoluciones y estados implementados | Gate Mongo replica set; timbrado fiscal permanece pendiente |
| 6 Finanzas/contabilidad | Caja/banco, AR/AP, periodos, plan y diario | Plan de cuentas base, periodos no superpuestos, diario de doble partida idempotente y balance de comprobación | Auto-posteo de ventas/AP/gastos, reversas y conciliación de caja/bancos |
| 7 CRM/POS | Pipeline y ciclo de caja/ticket | CRM básico (leads, oportunidades y actividades) y POS básico (sesiones, ticket/venta/cobro, cierre y diferencia de efectivo) implementados; faltan conversión CRM y conciliación/reembolsos POS | Integración transaccional en Mongo replica set y completar el ciclo operativo |
| 8 RRHH | Empleado, estructura, asistencia, vacaciones, nómina | Faltante | Dominio desacoplado |
| 9 Analytics/BI | KPIs y reportes | Resumen simple | Métricas reconciliables y filtros |
| 10 Frontend multiplataforma | Web y mobile | Pantalla Expo de health | Auth, Core y módulos responsive/accesibles |
| 11 QA/seguridad/producción | Pruebas, hardening y operación | Tests unitarios/API parciales; sin DB/E2E | Integración, seguridad, backups, monitoreo |

## Secuencia

1. Completar gate operacional de Fase 1 en la base objetivo: respaldo, migración y aislamiento real. La instancia desechable solo validó el flujo inicial.
2. Completar maestros y referencias antes de integrar procesos comerciales.
3. Endurecer inventario antes de conectarlo con compras/ventas.
4. Implementar documentos financieros y contabilidad a partir de decisiones de negocio aprobadas.
5. CRM/POS, RRHH, BI y frontend avanzan sobre contratos estables.
6. Cada fase necesita pruebas y documentación; el hardening de producción acompaña, no reemplaza los gates de cada dominio.

La Fase 1 se validó con typecheck/build y pruebas, además de un smoke integration en un contenedor Mongo local desechable. La migración de una base real o compartida no se ha ejecutado.
