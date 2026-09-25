# Runbook de operación y producción

## Checks antes de desplegar

1. Ejecutar `npm.cmd run typecheck`, `npm.cmd test` y `npm.cmd run build` desde la raíz.
	Para ejecutar el cierre técnico completo en Windows: `npm.cmd run audit:closure`.
2. Ejecutar `npm.cmd run audit:dependencies`; resolver vulnerabilidades de severidad alta o crítica y planificar las moderadas del toolchain antes de producción.
3. Configurar `NODE_ENV=production`, `JWT_SECRET` con al menos 32 caracteres, `CORS_ORIGIN` con el origen público real y `MONGODB_URI` con replica set o cluster compatible.
4. Ejecutar el migrador en dry-run; aplicar solo después de backup restaurable y aprobación operacional.

## Gate MongoDB

Con Docker Desktop activo y el servicio del repositorio levantado, configurar el URI solo en la sesión actual y ejecutar:

```powershell
docker compose up -d mongodb
$env:RUN_MONGO_INTEGRATION = '1'
$env:MONGODB_URI = 'mongodb://127.0.0.1:27017/erp?replicaSet=rs0'
npm.cmd --prefix backend run test:integration
```

El gate debe demostrar commit y rollback. Si el puerto `27017` ya está ocupado, usar un contenedor desechable en otro puerto y añadir `directConnection=true` al URI, por ejemplo `mongodb://127.0.0.1:27018/erp?replicaSet=rs0&directConnection=true`. Si Docker no está disponible, el resultado es un bloqueo de entorno, no una aprobación de las fases transaccionales.

## Health checks

- `GET /api/v1/health` verifica que el proceso responda.
- `GET /api/v1/health/ready` verifica que MongoDB esté conectado; usarlo como readiness probe.

## Datos y secretos

- Nunca registrar `MONGODB_URI`, JWT, contraseñas ni cookies.
- Mantener `.env` fuera de commits y bundles frontend.
- Ensayar backup y restore en una base desechable antes de una migración.

## Despliegue y rollback

1. Ejecutar migraciones en modo inspección y guardar el reporte de conteos.
2. Desplegar una versión y esperar readiness 200 antes de enviar tráfico.
3. Vigilar errores 5xx, latencia, conexiones Mongo y rate limits.
4. Ante regresión, detener escrituras si aplica, volver a la imagen anterior y restaurar datos solo con aprobación; no usar rollback destructivo automático.