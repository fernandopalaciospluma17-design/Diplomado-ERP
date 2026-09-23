# Contrato API

Base: `/api/v1`. Respuestas: `{ success, message, data }`; errores: `{ success:false, message, error:{ code, details } }`. No hay especificacion OpenAPI. Login y health son publicos; el resto requiere JWT con sesion persistida. Los endpoints de negocio además requieren permiso y filtran por empresa/sucursal guardadas en el contexto autenticado.

## Rutas de negocio existentes

| Metodo y ruta | Permiso | Comportamiento |
|---|---|---|
| GET `/` | Publico | Identificacion API/version |
| GET `/health` | Publico | Health basico |
| GET `/health/protected` | Sesion valida | Prueba de auth, devuelve userId |
| POST `/auth/login` | Publico | Credenciales; crea sesion y access JWT |
| GET `/auth/me` | Sesion valida | Perfil actual |
| GET `/auth/users` | `platform.users.read` | Lista usuarios de empresa |
| POST `/auth/users` | `platform.users.create` | Crea usuario en empresa/sucursal del actor |
| GET `/catalogs/:kind` | `master-data.catalogs.read` | Lista catalogo (6 kinds) |
| POST `/catalogs/:kind` | `master-data.catalogs.create` | Alta catalogo |
| PATCH `/catalogs/:kind/:code` | `master-data.catalogs.update` | Actualiza catalogo |
| GET `/inventory/:productCode/:warehouseCode` | `inventory.stock.read` | Saldo; cero si no existe |
| GET `/inventory/:productCode/:warehouseCode/movements` | `inventory.stock.read` | Historial, ultimos 100 |
| POST `/inventory/movements` | `inventory.movement.create` | Aplica IN/OUT/ADJUSTMENT |
| GET `/sales` | `sales.sale.read` | Ultimas 100 ventas |
| POST `/sales` | `sales.sale.create` | Alta venta simple |
| GET `/sales/:saleNumber/payments` | `sales.payment.read` | Consulta pagos |
| POST `/sales/:saleNumber/payments` | `sales.payment.create` | Registra pago |
| GET `/purchases` | `purchases.purchase.read` | Ultimas 100 compras |
| POST `/purchases` | `purchases.purchase.create` | Alta compra simple |
| GET `/expenses` | `finance.expenses.read` | Lista gastos, actualmente limitada a 100 |
| POST `/expenses` | `finance.expenses.create` | Alta gasto |
| GET `/reports/summary` | `analytics.reports.read` | Totales agregados por tenant |

## Core ERP — Fase 1

| Metodo y ruta | Permiso | Comportamiento |
|---|---|---|
| GET `/core/companies` | `platform.companies.read` | Consulta empresa de la sesion |
| PATCH `/core/companies/:companyId` | `platform.companies.update` | Actualiza solo empresa propia |
| GET `/core/companies/:companyId/branches` | `platform.branches.read` | Lista sucursales propias |
| POST `/core/companies/:companyId/branches` | `platform.branches.create` | Crea sucursal propia |
| PATCH `/core/companies/:companyId/branches/:branchId` | `platform.branches.update` | Actualiza sucursal propia |
| GET `/core/permissions` | `platform.permissions.read` | Catalogo sembrado de permisos |
| GET `/core/roles` | `platform.roles.read` | Roles de empresa |
| POST `/core/roles` | `platform.roles.create` | Crea rol; solo delega permisos propios |
| PATCH `/core/roles/:roleId` | `platform.roles.update` | Actualiza rol de empresa |
| GET `/core/configuration` | `platform.configuration.read` | Configuracion de sucursal propia |
| PUT `/core/configuration/:key` | `platform.configuration.update` | Guarda clave/valor de sucursal |
| GET `/core/sessions` | Sesion propia | Sesiones activas del usuario |
| DELETE `/core/sessions` | Sesion propia | Revoca todas las sesiones del usuario |
| GET `/core/audit` | `platform.audit.read` | Ultimos 100 eventos de empresa/sucursal |

La empresa inicial y el administrador inicial se crean mediante `PHASE1_MIGRATION.md`. No hay API global para crear tenants adicionales ni para modificar el catalogo de permisos.

## Limites y compatibilidad

- Validacion Zod devuelve 422; errores conocidos usan 401/403/404/409. JSON limitado a 1 MB.
- Algunas listas carecen de filtros/paginacion; usuarios, catálogos y auditoria deben limitarse antes de crecer en volumen.
- Importes siguen siendo centavos enteros; moneda no esta expresada.
- No hay idempotency key ni contrato OpenAPI.
- JWT anteriores sin `sid` reciben 401 `SESSION_REQUIRED`; iniciar sesion de nuevo crea una sesion persistida.
- Se conservan las rutas de negocio, pero las peticiones autenticadas deben tener tenant activo.
- Fuera de Core faltan endpoints separados de clientes/proveedores, transferencias, recepcion, facturas, cancelaciones, devoluciones, cuentas, CRM, POS, RRHH y asientos contables.
