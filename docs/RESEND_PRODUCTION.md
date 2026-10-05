# Configurar invitaciones por Resend en producción

El flujo de invitación está implementado en el backend. Para habilitar el envío real:

1. En Resend, agrega el dominio que administras y completa la verificación publicando los registros DNS que Resend muestre para ese dominio. Espera a que el panel indique que el dominio está verificado; no uses un dominio que no controles.
2. Crea una API key de Resend apropiada para el entorno de producción. Guárdala como secreto del servicio backend en Render; no la guardes en GitHub, Expo ni Cloudflare.
3. En el servicio de backend de Render configura:
   - `RESEND_API_KEY`: la API key privada emitida por Resend.
   - `EMAIL_FROM`: por ejemplo `Nodara ERP <notificaciones@TU-DOMINIO-VERIFICADO>`, usando una dirección del dominio verificado.
   - `PUBLIC_APP_URL`: `https://diplomado-erp.fernandopalaciospluma17.workers.dev`.
   - Conserva los valores vigentes de `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGIN`, `NODE_ENV` y `PORT`; no los sobrescribas al editar las variables.
4. Reinicia/despliega el backend y comprueba `/api/v1/health` y `/api/v1/health/ready`.
5. Con una cuenta administradora de prueba, invita una dirección controlada por el equipo. Comprueba recepción, enlace `?confirm=...`, activación y acceso. No compartas la API key ni el enlace de confirmación en tickets o logs.

La aplicación responde con error si Resend no está configurado o rechaza el envío. Si falla el reenvío, el token de confirmación anterior se restaura mientras la invitación continúe pendiente. Las pruebas automatizadas usan un mock del proveedor y no envían correo real.
