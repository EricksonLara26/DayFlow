# DayFlow

DayFlow es una aplicación frontend construida con React y Vite para la gestión interna de tickets de soporte técnico.

El sistema permite simular el flujo principal de soporte:

- Inicio de sesión con detección automática de rol.
- Creación de solicitudes.
- Gestión de tickets por técnicos.
- Comentarios e historial de actividad.
- Dashboard con metricas de rendimiento.
- Gestión de usuarios por permisos de Administrador y Técnico.

## Requisitos

Antes de ejecutar el proyecto necesitas:

- Node.js instalado.
- Corepack disponible.
- Acceso a una terminal.
- Estar ubicado en la carpeta del proyecto.

```bash
cd DayFlow
```

## Preparar pnpm

El proyecto usa pnpm como gestor de paquetes.

Para verificar que pnpm está disponible mediante Corepack:

```bash
corepack pnpm --version
```

Si tienes pnpm habilitado directamente en tu terminal, tambien puedes verificarlo con:

```bash
pnpm --version
```

## Instalar dependencias

Instala las dependencias del proyecto con:

```bash
corepack pnpm install
```

Si tu terminal reconoce el comando directo:

```bash
pnpm install
```

Esto crea la carpeta `node_modules` y usa el archivo `pnpm-lock.yaml` como lockfile del proyecto.

## Ejecutar en desarrollo

Para iniciar la aplicación en modo desarrollo:

```bash
corepack pnpm dev
```

O con el comando directo:

```bash
pnpm dev
```

La terminal mostrará una URL local. Normalmente será:

```text
http://127.0.0.1:5173/
```

Abre esa dirección en el navegador.

Mientras el servidor esté activo, la aplicación se actualizará automáticamente cuando guardes cambios.

Para detener el servidor:

```text
Ctrl + C
```

## Compilar para producción

Para generar la version optimizada:

```bash
corepack pnpm build
```

O:

```bash
pnpm build
```

La salida se genera en la carpeta:

```text
dist/
```

## Probar la version compilada

Despues de compilar, puedes levantar una vista local de la version final:

```bash
corepack pnpm preview
```

O:

```bash
pnpm preview
```

La terminal mostrará una URL similar a:

```text
http://127.0.0.1:4173/
```

## Comandos principales

| Comando | Uso |
| --- | --- |
| `corepack pnpm install` | Instala dependencias. |
| `corepack pnpm dev` | Ejecuta la aplicación en desarrollo. |
| `corepack pnpm build` | Compila la aplicación para producción. |
| `corepack pnpm preview` | Prueba localmente la version compilada. |

Si pnpm está habilitado directamente, puedes usar las versiones cortas:

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```

## Usuarios de prueba

Administrador:

```text
usuario: administrador
contraseña: 1234
```

Técnico:

```text
usuario: tecnico
contraseña: 1234
```

Empleado:

```text
usuario: empleado
contraseña: 1234
```

## Estructura principal

```text
src/
  config/
  components/
  data/
  routes/
  services/
  pages/
  styles/
  utils/
  App.jsx
  main.jsx
```

## Notas utiles

- Ejecuta la aplicación con Vite usando los scripts del proyecto.
- No abras directamente archivos dentro de `src/`.
- Manten versionado `pnpm-lock.yaml`.
- Si necesitas reinstalar dependencias desde cero, elimina `node_modules` y vuelve a ejecutar la instalación.

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
corepack pnpm install
```

macOS o Linux:

```bash
rm -rf node_modules
corepack pnpm install
```
