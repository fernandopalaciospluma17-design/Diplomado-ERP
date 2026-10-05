# ERP multiplataforma

ERP en construccion por fases, con backend TypeScript/Express y cliente Expo para Android/Web. El frontend consume la API y no se conecta directamente a MongoDB.

## Estado

- Fase 0: auditoría y arquitectura documentadas.
- Fase 1: core multiempresa, roles y permisos implementados; la migración de la base objetivo aún requiere respaldo, aprobación y verificación.
- Fases 2–7: maestros, inventario, compras, ventas, contabilidad y POS/CRM implementados parcialmente y con gates de integración documentados; no están cerrados operacionalmente.
- Fase 8: empleados, ausencias y asistencia implementadas; nómina y reglas laborales pendientes.
- Fase 9: resumen analítico con filtros y señal de conciliación; KPIs y exportación ampliados pendientes.
- Fase 10: autenticación, dashboard y navegación modular; CRUD/E2E y selección de sucursal pendientes.
- Fase 11: gates de typecheck, pruebas, integración Mongo y build registrados; monitoreo, respaldos restaurables y validación E2E productiva pendientes.

La Fase 1 incorpora empresa/sucursal, roles y permisos persistidos, configuracion, auditoria contextual, sesiones revocables y filtros por tenant en los dominios actuales. Lee [`docs/PHASE1_MIGRATION.md`](docs/PHASE1_MIGRATION.md) antes de desplegarla.

## Requisitos y ejecucion

- Node.js/npm compatible con los manifests.
- MongoDB Atlas o MongoDB local como replica set para transacciones de inventario (`docker-compose.yml` configura `rs0`).
- Dependencias: `npm install --prefix backend` y `npm install --prefix frontend`.
- Backend: configura `MONGODB_URI` (en desarrollo usa Mongo local por defecto), `CORS_ORIGIN`, `LOG_LEVEL` y `JWT_SECRET`. `CORS_ORIGIN` acepta una lista separada por comas; incluye exactamente `https://diplomado-erp.fernandopalaciospluma17.workers.dev` en Render. En producción `JWT_SECRET` es obligatorio y requiere al menos 32 caracteres.
- Correo transaccional: el backend usa Resend para invitar usuarios y notificar cambios efectivos de permisos o estado de roles a las cuentas activas afectadas. Configura `RESEND_API_KEY`, `EMAIL_FROM` con un remitente de un dominio verificado, y `PUBLIC_APP_URL` con la URL pública HTTPS de la app. En Render, define estas variables en el servicio backend. `backend/.env.example` muestra la configuración local. Las cuentas nuevas quedan pendientes hasta que el usuario abre el enlace, establece su contraseña y confirma la cuenta; el enlace vence en 24 horas. Si vence, un administrador puede reenviarlo con `POST /api/v1/auth/users/:userId/resend-invitation`.
- Frontend Nodara: configura `EXPO_PUBLIC_API_URL` como origen del backend, sin `/api/v1` (por ejemplo, `https://diplomado-erp.onrender.com`) en Cloudflare antes del build. `frontend/.env.example` muestra el valor de desarrollo. El cliente incluye login persistente, shell responsive, navegación por permisos y dashboard; la administración de usuarios usa invitación por correo.

Comandos desde PowerShell:

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend start
npm.cmd --prefix frontend run typecheck
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

API: `http://localhost:3000/api/v1`; health check: `/api/v1/health` (readiness de Mongo: `/api/v1/health/ready`).

## Documentacion

- Auditoria/GAP: [`docs/PROJECT_ANALYSIS.md`](docs/PROJECT_ANALYSIS.md)
- Arquitectura: [`docs/ERP_ARCHITECTURE.md`](docs/ERP_ARCHITECTURE.md)
- Roadmap: [`docs/ERP_ROADMAP.md`](docs/ERP_ROADMAP.md)
- Migracion Core: [`docs/PHASE1_MIGRATION.md`](docs/PHASE1_MIGRATION.md)
- Datos maestros: [`docs/MASTER_DATA.md`](docs/MASTER_DATA.md)
- Inventario: [`docs/INVENTORY.md`](docs/INVENTORY.md)
- Compras: [`docs/PURCHASES.md`](docs/PURCHASES.md)
- Base de datos, API, RBAC, reglas, QA y trazabilidad: archivos bajo `docs/`.

No publiques `.env`, contraseñas, tokens ni URI de MongoDB.
