# Matriz de trazabilidad

| Requisito | Artefacto | Estado tras Fase 1 | Pendiente |
|---|---|---|---|
| API versionada y errores uniformes | app/routers/controllers | Parcial | OpenAPI, paginación y pruebas API autenticadas |
| Password/JWT y login | User, auth service, JWT utils | Parcial | Refresh token y recuperación de acceso |
| Sesiones persistidas/revocables | Session, requireAuth, `/core/sessions` | Implementado en código | Integración Mongo real y política de renovación |
| Empresa/sucursal | Company, Branch, tenant fields, migrador | Implementado en código | Aplicar migración y validar aislamiento en Mongo |
| RBAC por permisos | Permission, Role, middleware, rutas | Implementado en código | Aprobar matriz por puesto; pruebas de persistencia |
| Configuración empresarial | Configuration, `/core/configuration` | Implementado en código | Definir claves de negocio |
| Auditoría | Audit model/middleware, `/core/audit` | Parcial | before/after, escritura confiable y retención |
| Catálogos | Catalog service con tenant filters | Parcial | Atributos y relaciones específicas |
| Datos maestros tipados | `/master-data/:kind`, modelos y permisos específicos | Implementado en código | Migrar y revisar metadata legado; pruebas de integración por entidad |
| Inventario | Balance/movement con tenant scope | Parcial | Atomicidad/concurrencia, transferencias/reservas |
| Compras/ventas/pagos/gastos | Servicios con tenant scope | Parcial | Flujos de fase, conciliación y pruebas con DB |
| Reporte summary | Agregaciones por tenant | Parcial | Definiciones de KPI/contabilidad |
| Frontend | Expo App | Parcial | Auth, Core y módulos de negocio |
| CRM/POS/HR/contabilidad | — | Faltante | Fases posteriores |

Actualizar esta matriz con endpoints y casos de prueba al cerrar el gate de migración e integración de Fase 1.
