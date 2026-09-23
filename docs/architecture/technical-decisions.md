# Decisiones tecnicas

## ADR-001: Monorepo con TypeScript

**Estado:** aceptada

Se usa una raiz compartida con `backend` y `frontend` independientes. TypeScript se adopta en ambos paquetes para compartir contratos y reducir errores de integracion a medida que crezcan los modulos.

## ADR-002: Expo para React Native y Web

**Estado:** aceptada

Expo proporciona un punto de entrada comun para Android y Web y permite incorporar componentes especificos de plataforma solo cuando sea necesario. No se agrega Kotlin en esta fase.

## ADR-003: API REST versionada

**Estado:** aceptada

El backend expone rutas bajo `/api/v1`. Las respuestas usan un sobre consistente con `success`, `message` y `data` o `error`.

## ADR-004: Configuracion por entorno

**Estado:** aceptada

Las variables se validan con Zod al iniciar el backend. El repositorio contiene solo `.env.example`; los valores reales deben vivir en un `.env` local o en el proveedor de despliegue.

## ADR-005: MongoDB encapsulado en backend

**Estado:** aceptada

Mongoose es la unica frontera de persistencia prevista. El frontend se comunica exclusivamente con la API y nunca con MongoDB Atlas.

## ADR-006: Validacion inicial sin MongoDB

**Estado:** temporal

La prueba inicial del health check importa la app Express sin abrir una conexion de base de datos. Esto permite validar HTTP, seguridad y errores en aislamiento. Los casos de uso que persistan datos deberan agregar pruebas de integracion contra MongoDB antes de considerarse terminados.

## ADR-007: Vulnerabilidades de dependencias de desarrollo

**Estado:** pendiente de seguimiento

`npm audit` reporta dos vulnerabilidades moderadas asociadas a Vitest y ofrece una correccion con cambio mayor. No se aplica `npm audit fix --force` automaticamente. Debe revisarse la actualizacion de Vitest antes de FASE 2 o establecerse una politica de excepcion documentada.

## ADR-008: Catalogos tipados en una coleccion

**Estado:** aceptada para FASE 3 inicial

Clientes, proveedores, categorias, marcas, productos y almacenes comparten inicialmente una coleccion `Catalog` con un campo `kind`. Esto mantiene un contrato y una capa de validacion uniformes mientras se definen los atributos especificos de cada dominio. El indice unico compuesto por `kind` y `code` evita colisiones entre elementos del mismo catalogo sin impedir que distintos catalogos reutilicen codigos.
## ADR-009: Ambito inicial de una empresa y sucursal

**Estado:** aceptada por el usuario para Fase 1

Todos los registros preexistentes sin tenant se asignan a una empresa y sucursal iniciales. El migrador requiere datos de nombre/codigo y un administrador inicial, hace dry-run por defecto y solo escribe con `--apply`. No asigna tenant por heuristica ni por datos del request.

## ADR-010: Permisos persistidos y sesiones revocables

**Estado:** aceptada para Fase 1

Roles pertenecen a una empresa y referencian un catalogo global sembrado de permisos. Cada peticion obtiene los permisos del rol persistido para que los cambios apliquen inmediatamente. Las sesiones guardan usuario/tenant/expiracion/revocacion y `requireAuth` valida su estado.

## ADR-011: JWT anterior a Fase 1

**Estado:** aceptada para el cambio de autenticacion

Tokens sin `sid` reciben `401 SESSION_REQUIRED`; los usuarios deben iniciar sesion de nuevo despues de la migracion. Los contratos JSON y endpoints de negocio conservan sus rutas, pero las operaciones ahora necesitan tenant activo. No se ofrece refresh token en este incremento.
