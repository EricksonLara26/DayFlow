# DayFlow

Instrucciones rapidas para ejecutar la app en el navegador.

## Requisitos

- Tener Node.js instalado.
- Estar ubicado en la carpeta del proyecto:

```bash
cd DayFlow
```

## Ejecutar en modo desarrollo

1. Instala las dependencias si es la primera vez que abres el proyecto:

```bash
npm install
```

2. Inicia el servidor local:

```bash
npm run dev
```

3. Abre en el navegador la direccion que muestre la terminal. Normalmente sera:

```text
http://127.0.0.1:5173/
```

Si ese puerto esta ocupado, Vite usara otro parecido, por ejemplo `5174` o `5175`.
Si estas usando un entorno remoto o un preview del editor, usa la URL reenviada por el editor.

## Probar la version final

Para crear la version optimizada de la app:

```bash
npm run build
```

Luego puedes verla localmente con:

```bash
npm run preview
```

Abre la direccion que aparezca en la terminal, normalmente:

```text
http://127.0.0.1:4173/
```

## Notas utiles

- Mientras `npm run dev` este abierto, la app se actualiza automaticamente al guardar cambios.
- Para detener el servidor, presiona `Ctrl + C` en la terminal.
- No abras directamente `src/main.jsx`; la app debe ejecutarse con Vite usando `npm run dev` o `npm run preview`.
