# Matriz RBAC — Fase 1

La autorizacion lee los permisos actuales del rol persistido en cada solicitud. Los roles pertenecen a una empresa; un rol solo puede delegar permisos que el actor posee. El catalogo de permisos es sembrado por el servidor y un administrador de empresa no puede crear permisos globales ni otras empresas. Cada ruta de negocio filtra por la empresa/sucursal del usuario. Los JWT antiguos sin sesion reciben `401 SESSION_REQUIRED` y el usuario debe iniciar sesion de nuevo.

| Recurso/accion | Anonimo | USER inicial | COMPANY_ADMIN |
|---|---:|---:|---:|
| Login / health publico | Si | Si | Si |
| Perfil / sesiones propias | No | Si | Si |
| Catalogo, inventario, ventas/pagos, compras y gastos: lectura | No | Si | Si |
| Mutaciones de esos dominios | No | No | Si |
| Usuarios, roles, permisos, configuracion, sucursales y auditoria | No | No | Si |
| Reporte summary | No | No | Si |

## Permisos sembrados

Usan el formato `module.resource.action`. El modelo permite CREATE, READ, UPDATE, DELETE, APPROVE, CANCEL y EXPORT; solo se siembran las acciones conectadas a las rutas actuales. El rol `USER` recibe lectura de catálogos, inventario, ventas/pagos, compras y gastos. El rol `COMPANY_ADMIN` inicial recibe las operaciones actuales del Core y negocio, excepto crear otras empresas. Puede asignar a nuevos roles solo permisos que él mismo posee.

## Reglas

1. Denegar por defecto y comprobar el permiso en backend.
2. Filtrar consultas y mutaciones por ámbito guardado en usuario/sesion, no por IDs enviados por el cliente.
3. Cambiar rol/permisos invalida su efecto inmediatamente porque se resuelven en cada petición.
4. Desactivar usuario, empresa o sucursal impide el uso de la sesión.
5. Revisar la matriz inicial por puesto antes de uso empresarial real.

La creación de tenants adicionales requiere aprovisionamiento de plataforma, que aún no tiene una identidad/endpoint administrativo global.
