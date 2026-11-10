# Marcasa FoodService Web

Aplicación Angular 22 conectada al API .NET del proyecto. Incluye acceso con JWT, menú según permisos, panel general, catálogos de clientes/productos/inventario, creación y revisión de pedidos, autorizaciones, cancelaciones, entregas y hoja de ruta imprimible.

## Ejecutar localmente

1. Iniciar el backend desde `API/marcasa-foodservice-api/MarcasaFoodService`:

   ```powershell
   dotnet run --project MarcasaFoodService.Api --launch-profile http
   ```

   El API escuchará en `http://localhost:5179` y usará la base local `MarcasaFoodService_Dev`.

2. Desde este directorio, instalar las dependencias si hace falta e iniciar Angular:

   ```powershell
   pnpm install
   pnpm start
   ```

3. Abrir `http://localhost:4200`. El proxy de `proxy.conf.json` dirige las llamadas `/api` al backend. Para el acceso inicial, consultar las credenciales de desarrollo en `BD/BASE/USUARIOS v1.0.sql`; cambiarlas antes de usar el sistema con datos de producción.

## Alcance

Las rutas y botones se muestran según los permisos que el backend devuelve al iniciar sesión. Los cambios de pedido se envían a los procedimientos almacenados, que validan permisos, estados y stock. La hoja de ruta puede imprimirse o guardarse como PDF desde el navegador.

Gerente y Supervisora pueden crear, editar y desactivar clientes y productos, además de ajustar las existencias disponibles en inventario con un motivo. Los clientes y productos inactivos siguen visibles en los listados, pero no se pueden agregar a pedidos nuevos. El API recibe metadatos de evidencia de entrega, pero todavía no incluye carga de archivos, por lo que esta interfaz confirma entregas sin adjuntos.

Para estas funciones, aplicar una vez `BD/LÓGICA/catalogo_cuenta_v4.sql` en la base local o publicada. El script también habilita la edición de datos personales desde **Información de la cuenta**.
Para gestionar clientes, aplicar además `BD/LÓGICA/clientes_admin_v5.sql`.

## Verificación

```powershell
pnpm build
pnpm exec ng test --watch=false
```


## Administración de usuarios

El Gerente tiene la opción **Usuarios** para crear, editar, activar, desactivar y reiniciar contraseñas. La contraseña inicial o restablecida es `Temporal2026*`. El primer ingreso lleva a **Cambiar contraseña**; después de guardarla se debe iniciar sesión otra vez.

El Gerente puede abrir **Roles** para crear, editar permisos y activar o desactivar roles. Al cambiar permisos, los usuarios afectados deben iniciar sesión de nuevo para recibir la nueva configuración. La pantalla de revisión de pedidos inicia con todas las casillas sin marcar y solo permite autorizar cuando están todas confirmadas.
