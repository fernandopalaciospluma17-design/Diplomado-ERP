# Auditoría del proyecto — Fase 0

Fecha de línea base: 2026-09-23. Alcance inicial: inspección estática de Git, archivos, dependencias, modelos, servicios, controladores, rutas, validadores, middleware, pruebas, configuración y documentación.

## 1. Resumen ejecutivo

El repositorio contiene un backend TypeScript/Express/Mongoose funcional en estructura por capas y un frontend mínimo Expo para Android/Web. La versión presente incluye autenticación JWT básica, usuarios, catálogos tipados, existencias y movimientos, compras, ventas, pagos, gastos, reportes y auditoría HTTP básica. No equivale todavía a un ERP multiempresa ni a los flujos comerciales integrados descritos en el objetivo.

La rama es `main`, alineada con `origin/main`; el último commit es `05b0990 (backend)`. El commit versionado contiene solo `backend/`; los archivos de raíz, `docs/` y `frontend/` aparecen sin seguimiento en Git. Deben preservarse y decidirse/versionarse conscientemente. `.env` está presente localmente e ignorado; sus valores no se inspeccionaron ni deben incorporarse al control de versiones.

Hallazgos de mayor prioridad: la actualización de inventario calcula desde una lectura previa y luego escribe, permitiendo carreras; balance y movimiento no se guardan en una transacción; la comprobación de pagos tampoco es atómica; compras no afectan inventario; ventas no descuentan inventario; JWT confía en el rol incluido en el token y el RBAC es un único `roleId` fijo; el reporte resume importes que no representan un estado financiero conciliado. La prueba es principalmente utilitaria y de barreras HTTP; no prueba persistencia ni reglas de negocio.

## 2. Git y evidencia

- Rama actual: `main`; upstream visible: `origin/main`.
- Historial visible: un commit, `05b0990 backend`.
- `git status`: sin cambios registrados en archivos rastreados; varios archivos de raíz, documentación y frontend están como no rastreados.
- El árbol del commit incluye únicamente `backend/` (incluye sus manifests, src y tests).
- `README.md` describe fases parciales y rutas implementadas, pero sus instrucciones de instalación y ejemplo de `.env` no corresponden completamente a los archivos visibles: el ejemplo está en `frontend/.env.example`, no existe `backend/.env.example` en el inventario.
- `docs/architecture/project-analysis.md` previo afirmaba que el workspace estaba vacío; esa afirmación es incorrecta y se reemplazó por esta auditoría.

## 3. Arquitectura actual

Monolito modular incipiente, con Express REST en `/api/v1`; separación convencional `routes → controllers → services → models`, validación Zod, MongoDB mediante Mongoose, middleware de autenticación/rol/auditoría y errores uniformes. Frontend Expo/React Native Web presenta una pantalla de estado que consume health. No hay `modules/` por dominio ni paquetes compartidos; no se recomienda migración masiva en esta fase.

Flujo de arranque: `server.ts` conecta Mongo antes de escuchar; `app.ts` compone Helmet, CORS, JSON, Pino HTTP, rate limit, routers y errores. La configuración Zod tiene valores por defecto, incluido un JWT secret de desarrollo. Mongo se configura con URI por entorno y valor local por defecto. Docker Compose define MongoDB local sin autenticación.

## 4. Inventario y matriz GAP

Estados: EXISTENTE, PARCIAL, FALTANTE, OBSOLETO, REQUIERE REFACTORIZACIÓN.

| Módulo/capacidad | Estado | Existe | Completo | Problema principal | Acción futura |
|---|---|---:|---:|---|---|
| Bootstrap/API/errores | PARCIAL | Sí | No | Configuración y política operativa mínimas | Endurecer al preparar despliegue |
| Auth/usuarios | PARCIAL | Sí | No | Login, perfil y CRUD limitado; sin sesión revocable/refresh/reset | Fase 1 |
| Empresas/sucursales | FALTANTE | No | No | Sin tenant ni ámbito de sucursal | Fase 1 |
| Roles/permisos RBAC | PARCIAL | Sí | No | Un `roleId`, autorización por rol fijo, no permisos granulares | Fase 1 |
| Configuración empresarial | FALTANTE | No | No | Sin settings por empresa/sucursal | Fase 1 |
| Auditoría | PARCIAL | Sí | No | Solo actor/acción/método/ruta/status; fire-and-forget y fallos ignorados | Fase 1 |
| Catálogos maestros | PARCIAL | Sí | No | Colección genérica; metadata libre; relaciones no validadas | Fase 2 |
| Inventario | PARCIAL | Sí | No | Stock race, escritura no atómica de balance/movimiento; sin transferencias/reservas/lotes | Fase 3 |
| Compras | PARCIAL | Sí | No | Solo documento simple; no recepción/pago/AP ni efecto en stock | Fase 4 |
| Ventas | PARCIAL | Sí | No | Venta simple sin inventario, factura, devolución ni descuentos/impuestos | Fase 5 |
| Pagos | PARCIAL | Sí | No | Solo asociado a venta; límite concurrente vulnerable | Fase 5 |
| Gastos | PARCIAL | Sí | No | Registro/listado básico, sin aprobación, pagos ni contabilidad | Fase 6 |
| Finanzas/contabilidad | FALTANTE | No | No | Reportes agregados no sustituyen ledger de partida doble | Fase 6 |
| CRM | FALTANTE | No | No | Sin leads/oportunidades/actividades | Fase 7 |
| POS | FALTANTE | No | No | Sin caja, sesión, ticket/cierre | Fase 7 |
| RRHH | FALTANTE | No | No | Sin empleados/nómina | Fase 8 |
| Analytics/BI | PARCIAL | Sí | No | Un resumen sin periodos/filtros ni definiciones financieras | Fase 9 |
| Frontend web/móvil | PARCIAL | Sí | No | Pantalla de health solamente, sin login ni módulos | Fase 10 |
| QA/producción | PARCIAL | Sí | No | Dos archivos de pruebas; sin pruebas DB/E2E/seguridad/concurrencia | Fase 11 |

No se clasifican componentes como OBSOLETOS con la evidencia actual.

## 5. API y seguridad

Las rutas implementadas se detallan en `API_CONTRACT.md`. Se usan envolturas JSON uniformes y validación en controladores, pero algunas colecciones no tienen límite ni paginación (usuarios, catálogos y gastos); otras están limitadas a 100 sin cursor/filtros. Acciones de escritura suelen requerir rol `ADMIN`; lecturas requieren token. No existe autorización por empresa, sucursal, propiedad del recurso o permiso granular.

Controles presentes: bcryptjs con 12 rondas, JWT con expiración configurable, Helmet, CORS de origen único, límite de cuerpo JSON 1 MB, rate limit global, Zod, Pino con redacción de authorization/cookie. Riesgos observables: secreto JWT de desarrollo por defecto permite arranque con clave conocida si se omite entorno; auditoría no incluye tenant/IP/snapshot y puede perder eventos; `requestId` está declarado pero no se genera aquí; CORS/rate limit no diferencian entornos/rutas; falta política de bloqueo/limitación específica para login. No se probó comportamiento dinámico.

## 6. Persistencia y reglas

Modelos Mongoose: User, Catalog, InventoryBalance, InventoryMovement, Sale, Payment, Purchase, Expense y Audit. Hay índices únicos para correo, código por tipo de catálogo, combinación producto/almacén y números de documentos; algunos índices de consulta por fecha/estado.

No hay Company/Branch ni `companyId` en documentos, por lo que los datos son globales. Se usan códigos de texto como referencias en vez de ObjectId; el backend no verifica que códigos referenciados existan/estén activos. Ventas y compras embeben líneas, decisión razonable para documentos de tamaño acotado, pero sus totales se calculan sin impuestos/descuentos y se aceptan cantidades monetarias en centavos. No se define moneda.

Riesgos de integridad: verificación duplicada previa a inserción no sustituye la gestión de colisión del índice único; pagos permiten suma por encima del total en solicitudes concurrentes; inventario puede sobrescribir saldo basado en lectura obsoleta y dejar movimiento discordante; `ADJUSTMENT` interpreta `quantity` como saldo absoluto, a diferencia de IN/OUT, sin definición clara. Si crear movimiento falla tras actualizar balance, queda saldo sin movimiento. Compra no incrementa existencias y venta no las disminuye.

## 7. Pruebas y límites de auditoría

`auth-utils.test.ts` cubre hash/compare de contraseña y firma/verificación JWT. `health.test.ts` cubre health, ausencia de autenticación, rechazo de rol no ADMIN y algunas entradas inválidas. No se hallaron pruebas de servicios/modelos con base aislada, integración CRUD, pagos/sumas, movimientos/invariantes, duplicados bajo concurrencia, auditoría, reportes, frontend, E2E ni seguridad de despliegue. Solo se inspeccionaron; no se ejecutaron.

## 8. Deuda técnica, riesgos y decisiones pendientes

1. Resolver primero atomicidad/concurrencia e invariantes antes de integrar inventario con compras/ventas.
2. Diseñar tenancy (empresa/sucursal) y aislamiento de datos antes de incorporar más datos reales.
3. Convertir roles fijos en permisos configurables y revisar claims/token revocation.
4. Definir catálogo real por dominio y referencias, identificadores y ciclo de vida documental.
5. Definir dinero: moneda, precisión, impuestos, redondeo, descuentos y estados de pago.
6. Reemplazar agregados llamados “finanzas” por cuentas, diario de doble partida y reconciliación antes de reportes financieros.
7. Manejar errores de índice único y garantizar idempotencia en escrituras repetibles.
8. Definir ambiente de tests con Mongo replica set para transacciones; Docker actual no especifica autenticación/replica set.
9. Revisar `.gitignore`, ejemplo de entorno, README y versionado del trabajo no rastreado.
10. Definir retención/privacidad de auditoría, copias de seguridad, observabilidad y despliegue.

Decisiones de negocio pendientes: moneda e impuestos, zona horaria, numeración, pagos a crédito, cancelaciones/devoluciones, reglas de stock por sucursal, periodos contables, alcance de administradores, roles y permisos, política de sesiones y recuperación de acceso.

## 9. Siguiente fase recomendada

Fase 1 — Core ERP: definir e implementar Company, Branch, pertenencia de usuario, roles/permisos y configuración con migración compatible. Antes de escribir, cerrar alcance de tenant y estrategia de transición de los datos globales existentes. La recomendación no autoriza empezar Fase 1; requiere autorización explícita conforme al prompt maestro.

## 10. Actualización tras implementar Fase 1

El usuario confirmó que todos los registros actuales pertenecen a una empresa inicial. Se implementaron modelos Company/Branch/Role/Permission/Configuration/Session, campos de tenant para documentos existentes, filtros de servicio por empresa/sucursal, permisos persistidos, sesiones revocables, auditoría contextual y middleware de request ID. La matriz y contrato actuales se describen en los documentos especializados de `docs/`.

El migrador está listo con dry-run por defecto y requiere `--apply` para escribir. No se ejecutó contra MongoDB en esta revisión. La Fase 1 está implementada en código, pero su gate operativo continúa pendiente: aplicar/verificar migración e índices, comprobar sesiones y aislamiento con datos reales. JWT anteriores sin `sid` se rechazan con `SESSION_REQUIRED`; después de migrar, los usuarios deben iniciar sesión de nuevo.

Validación local: typecheck de backend aprobado; build de backend aprobado; 22 pruebas Vitest aprobadas (unitarias, validators, RBAC y API sin base de datos). No se ejecutó test de integración Mongo ni frontend.

La recomendación de la sección 9 refleja el cierre original de Fase 0; quedó sustituida cuando el usuario autorizó continuar con Fase 1.
