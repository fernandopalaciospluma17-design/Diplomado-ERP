# Finanzas y contabilidad — Fase 6

## Alcance disponible

- Plan de cuentas por empresa con códigos, nombre, tipo, saldo normal, cuenta padre y control de cuentas contabilizables. El migrador siembra cuentas iniciales de caja, bancos, clientes, inventario, proveedores, impuestos, capital, ventas, devoluciones, costo y gastos; no cambia cuentas existentes.
- Periodos contables por empresa, sin rangos superpuestos. Solo periodos `OPEN` aceptan asientos dentro de sus fechas. El cierre registra actor, fecha y motivo, y compite transaccionalmente con la contabilización.
- Asientos de diario por sucursal con al menos dos líneas; cada línea afecta débito o crédito, nunca ambos; suma de débitos debe igualar créditos. Las referencias de origen son únicas para evitar contabilizar dos veces el mismo documento.
- `GET /api/v1/accounting/trial-balance` agrega débitos y créditos contabilizados por cuenta, calcula saldos según su naturaleza y devuelve si cuadra.

Las altas del diario se contabilizan directamente (no hay borradores ni edición/borrado posterior). Se requiere `Idempotency-Key`; las entradas guardan actor y timestamp y son inmutables desde la API. La transacción necesita MongoDB replica set.

## Pendiente de Fase 6

Los pagos, facturas y gastos de fases anteriores aún no generan asientos automáticamente; el diario puede capturar asientos manuales con referencia para evitar duplicados. También quedan conciliación de bancos/caja, AR/AP automatizados, reversas con asiento de contrapartida y reportes financieros por periodo. Las tasas impositivas y reglas fiscales requieren configuración contable validada para el país antes de automatizar posteos.
