# Conectar Telegram

Pantalla protegida `/telegram`, accesible desde el menú **Conectar Telegram** y desde el chat web.
La ruta se carga de forma diferida y usa los temas, el interceptor de Auth0 y `environment.apiUrl`
existentes. No hay variables nuevas de Vercel ni secretos en el frontend.

La pantalla permite generar un enlace temporal, abrir el bot, comprobar el vínculo, cancelar un
enlace y desconectar. Mientras hay un enlace pendiente consulta el estado cada cuatro segundos;
también comprueba al volver a la pestaña. El enlace permanece solo en memoria y se elimina al
vincular, cancelar, vencer o abandonar la página. Las respuestas del backend usan `Cache-Control: no-store`.

Para habilitarla realmente, configurar el backend, aplicar `sql/V3__telegram.sql` antes del
despliegue y registrar el webhook según `TELEGRAM.md` del repositorio backend. Sin configuración,
la pantalla explica que Telegram aún no está habilitado. No solicita tokens al usuario.

Verificación: `npx ng build` y `npx ng test --browsers ChromeHeadless --watch=false`.
