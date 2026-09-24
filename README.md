# ERP multiplataforma

ERP en construccion por fases, con backend TypeScript/Express y cliente Expo para Android/Web. El frontend consume la API y no se conecta directamente a MongoDB.

## Estado

- Fase 0: auditoria y diseño documentados.
- Fase 1: Core ERP y prueba local desechable de MongoDB completados; la migracion del entorno real/desarrollo aun requiere respaldo y revision.
- Fase 2: API de datos maestros tipados implementada; revisar `docs/MASTER_DATA.md`.
- Fase 3: stock trazable, transferencias, ajustes, conteos, reservas y umbrales min/max/reorden implementados; falta WarehouseLocation y la validación en Mongo replica set.
- Fase 4: ordenes y recepciones parciales/totales conectadas transaccionalmente a inventario; facturas y cuentas por pagar pendientes.
- Fases 5–11 siguen pendientes.

La Fase 1 incorpora empresa/sucursal, roles y permisos persistidos, configuracion, auditoria contextual, sesiones revocables y filtros por tenant en los dominios actuales. Lee [`docs/PHASE1_MIGRATION.md`](docs/PHASE1_MIGRATION.md) antes de desplegarla.

## Requisitos y ejecucion

- Node.js/npm compatible con los manifests.
- MongoDB Atlas o MongoDB local como replica set para transacciones de inventario (`docker-compose.yml` configura `rs0`).
- Dependencias: `npm install --prefix backend` y `npm install --prefix frontend`.
- Backend: configura `MONGODB_URI` (en desarrollo usa Mongo local por defecto), `CORS_ORIGIN`, `LOG_LEVEL` y `JWT_SECRET`. En produccion `JWT_SECRET` es obligatorio y requiere al menos 32 caracteres.
- Frontend: `EXPO_PUBLIC_API_URL` se configura desde Expo; `frontend/.env.example` tiene un ejemplo de desarrollo.

Comandos desde PowerShell:

```powershell
npm.cmd --prefix backend run dev
npm.cmd --prefix frontend start
npm.cmd --prefix backend run typecheck
npm.cmd --prefix backend test
npm.cmd --prefix backend run build
```

API: `http://localhost:3000/api/v1`; health check: `/health`.

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
