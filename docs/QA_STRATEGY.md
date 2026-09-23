# Estrategia QA

## Evidencia de Fase 1

Cuatro archivos Vitest: utilidades de contraseña/JWT, health/API, validadores Core y middleware RBAC. Se ejecutaron 22 pruebas y pasaron. Typecheck y build del backend también pasaron. No hay fixtures de MongoDB de integración; no se probó sesión, tenant ni migración contra una base real. No se halló E2E ni pruebas frontend.

## Capas objetivo

1. Unitarias: validadores, cálculos y reglas puras.
2. Integración: servicios/modelos sobre MongoDB aislado y transacciones disponibles.
3. API: contrato, sesión, permisos y códigos/status.
4. Concurrencia: stock, pagos, identificadores y estados.
5. E2E: flujos por rol en backend y web/móvil.
6. Seguridad: aislamiento multiempresa, autorización horizontal, abuso de login, configuración y auditoría.
7. Regresión: compatibilidad API y datos previos por fase.

## Gate de Fase 1 pendiente

- Ejecutar dry-run y migración con backup en la instancia acordada.
- Verificar asignación de empresa/sucursal, índices y unicidad.
- Probar login, revocación de sesión, permisos cambiados y aislamiento entre ámbitos en MongoDB.
- Revisar rutas con sesión válida y comportamiento de usuarios/roles desactivados.

Los fallos restantes de QA de inventario/pagos concurrentes pertenecen a la deuda anotada para las fases funcionales; no fueron cambiados en esta fase.
