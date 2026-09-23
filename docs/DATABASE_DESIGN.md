# Diseño de base de datos — Fase 1

## Colecciones actuales

| Colección | Forma / referencias | Índices principales | Nota |
|---|---|---|---|
| Company | code, legalName, name, taxId?, status | code único; taxId sparse único | Empresa inicial se crea por migrador |
| Branch | companyId, code, name, address?, status | companyId+code único | Pertenece a Company |
| User | email, hash, companyId, branchId, roleId, status, lastLogin | email único; company/branch/status | Email globalmente único |
| Permission | code, module, resource, action | code único y módulo/recurso/acción único | Catálogo sembrado |
| Role | companyId, code, name, permissionIds, status | companyId+code único | Solo delega permisos del actor |
| Configuration | companyId, branchId?, key, value, updatedBy | companyId+branchId+key único | Configuración por tenant |
| Session | userId, companyId?, branchId?, expira/revoca, IP/agente | userId+fecha; TTL expiración | Sin refresh token todavía |
| Catalog | tenant, kind, code, name, descripción, status, metadata | company+kind+code único | Seis tipos, sigue siendo genérico |
| InventoryBalance | tenant, producto/almacén, cantidad | company+branch+product+warehouse único | Balance operativo |
| InventoryMovement | tenant, códigos, tipo, cantidad, antes/después, referencia, actor | tenant+códigos+fecha | Balance/movimiento aún no transaccionales |
| Sale / Purchase | tenant, número, referencias de código, líneas embebidas y totales | company+número único | Líneas limitadas a 100 |
| Payment | tenant, saleNumber, amountCents, método, referencia, actor | tenant+saleNumber+fecha | No idempotencia/conciliación |
| Expense | tenant, número, categoría, importe, fecha, actor | company+expenseNumber único | Sin ledger contable |
| Audit | tenant opcional, actor, acción, módulo/entidad, método/ruta/status, IP/requestId | company+actor/fecha; company+fecha | Snapshot before/after pendiente |

## Decisiones

- Ventas y compras embeben líneas mientras cada documento sea de tamaño razonable. Las referencias actuales por código deben evolucionar a IDs estables y snapshots documentales cuando se definan las reglas.
- Los documentos de negocio llevan `companyId`/`branchId`; controladores obtienen ese ámbito de la sesión persistida y servicios lo incluyen en cada consulta/escritura.
- La migración asigna los registros previos sin tenant a la empresa/sucursal inicial confirmada. Reemplaza los índices globales conocidos por índices compuestos. Ver `PHASE1_MIGRATION.md`.
- Los permisos son globales y sembrados; los roles están limitados por empresa. Configuración usa claves por empresa o sucursal.
- Sesiones guardan expiración/revocación e índice TTL. El access JWT dura según `JWT_EXPIRES_IN` (15 minutos por defecto); refresh token aún no existe.
- No se ejecutó migración real ni se comprobó una instancia Mongo en esta fase.

## Consistencia pendiente

Actualizar balance + movimiento, recepción + compra + stock y otras operaciones compuestas mediante transacción cuando corresponda; proteger concurrencia/idempotencia; traducir conflictos E11000 a 409; definir moneda, impuestos, redondeo, retención de snapshots, periodos y borrado lógico.
