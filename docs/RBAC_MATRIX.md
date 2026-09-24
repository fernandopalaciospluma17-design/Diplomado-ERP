# Matriz RBAC — Fase 1

La autorizacion lee los permisos actuales del rol persistido en cada solicitud. Los roles pertenecen a una empresa; un rol solo puede delegar permisos que el actor posee. El catalogo de permisos es sembrado por el servidor y un administrador de empresa no puede crear permisos globales ni otras empresas. Cada ruta de negocio filtra por la empresa/sucursal del usuario. Los JWT antiguos sin sesion reciben `401 SESSION_REQUIRED` y el usuario debe iniciar sesion de nuevo.

| Recurso/accion | Anonimo | USER inicial | COMPANY_ADMIN |
|---|---:|---:|---:|
| Login / health publico | Si | Si | Si |
| Perfil / sesiones propias | No | Si | Si |
| Maestros tipados, inventario, ventas/pagos, compras y gastos: lectura | No | Si | Si |
| Movimientos, transferencias, conteos y reservas | No | No | Si |
| Mutaciones de maestros, ventas/pagos, compras y gastos | No | No | Si |
| Usuarios, roles, permisos, configuracion, sucursales y auditoria | No | No | Si |
| Reporte summary | No | No | Si |

## Permisos sembrados

Usan el formato `module.resource.action`. El modelo permite CREATE, READ, UPDATE, DELETE, APPROVE, CANCEL y EXPORT; solo se siembran las acciones conectadas a las rutas actuales. El rol `USER` recibe lectura de los diez recursos de datos maestros, inventario, ventas/pagos, compras y gastos. Para cada recurso maestro se siembran permisos individuales `master-data.<kind>.read/create/update`; el middleware verifica el permiso específico del `kind` solicitado. El rol `COMPANY_ADMIN` recibe estas acciones al correr o repetir la migración de Fase 1. Puede asignar a nuevos roles solo permisos que él mismo posee.

Compras añade `purchases.request.read/create`, `purchases.quote.read/create/approve`, `purchases.purchase.read/create/approve/cancel`, `purchases.receipt.read/create`, `purchases.invoice.read/create`, `purchases.payable.read`, `purchases.payment.read/create`, `purchases.return.read/create`, `purchases.credit.read/approve` y `purchases.reconciliation.read`. `USER` recibe solo permisos de lectura; las mutaciones y aprobaciones corresponden al administrador o a roles configurados por la empresa.

Ventas incluye `sales.sale.read/create`, `sales.payment.read/create`, `sales.return.read/create`, `sales.quote.read/create`, `sales.order.read/create`, `sales.delivery.read/create` y `sales.invoice.read/create`. El rol `USER` recibe lectura; crear documentos, aceptar pagos y registrar devoluciones son mutaciones configurables por rol.

Contabilidad añade `finance.account.read/create`, `finance.period.read/create/approve`, `finance.journal.read/create` y `finance.report.read`. La aprobación de periodo corresponde al cierre; la contabilización requiere permiso de creación.

## Reglas

1. Denegar por defecto y comprobar el permiso en backend.
2. Filtrar consultas y mutaciones por ámbito guardado en usuario/sesion, no por IDs enviados por el cliente.
3. Cambiar rol/permisos invalida su efecto inmediatamente porque se resuelven en cada petición.
4. Desactivar usuario, empresa o sucursal impide el uso de la sesión.
5. Revisar la matriz inicial por puesto antes de uso empresarial real.

La creación de tenants adicionales requiere aprovisionamiento de plataforma, que aún no tiene una identidad/endpoint administrativo global.
