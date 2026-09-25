# Auditoría y primera entrega frontend Nodara

## Estado real auditado

- El cliente existente es Expo + React Native Web en `frontend/`; no hay una aplicación web independiente.
- La versión anterior concentraba login, salud, resumen y listados en `App.tsx`.
- El backend existente expone `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `GET /api/v1/health`, `GET /api/v1/reports/summary` y módulos protegidos por permisos.
- `/auth/me` devuelve usuario, rol, empresa y sucursal, pero no devuelve el catálogo de permisos; la UI no puede inventar un RBAC local. El backend sigue siendo la autoridad.
- El repositorio no contiene un logo o archivo de marca Nodara identificable. Se usa un wordmark textual y un monograma `N` provisional, no un logo oficial.

## Primera entrega implementada

- Sistema de diseño centralizado en `frontend/src/design/tokens.ts` con la paleta Nodara: firma, tinta, pizarra, musgo, niebla y papel.
- Cliente REST común en `frontend/src/lib/api.ts`, con envoltura de errores y almacenamiento multiplataforma mediante AsyncStorage.
- Login conectado al backend y restauración de sesión en Web, Android e iOS.
- Sidebar responsive con Resumen, Inventario, Ventas, Compras, Finanzas, CRM, RRHH y POS.
- Header con búsqueda visual, estado de API, actualización y perfil/salida.
- Dashboard con KPI reales de ventas, compras, gastos y pagos.
- Estados de carga, vacío y error; la expiración `401` limpia la sesión y devuelve al login.
- Listados de módulos consumen endpoints existentes; no se inventan registros de negocio.

## Contratos consumidos

| Uso | Endpoint | Fuente |
|---|---|---|
| Salud | `GET /api/v1/health` | `health.routes.ts` |
| Login | `POST /api/v1/auth/login` | `auth.routes.ts` |
| Sesión | `GET /api/v1/auth/me` | `auth.routes.ts` |
| KPI | `GET /api/v1/reports/summary` | `report.routes.ts` |
| Productos | `GET /api/v1/master-data/products?page=1&limit=8` | `master-data.routes.ts` |
| Ventas | `GET /api/v1/sales` | `sale.routes.ts` |
| Compras | `GET /api/v1/purchases` | `purchase.routes.ts` |
| Finanzas | `GET /api/v1/accounting/trial-balance` | `accounting.routes.ts` |
| CRM | `GET /api/v1/crm/leads` | `crm.routes.ts` |
| RRHH | `GET /api/v1/hr/employees` | `hr.routes.ts` |
| POS | `GET /api/v1/pos/sessions` | `pos.routes.ts` |

## Validación

- `npm.cmd --prefix frontend run typecheck`: aprobado.
- `npx expo export --platform web --output-dir .expo/nodara-web-check`: aprobado; Metro generó el bundle Web real.
- La suite backend y el `audit:closure` ya pasan antes de esta entrega visual; deben repetirse si se modifica el contrato API.

## Pendiente para completar el dashboard

- Devolver permisos efectivos en `/auth/me` o publicar un endpoint de capacidades para menú dinámico por RBAC.
- Selector de empresa/sucursal cuando el backend permita más de un ámbito por usuario.
- CRUD real por módulo, formularios Zod compartidos, tablas con paginación y acciones protegidas.
- Gráficas basadas en endpoints BI definidos, actividad reciente real y notificaciones persistentes.
- Pruebas E2E Web/Android/iOS y verificación visual en dispositivos.
- Incorporar el asset oficial de marca cuando esté disponible; no se creó uno durante esta entrega.