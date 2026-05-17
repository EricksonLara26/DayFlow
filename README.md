# DayFlow

DayFlow es una aplicacion frontend construida con React y Vite para la gestion interna de tickets de soporte tecnico.

El sistema permite simular el flujo principal de soporte:

- Inicio de sesion con deteccion automatica de rol.
- Creacion de solicitudes.
- Gestion de tickets por tecnicos.
- Comentarios e historial de actividad.
- Dashboard con metricas de rendimiento.
- Gestion de usuarios por permisos de Administrador y Tecnico.

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

Para verificar que pnpm esta disponible mediante Corepack:

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

Para iniciar la aplicacion en modo desarrollo:

```bash
corepack pnpm dev
```

O con el comando directo:

```bash
pnpm dev
```

La terminal mostrara una URL local. Normalmente sera:

```text
http://127.0.0.1:5173/
```

Abre esa direccion en el navegador.

Mientras el servidor este activo, la aplicacion se actualizara automaticamente cuando guardes cambios.

Para detener el servidor:

```text
Ctrl + C
```

## Compilar para produccion

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

La terminal mostrara una URL similar a:

```text
http://127.0.0.1:4173/
```

## Comandos principales

| Comando | Uso |
| --- | --- |
| `corepack pnpm install` | Instala dependencias. |
| `corepack pnpm dev` | Ejecuta la aplicacion en desarrollo. |
| `corepack pnpm build` | Compila la aplicacion para produccion. |
| `corepack pnpm preview` | Prueba localmente la version compilada. |

Si pnpm esta habilitado directamente, puedes usar las versiones cortas:

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
contrasena: 1234
```

Tecnico:

```text
usuario: tecnico
contrasena: 1234
```

Empleado:

```text
usuario: empleado
contrasena: 1234
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

- Ejecuta la aplicacion con Vite usando los scripts del proyecto.
- No abras directamente archivos dentro de `src/`.
- Manten versionado `pnpm-lock.yaml`.
- Si necesitas reinstalar dependencias desde cero, elimina `node_modules` y vuelve a ejecutar la instalacion.

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
