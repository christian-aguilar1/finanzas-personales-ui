# Chat del asistente

El botón **Asistente** aparece en las pantallas de usuarios autenticados. El panel
se carga de forma diferida, sigue los temas claro/oscuro de la app y permite consultar
datos o preparar gastos e ingresos puntuales para confirmarlos.

Usa `environment.apiUrl` y el interceptor de Auth0 existentes. No hay variables nuevas
en Vercel ni claves de IA en el frontend. Configurar el proveedor exclusivamente en
el backend, según su archivo `ASISTENTE_IA.md`.

Sin configuración del proveedor, el chat muestra el estado de preparación y permite
volver a comprobarlo. Incluye estados de carga, sin conexión, error y vencimiento.
Las respuestas se muestran como texto; no se interpreta HTML generado por la IA.

Las propuestas no modifican saldos hasta pulsar **Confirmar y guardar**. Un fallo de red
permite confirmar otra vez el mismo UUID: el servidor evita la duplicación. Al guardar
se actualizan las vistas abiertas de inicio, cuentas, transacciones, presupuesto, proyección y cuadre.

La conversación vive en memoria del componente de la sesión; cerrar el panel conserva
la conversación, **Nueva conversación**, cerrar sesión o recargar la página la borra.
Los borradores del servidor caducan después de 30 minutos. No se usa localStorage.

Validación:

```text
npx ng build
npx ng test --browsers ChromeHeadless --watch=false
```

Para probar con datos reales: levantar el backend configurado, iniciar sesión, abrir
el asistente y preguntar por el gasto del mes. Para registrar, indicar una cuenta y
un medio de pago; revisar fecha, categoría, monto y facturación en la tarjeta antes
de confirmar. La primera versión no crea cuotas ni recurrentes mediante chat.
