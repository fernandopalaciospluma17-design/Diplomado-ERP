# Auditoría de avance ERP

## Alcance

Este documento complementa el handoff y mantiene un registro operativo de lo que ya está validado, lo que quedó pendiente y lo que se avanzó en esta sesión.

## Estado verificado

### Fase 8 — RRHH
- Se añadió un dominio tenant-aware de empleados y solicitudes de ausencia.
- Incluye modelos, índices, validadores, permisos, rutas de listado/alta/actualización y revisión de solicitudes.
- Se añadió asistencia por empleado y fecha, con entrada/salida, estados PRESENT/ABSENT/REMOTE, unicidad diaria y auditoría; el flujo quedó cubierto en la integración Mongo.
- Nómina, asistencia y reglas fiscales siguen fuera del alcance hasta definir país y política laboral.

### Fase 9 — Analytics / BI
- La API de resumen ya existe en `/api/v1/reports/summary`.
- El controlador ahora normaliza métricas vacías y centraliza la respuesta para evitar `undefined` o saldos inconsistentes.
- El payload devuelto es consistente para ventas, compras, gastos y pagos.
- Queda pendiente la reconciliación contra ledgers contables, rangos de fecha y exportación real.
- El resumen ahora acepta `from`, `to` y `branchId`, con fechas inclusivas y rechazo de sucursales fuera de la sesión.
- El payload ahora incluye `reconciliation`, con débitos/créditos y cantidad de asientos publicados del ledger dentro del mismo tenant, sucursal y rango de fechas.

### Fase 10 — Frontend
- La app Expo ya no es solo una pantalla de health.
- Añadió login real, sesión persistida en almacenamiento local y un panel operativo base con métricas del resumen analítico.
- Siguientes pasos: navegación modular, selección de empresa/sucursal, pantalla CRUD y permisos de UI.
- Se añadió navegación responsive para Resumen, Inventario, Ventas, Compras, RRHH y CRM con listas respaldadas por la API.
- Las llamadas autenticadas de dashboard y módulos limpian la sesión y solicitan nuevo login cuando reciben `401`.

### Fase 11 — Producción y hardening
- Hay validación básica de typecheck y pruebas unitarias.
- Falta integración con Mongo replica set, E2E, límites, seguridad, backups y runbooks.
- Se añadió readiness separado de liveness, validación de CORS/JWT en producción, redacción de contraseñas en logs, auditoría de dependencias y runbook operativo.
- Verificación actual: build y typecheck pasan; `npm audit` no reporta problemas en la raíz, pero backend mantiene 2 avisos moderados de Vitest y frontend 12 avisos transitivos del toolchain Expo. Las correcciones sugeridas implican upgrades mayores y quedan pendientes de una ventana de actualización.
- La auditoría de integración ampliada pasó en Mongo replica set: HR básico, inventario, compras, ventas, contabilidad y POS; el build y la suite completa deben mantenerse como gates antes de cada release.

## Auditoría operativa

### Verificado esta sesión
- Typecheck del frontend: OK.
- Prueba unitaria de resumen analítico de backend: OK.
- Documentación de handoff revisada y usada como criterio de continuidad.
- Auditoría completa: 15 archivos y 55 pruebas aprobadas con Mongo replica set habilitado.
- Auditoría reproducible: `npm.cmd run audit:closure` aprobada con 15 archivos y 56 pruebas; incluye typecheck, integración Mongo y build.
- RRHH ahora rechaza ausencias activas solapadas y los endpoints de empleados/asistencia tienen cobertura de autenticación negativa.
- El detalle de cierre por fase quedó registrado en `docs/CLOSURE_AUDIT_2026-09-24.md`.

### Riesgos actuales
- Las fases transaccionales siguen dependiendo de MongoDB replica set.
- Se añadió `backend/tests/integration/mongo-replica-set.test.ts` para comprobar commit/rollback. Tras iniciar Docker Desktop, el gate pasó contra un Mongo 8 desechable en el puerto 27018 usando `directConnection=true`; el contenedor previo en 27017 era standalone y se dejó intacto.
- Se añadió `backend/tests/integration/erp-workflows.test.ts`; el flujo integrado de inventario, compras, ventas, contabilidad y POS pasó en Mongo replica set, incluyendo idempotencia, reservas, traslado, recepción, pago, devolución, balance contable y cierre de caja.
- Se corrigió `getTrialBalance` para castear `companyId` y `branchId` en agregaciones, evitando balances vacíos cuando el tenant llegaba como texto.
- La lógica comercial no debe declararse cerrada sin pruebas de concurrencia y rollback.
- El frontend avanza, pero aún no reemplaza la validación del backend ni la autorización vertical/horizontal.

## Siguiente orden recomendado

1. Completar integración de Mongo replica set para Fase 1–7.
2. Ejecutar pruebas de inventario y flujo compras/ventas sobre base aislada.
3. Mejorar la capa BI con filtros por fechas y summaries reconciliables.
4. Continuar con navegación y módulos del frontend por dominio.
5. Añadir hardening de producción antes de cualquier despliegue.
