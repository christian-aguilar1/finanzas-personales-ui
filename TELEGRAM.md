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

## Preferencias para nuevos movimientos

En la misma pantalla, pulsar **Configurar valores predeterminados**. El formulario se carga al
abrirlo y permite seleccionar cuenta y categoría/subcategoría para gastos. Elegir las opciones
«Sin predeterminada» quita cada preferencia. Se guardan en el backend por usuario, no en localStorage.
Se conservan al desconectar el bot. No hace falta volver a registrar el webhook.

Telegram usa el mes actual cuando se omite el período; un valor explícito en el mensaje tiene
prioridad sobre cualquier predeterminado. La categoría elegida no se usa para ingresos. El medio
de pago sigue siendo necesario y la propuesta debe confirmarse para crear una transacción.

Antes de desplegar el backend de esta versión aplicar `sql/V4__telegram_preferencias.sql`.
