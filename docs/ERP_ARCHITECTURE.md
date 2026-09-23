# Arquitectura objetivo ERP

## Principios

- Monolito modular con una aplicación Express y fronteras por dominio; no microservicios en el horizonte inicial.
- Mantener la estructura actual por capas mientras se refuerza; mover dominio por dominio solo con motivo y compatibilidad definidos.
- Backend como autoridad para autorización y reglas; frontend consume exclusivamente REST versionada.
- MongoDB/Mongoose con modelos diseñados según cardinalidad y patrones de lectura/escritura; transacciones solo donde se requiera atomicidad multi-documento.
- Aislamiento por empresa y sucursal desde el Core antes de ampliar datos empresariales.

## Estado actual

Backend Express/TypeScript con rutas, controladores, servicios, modelos, validadores, middleware y utilidades. La Fase 1 añade empresa/sucursal, roles y permisos persistidos, configuración, sesiones revocables y datos de tenant en colecciones existentes. Frontend Expo tiene una pantalla de estado. El Git rastrea solo backend en el commit actual; los archivos raíz/docs/frontend siguen sin seguimiento. No existe todavía separación física por módulos ni paquetes compartidos.

## Forma objetivo progresiva

```text
apps/web + apps/mobile (evolución posterior desde frontend Expo)
                  │ REST /api/v1
backend: Platform | Master Data | Inventory | Sales | Purchases
         Finance | Accounting | CRM | POS | HR | Analytics
                  │ servicios/repositorios Mongoose
               MongoDB
```

Organización conceptual futura: `backend/src/modules/<domain>/{model,types,validator,service,controller,routes}` donde el dominio lo justifique. Reutilizar piezas actuales; no trasladar todo de golpe. Los contratos compartidos pueden extraerse a paquetes solo cuando haya consumidores y necesidad verificable.

## Límites y responsabilidades

- Routes componen autenticación, permisos y handlers.
- Controllers traducen HTTP, validan entradas de transporte y mapean errores a códigos/status.
- Services implementan casos de uso, transacciones, idempotencia y reglas de negocio.
- Models definen persistencia, índices y restricciones locales; no sustituyen validación de casos de uso.
- Platform administra empresa/sucursal, usuarios, permisos, sesiones, configuración y auditoría.
- Dominios referencian maestros mediante IDs estables y guardan snapshots únicamente cuando el historial documental lo requiera y se documente.

## Tenancy y autorización

Toda petición de negocio debe tener identidad y ámbito explícitos (`companyId`, y `branchId` cuando aplique). Consultas y escrituras filtran por ámbito en el servidor; nunca confiar en un `companyId` del cliente sin verificar pertenencia. El RBAC futuro expresa permisos por módulo/recurso/acción con alcance; el `ADMIN` actual es una transición temporal, no una base para ampliar rutas.

La Fase 1 fija el ámbito de la sesión desde el usuario persistido. `requireAuth` valida sesión, usuario, empresa, sucursal y estado actual del rol en cada solicitud; permisos se leen del rol persistido. Los servicios actuales de catálogos, inventario, ventas, pagos, compras, gastos y reportes filtran por empresa/sucursal. Las nuevas empresas no se crean desde el API de empresa; el aprovisionamiento de plataforma queda pendiente.

## Persistencia y consistencia

Usar transacciones MongoDB para operaciones que deban persistir juntas (por ejemplo saldo y movimiento), previa confirmación de replica set. Para saldo concurrente, usar actualización condicional/atómica o estrategia de versión; no basarse en read-calculate-write sin protección. Introducir idempotency keys/document references en comandos que admitan reintentos. Índices deben derivar de unicidad o consultas reales.

## Seguridad y operación

Configurar secretos requeridos por ambiente de producción; no aceptar valores conocidos por defecto. Definir CORS, rate limits y logging por entorno. Auditar operaciones críticas de forma confiable, minimizando datos sensibles. Preparar health/readiness diferenciados, request/correlation ID, monitoreo y backup antes de producción.

## Compatibilidad y evolución

Conservar `/api/v1` y respuestas existentes salvo cambio documentado. Añadir campos/funciones de forma compatible; cualquier cambio incompatible requiere estrategia de transición de datos/API. La estructura futura de apps/packages no se crea en bloque.
