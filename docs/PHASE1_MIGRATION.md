# Fase 1 — migración a empresa inicial

La aplicación nueva exige que usuarios y documentos tengan `companyId` y `branchId`. La decisión aprobada para esta transición es asignar los registros actuales a una empresa y sucursal iniciales.

## Antes de aplicar

1. Detén escrituras y respalda MongoDB; verifica que el respaldo pueda restaurarse.
2. Define en el entorno del proceso `MONGODB_URI`, `INITIAL_COMPANY_CODE`, `INITIAL_COMPANY_NAME`, `INITIAL_COMPANY_LEGAL_NAME`, `INITIAL_BRANCH_CODE` e `INITIAL_BRANCH_NAME`.
3. Si la base no tiene usuarios, define además `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD` (mínimo 12 caracteres). Si ya hay usuarios, debe existir uno con `roleId: ADMIN`; si no, la herramienta aborta sin escribir.
4. Ejecuta el modo de inspección, que no escribe:

   ```powershell
   npm.cmd --prefix backend run migrate:single-company
   ```

5. Verifica que el destino y los conteos de registros sin empresa sean los esperados. Después de validar el respaldo y los valores del tenant, aplica explícitamente:

   ```powershell
   npm.cmd --prefix backend run migrate:single-company -- --apply
   ```

6. Confirma índices y relaciones en la base, despliega la aplicación y pide a los usuarios volver a iniciar sesión.

La herramienta crea la empresa/sucursal inicial y roles `COMPANY_ADMIN` y `USER`; registra permisos; convierte el rol heredado `ADMIN` en administrador de empresa y otros roles heredados en `USER`; asigna la empresa/sucursal a registros sin tenant; reemplaza índices globales conocidos por índices con ámbito. En ejecuciones repetidas solo asigna tenant a documentos que aún carecen de `companyId`, y no sobrescribe roles/permisos ya existentes.

## Límites y recuperación

La operación abarca varias colecciones y no es transaccional. Un fallo puede dejar trabajo parcial; la herramienta es repetible para campos faltantes, pero ante errores de índices/restauración sigue el procedimiento de recuperación del respaldo antes de reabrir escrituras. No la ejecutes contra producción sin backup verificado y una ventana de mantenimiento.

El migrador es deliberadamente manual; no se ejecutó en esta sesión ni se conectó a ninguna base de datos. Nuevos tenants requieren un proceso de aprovisionamiento con identidad de plataforma; el administrador de la empresa inicial no recibe permiso para crear otras empresas.
