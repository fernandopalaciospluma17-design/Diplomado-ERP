# Handoff de implementación ERP

Actualizado: 2026-10-05. Documento para continuar el repositorio sin asumir que una fase está operativamente cerrada solo porque su código exista.

## Resumen ejecutivo

El backend es un monolito modular TypeScript/Express/Mongoose con aislamiento por empresa y sucursal, permisos persistidos, maestros tipados y flujos de inventario, compras, ventas, contabilidad, CRM, POS y RRHH. El frontend Expo comparte el backend entre Web y Android; incluye login, dashboard y administración de usuarios por invitación con selección de roles. La suite local más reciente pasa 55 pruebas y omite 2 pruebas de integración porque no hay Mongo local configurado. El build web, el build TypeScript y la compilación Kotlin pasan. El health y readiness públicos respondieron correctamente y el readiness confirmó conexión Mongo, pero no se hicieron operaciones de escritura en producción ni se probó el flujo de invitación.

**Estado real:** las fases 0–9 tienen documentación e implementación parcial. Los gates históricos transaccionales están documentados en `CLOSURE_AUDIT_2026-09-24.md`; no equivalen a certificación de migración ni de producción. Las fases 10–11 siguen abiertas por E2E autenticado, operación, respaldos/restauración, monitoreo y vulnerabilidades transitivas del toolchain.

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
| 8 RRHH | Empleados, ausencias y asistencia | Nómina y reglas laborales/fiscales pendientes |
| 9 BI | Resumen con filtros y señal de conciliación | KPIs y exportaciones ampliadas pendientes |
| 10 Frontend/Android | Expo, autenticación, módulos por permisos, gestión de usuarios/invitaciones y almacenamiento seguro nativo | E2E autenticado, selector de sucursal y accesibilidad ampliada |
| 11 QA/operación | Typecheck, suite, build backend/web, compilación Kotlin, readiness y CORS productivos comprobados | Tests JVM Android (JDK 26 incompatible), E2E por rol, Resend real, respaldos/restauración, monitoreo y vulnerabilidades transitivas |

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

Empleados, solicitudes de ausencia y asistencia ya existen con auditoría. Nómina no debe calcularse sin definir país, moneda, reglas fiscales/laborales, periodo, redondeo, prestaciones y retenciones. Siguen pendientes departamentos/puestos completos, vacaciones avanzadas y reglas de privacidad por dato sensible.

### C. Fase 9 — Analytics/BI

Sustituir el resumen actual por reportes definidos y conciliables: ventas netas (devoluciones e impuestos), compras, inventario valorizado/coste, AR/AP, gastos y KPIs operativos. Definir zona horaria y fechas inclusivas, filtros tenant/sucursal, paginación/exportación, índices y límites. Reconciliar cada total con documentos/ledger contable y aplicar permisos `analytics.*`. No llamar estado financiero a una agregación que no se reconcilia.

### D. Fase 10 — Frontend

Web y Android ya comparten backend y muestran login/dashboard/módulos. La administración web consulta roles reales y crea usuarios con `name`, `email` y `roleId`; invitación, reenvío y confirmación usan el flujo existente. Faltan pruebas E2E, selector de sucursal y mayor cobertura de accesibilidad. La sesión Android usa almacenamiento cifrado y ambos clientes intentan revocar la sesión actual al cerrar sesión.

### E. Fase 11 — Producción y hardening

Completar tests de integración y concurrencia, E2E por rol, pruebas multiempresa, límites/paginación, revisión de autorización horizontal, escaneo de dependencias/secretos, JWT y CORS por entorno, manejo de datos personales, auditoría durable, logging redactado, health/readiness, backups/restores ensayados, migraciones repetibles, observabilidad, alertas, rate limits por operación, contenedor no-root y despliegue/rollback. Documentar runbooks y retención. Aún no hay evidencia de certificación de seguridad ni de operación en producción.

## Evidencia local y límites

- 2026-10-05: `npm.cmd run typecheck`, `npm.cmd test` (55 aprobadas, 2 omitidas), `npm.cmd run build`, `npm.cmd --prefix frontend run build:web` y compilación `:app:compileDebugKotlin` en copia aislada aprobaron. `:app:testDebugUnitTest` llegó a compilar Kotlin, pero se bloqueó en `jlink` de JDK 26; no hay JDK 17 instalado para repetirlo.
- Las dos pruebas omitidas requieren Mongo local; no se ejecutó el gate de escritura contra producción.
- En producción, health respondió 200, readiness respondió 200 con Mongo conectado y OPTIONS de login respondió 204 con el origen Cloudflare permitido. La página Cloudflare mostró login y su bundle contiene el origen HTTPS de Render.
- No se usó una cuenta real ni se intentó enviar invitaciones; las variables Resend no están definidas localmente. Confirmar su configuración y el dominio remitente verificado en Render/Resend.
- `npm audit` reporta dependencias vulnerables del toolchain Expo/React Native; resolverlas requiere actualizaciones mayores coordinadas y no se aplicó `--force`.
- Los gates históricos en Mongo replica set están registrados en `CLOSURE_AUDIT_2026-09-24.md`; no prueban datos ni operaciones de producción.
- No revisar ni publicar `.env`; confirmar `.gitignore` antes de `git add`.
- `ERP_ROADMAP.md` es el estado resumido; no interpretar “implementado” como “gate aprobado”. Actualizar QA y roadmap con evidencia reproducible al completar cada prueba.

## Rutas principales

- CRM: `/api/v1/crm/leads`, `/opportunities`, `/activities` (ver `crm.routes.ts`).
- POS: `/api/v1/pos/sessions`, `/sessions/:sessionNumber/close`, `/sessions/:sessionNumber/tickets`, `/tickets`; `POST /tickets` exige `Idempotency-Key`.
- Ventas: `/api/v1/sales`; workflows cotización/pedido/entrega/factura en las rutas de ventas.
- Compras: `/api/v1/purchases`; proceso ampliado en `purchase.routes.ts`.
- Inventario: `/api/v1/inventory`; transferencias, conteos, reservas y existencias detalladas.
- Contabilidad: `/api/v1/accounting`.
