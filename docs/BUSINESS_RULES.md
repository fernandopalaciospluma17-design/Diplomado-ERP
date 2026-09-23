# Reglas de negocio

## Core Fase 1

- Cada usuario activo pertenece a una empresa y sucursal activa y referencia un rol activo de su empresa.
- El usuario y su rol deben estar activos; sesiones persistidas deben existir, no estar revocadas y no haber expirado.
- La empresa y sucursal se resuelven desde el usuario/sesion almacenado; los IDs de tenant del body no se admiten como autoridad.
- Los permisos actuales se leen del rol persistido en cada llamada, por lo que los cambios se aplican de inmediato.
- Un rol solo puede delegar permisos que el actor tiene; el catalogo de permisos es sembrado, no editable por el administrador del tenant.
- Cambiar empresa/sucursal asignada, desactivar usuario/empresa/sucursal o revocar la sesion invalida el acceso.
- Los registros actuales sin tenant se asignan a la empresa/sucursal inicial aprobada mediante el migrador de `PHASE1_MIGRATION.md`.
- El administrador de empresa puede configurar su tenant inicial, pero no crear otras empresas. El alta de tenants requiere aprovisionamiento de plataforma pendiente.

## Reglas preexistentes conservadas

- Usuario tiene estado ACTIVE/INACTIVE; las contrasenas se guardan con hash.
- Codigo de catalogo es unico en el ambito de empresa/tipo.
- El saldo no puede ser negativo en salida; IN suma, OUT resta, ADJUSTMENT establece el saldo indicado. Esta semantica sigue pendiente de refinamiento en inventario.
- Ventas/compras embeben lineas y calculan importes enteros en centavos; subtotal y total coinciden mientras no existan impuestos/descuentos.
- Los pagos no deben superar el total segun la comprobacion actual, que aún requiere resolver carreras concurrentes.

## Decisiones pendientes

Moneda e impuestos, zona horaria, numeración documental, crédito, cancelaciones/devoluciones, reglas de stock por sucursal, periodos contables, sesiones/renovación y retención de auditoría.
