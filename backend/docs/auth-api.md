# API de autenticación de DayFlow

Base: `/api/v1/auth/`

La API conserva `snake_case`. El frontend debe convertir a `camelCase` en
`authService.js`. El access token se devuelve en JSON para mantenerlo en
memoria. El refresh token nunca se devuelve al JavaScript: Django lo guarda
en la cookie `dayflow_refresh`, marcada `HttpOnly`, con ruta
`/api/v1/auth/`.

Las respuestas de error tienen siempre esta forma:

```json
{
  "message": "Descripción legible del error.",
  "fields": {}
}
```

## Endpoints

### `POST login/`

Entrada:

```json
{
  "identifier": "usuario-o-correo@empresa.com",
  "password": "contraseña"
}
```

Salida:

```json
{
  "message": "Sesión iniciada correctamente.",
  "token_type": "Bearer",
  "access": "<jwt>",
  "access_expires_at": "2026-07-27T18:00:00Z",
  "user": {
    "id": 1,
    "username": "usuario",
    "email": "usuario@empresa.com",
    "first_name": "Nombre",
    "last_name": "Apellido",
    "full_name": "Nombre Apellido",
    "position": "Analista",
    "department": 1,
    "department_name": "Tecnologia",
    "role": "EMPLOYEE",
    "role_name": "Empleado",
    "is_active": true,
    "must_change_password": false,
    "created_at": "2026-07-27T12:00:00Z",
    "updated_at": "2026-07-27T12:00:00Z"
  }
}
```

Un identificador inexistente, una contraseña incorrecta y una cuenta
inactiva producen la misma respuesta `401`.

### `POST refresh/`

No recibe el token en el cuerpo. Lee la cookie `HttpOnly`, invalida el
refresh anterior y devuelve un access token y una cookie nuevos.

### `GET me/`

Requiere `Authorization: Bearer <access>`. Devuelve `{"user": {...}}`.
Es accesible durante el cambio obligatorio de contraseña.

### `POST logout/`

Invalida el refresh de la cookie cuando existe y elimina la cookie. Es
idempotente.

### `POST change-password/`

Requiere `Authorization: Bearer <access>`.

```json
{
  "current_password": "contraseña-actual",
  "new_password": "contraseña-nueva",
  "confirm_password": "contraseña-nueva"
}
```

Aplica los validadores de Django, establece `must_change_password=false`,
revoca todos los refresh del usuario e invalida inmediatamente los access
anteriores. La respuesta contiene un access y una cookie refresh nuevos.

## Integración posterior de `authService.js`

- Leer la base desde `import.meta.env.VITE_API_BASE_URL`.
- Usar `credentials: "include"` en login, refresh, logout y cambio de
  contraseña para que el navegador gestione la cookie.
- Mantener `access` solo en memoria y añadirlo como bearer a las solicitudes.
- No guardar ningún JWT en `localStorage`.
- Al iniciar la aplicación, llamar a `POST auth/refresh/`; si funciona,
  hidratar la sesión con el `user` devuelto.
- Mapear `first_name`, `last_name`, `department_name`, `is_active` y
  `must_change_password` a los nombres camelCase del frontend.
- Mapear los roles canónicos `ADMINISTRATOR`, `TECHNICIAN` y `EMPLOYEE` a
  las etiquetas actuales sin alterar los valores persistidos.
- Ante un `401`, intentar una sola renovación y repetir la solicitud una
  vez; si falla, limpiar la sesión.
- Conservar temporalmente la forma `{ok, data, user, message}` que consume
  `AuthContext`, para sustituir los mocks sin cambiar la interfaz visual.

Para desarrollo por HTTP se usa
`JWT_REFRESH_COOKIE_SECURE=False`. Frontend y backend deben abrirse con el
mismo hostname (`127.0.0.1` con `127.0.0.1`, o `localhost` con
`localhost`) para que `SameSite=Lax` funcione de forma predecible. En
producción la cookie debe usar `Secure=True` sobre HTTPS.
