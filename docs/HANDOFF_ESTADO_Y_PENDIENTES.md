# Handoff de implementación ERP

Actualizado: 2026-09-24. Documento para que otro agente continúe el repositorio sin asumir que una fase está operativamente cerrada solo porque su código exista.

## Resumen ejecutivo

El backend ha avanzado desde una API básica a un monolito modular TypeScript/Express/Mongoose con aislamiento por empresa y sucursal, permisos persistidos, maestros tipados y flujos de inventario, compras, ventas, contabilidad, CRM y POS. La Fase 1 tuvo un smoke integration previo en un Mongo local desechable. En esta entrega el backend pasa typecheck y la suite local es de 11 archivos y 46 pruebas. La conexión a Mongo Atlas del proyecto agotó tiempo de espera en intentos anteriores; no existe evidencia de que las nuevas transacciones comerciales funcionen en la base objetivo.

**Estado real:** las fases 0–7 tienen documentación y/o implementación sustancial. Ninguna de las fases 2–7 debe declararse operacionalmente cerrada hasta ejecutar sus gates en MongoDB replica set. Fases 8–11 continúan abiertas.

## Cómo retomar

1. Leer este documento, `ERP_ROADMAP.md`, `QA_STRATEGY.md` y los documentos de dominio enlazados en la tabla inferior.
2. Revisar `git status` y la rama antes de empezar; esta entrega reúne cambios de varias fases.
3. Instalar dependencias según `backend/package.json` y ejecutar desde raíz:

   ```powershell
   npm.cmd run typecheck
   npm.cmd test
   npm.cmd run build
   ```

4. Para reproducir la prueba unitaria directamente en backend: `npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`.
5. Para integración transaccional, preparar un MongoDB aislado configurado como replica set (por ejemplo, Docker Compose del repositorio); usar una base desechable y revisar `MONGODB_URI` efectiva del proceso. El backend carga `dotenv/config` respecto al directorio de ejecución: desde `backend`, el `.env` ubicado en la raíz no se descubre automáticamente; cargar explícitamente `DOTENV_CONFIG_PATH=../.env` o exportar variables de entorno. Nunca copiar el URI/secreto a logs, commits o este handoff.
6. El migrador `migrate:single-company` hace dry-run sin `--apply`; la aplicación sobre cualquier base debe ir precedida por backup probado y aprobación operacional. Ver `PHASE1_MIGRATION.md`.

## Componentes implementados y documentos

| Fase | Implementación actual | Referencias |
|---|---|---|
| 0 Arquitectura | Auditoría, baseline, decisiones y roadmap | `PROJECT_ANALYSIS.md`, `ERP_ARCHITECTURE.md`, `architecture/technical-decisions.md` |
| 1 Core/multiempresa | Empresas, sucursales, usuarios/roles/permisos, sesiones revocables, configuración, auditoría, filtros tenant y migrador de datos legados a empresa inicial | `PHASE1_MIGRATION.md`, `RBAC_MATRIX.md`, `API_CONTRACT.md` |
| 2 Maestros | APIs tipadas por tipo de catálogo, validación/referencias/permisos e índices | `MASTER_DATA.md`; falta validar mapeo de metadata legado/importación |
| 3 Inventario | Balance y ledger, idempotencia/transacciones, movimientos, transferencias, ajustes/conteos, reservas, lotes/series, ubicaciones para productos sin lote/serie, mínimos/máximos/reorden | `INVENTORY.md`; falta ubicación para lotes/series y gate transaccional real |
| 4 Compras | Solicitudes/cotizaciones/adjudicación, aprobación de órdenes, recepciones, factura/AP, pagos, devoluciones/créditos, aplicación de crédito y conciliación | `PURCHASES.md`; falta gate Mongo/atomicidad/concurrencia |
| 5 Ventas | Cotización/pedido, entrega parcial con salida de inventario, venta, factura snapshot, pagos, devolución/reembolso y estados | `SALES.md`; falta gate Mongo; timbrado fiscal no implementado |
| 6 Contabilidad | Plan de cuentas base, periodos sin solape/cierre, asientos balanceados idempotentes y balance de comprobación | `ACCOUNTING.md`; falta auto-posteo de eventos comerciales, reversas y caja/bancos |
| 7 CRM/POS | Leads/oportunidades/actividades; sesiones de caja, tickets que crean venta/stock/pago en una transacción, conteo/cierre de efectivo | `CRM_POS.md`; falta probar en replica set y completar conversiones/reembolsos |
| 8 RRHH | Sin módulo | Pendiente |
| 9 BI | Reporte summary sencillo | Pendiente de KPIs/periodos/filtros reconciliables |
| 10 Frontend | App Expo mínima, pantalla de health | Pendiente de login y módulos web/mobile |
| 11 QA/operación | Pruebas unitarias/API parciales, rate limit, Helmet, validadores | Sin integración de las nuevas fases, E2E, escaneo de seguridad ni runbooks de producción |

## Pendientes en orden recomendado

### A. Gates prioritarios para Fases 1–7

1. **Resolver acceso a MongoDB de prueba.** El último URI de Atlas en `.env` agotó el tiempo de conexión en las pruebas previas. Diagnosticar reachability, allowlist IP, DNS SRV, TLS y credenciales de forma que no se imprima el URI. Alternativa: levantar replica set local desechable con `docker-compose.yml`/`init-mongo-rs.js`.
2. **Añadir un runner/configuración de integración Mongo** y pruebas de servicios/modelos, no solo de validadores. Limpiar base aislada antes/después y evitar ejecutar escenarios destructivos en la base real.
3. **Migración de Fase 1:** revisar dry-run, índices antiguos/nuevos, conteos de documentos sin tenant y relaciones; no usar `--apply` sobre datos objetivo hasta contar con backup restaurable y autorización operacional. Comprobar aislamiento entre empresas/sucursales y revocación de sesiones.
4. **Fase 2:** mapear `Catalog.metadata` heredado hacia colecciones tipadas; producir reporte de registros no convertibles; comprobar relaciones, unicidad por tenant, desactivaciones, permisos por tipo, filtros/paginación.
5. **Fase 3:** completar bins/ubicaciones para lotes y series. Probar rollback conjunto saldo agregado/detalle/movimiento/reserva en movimientos, recepción, transferencia y conteo; concurrencia de salidas/reservas; idempotencia; precisión y reorden.
6. **Fase 4:** probar adjudicación atómica, aprobación/rechazo, recepciones parciales, facturación solo de cantidades recibidas, pagos concurrentes, devoluciones/créditos y conciliación; probar referencias entre tenant y errores/rollback.
7. **Fase 5:** probar cotización convertida una vez, pedidos, entregas parciales, stock/lote/serie, pagos concurrentes, estados de factura, devolución/reembolso e idempotencia. Definir requerimientos fiscales y timbrado antes de declarar factura fiscal.
8. **Fase 6:** probar cierres concurrentes de periodo, posteo por periodo, débitos/créditos, idempotencia, origen único y balance de comprobación. Diseñar auto-posteo/reversas y conciliación de caja/banco antes de usarlo como libro financiero.
9. **Fase 7:** probar una terminal con sesión única bajo concurrencia, apertura/ticket/cierre, cálculo y diferencia de caja, transacción stock + venta + pago + ticket, idempotencia y fallos parciales. Implementar asociación/reembolso de devoluciones POS. Conversión Lead/Oportunidad a cliente/pedido/venta requiere política de deduplicación y contrato.

### B. Fase 8 — RRHH

Diseñar antes de implementar: empleado/persona, vínculo con usuario opcional, departamentos/puestos y vigencias, datos personales mínimos, permisos sensibles, asistencia/calendarios/zona horaria, vacaciones/ausencias con aprobación y auditoría. Nómina no debe calcularse sin definir país, moneda, reglas fiscales/laborales, periodo, redondeo, prestaciones y retenciones. Separar los datos sensibles con permisos específicos; añadir integración y controles de privacidad. No hay endpoints/modelos actuales de RRHH.

### C. Fase 9 — Analytics/BI

Sustituir el resumen actual por reportes definidos y conciliables: ventas netas (devoluciones e impuestos), compras, inventario valorizado/coste, AR/AP, gastos y KPIs operativos. Definir zona horaria y fechas inclusivas, filtros tenant/sucursal, paginación/exportación, índices y límites. Reconciliar cada total con documentos/ledger contable y aplicar permisos `analytics.*`. No llamar estado financiero a una agregación que no se reconcilia.

### D. Fase 10 — Frontend

La app Expo actual solo verifica health. Implementar navegación y sesión/login/logout, selección de empresa/sucursal disponible al usuario, manejo de expiración 401 y errores API, cliente HTTP tipado, accesibilidad y diseño adaptable Web/Android/iOS. Después priorizar pantallas Core/maestros, inventario, compras, ventas, CRM/POS y reportes con permisos en UI además de validación obligatoria del backend. Añadir pruebas de componentes y flujos E2E, evitar secretos en bundle.

### E. Fase 11 — Producción y hardening

Completar tests de integración y concurrencia, E2E por rol, pruebas multiempresa, límites/paginación, revisión de autorización horizontal, escaneo de dependencias/secretos, JWT y CORS por entorno, manejo de datos personales, auditoría durable, logging redactado, health/readiness, backups/restores ensayados, migraciones repetibles, observabilidad, alertas, rate limits por operación, contenedor no-root y despliegue/rollback. Documentar runbooks y retención. Aún no hay evidencia de certificación de seguridad ni de operación en producción.

## Evidencia local y límites

- Comprobado en esta continuación: `npm.cmd run typecheck` y `npm.cmd test` aprobaron antes de añadir las dos pruebas POS; volver a ejecutar después de este commit. Suite observada entonces: 10 archivos / 44 pruebas; se añadieron 2 pruebas de validadores POS (esperado 11 / 46).
- Build debe volver a ejecutarse como verificación antes del release.
- El resultado de pruebas locales no demuestra que Mongo acepte transacciones; los servicios usan `withTransaction` y requieren replica set o cluster compatible.
- No revisar ni publicar `.env`; confirmar `.gitignore` antes de `git add`.
- `ERP_ROADMAP.md` es el estado resumido; no interpretar “implementado” como “gate aprobado”. Actualizar QA y roadmap con evidencia reproducible al completar cada prueba.

## Rutas principales

- CRM: `/api/v1/crm/leads`, `/opportunities`, `/activities` (ver `crm.routes.ts`).
- POS: `/api/v1/pos/sessions`, `/sessions/:sessionNumber/close`, `/sessions/:sessionNumber/tickets`, `/tickets`; `POST /tickets` exige `Idempotency-Key`.
- Ventas: `/api/v1/sales`; workflows cotización/pedido/entrega/factura en las rutas de ventas.
- Compras: `/api/v1/purchases`; proceso ampliado en `purchase.routes.ts`.
- Inventario: `/api/v1/inventory`; transferencias, conteos, reservas y existencias detalladas.
- Contabilidad: `/api/v1/accounting`.
