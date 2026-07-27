# OpenAPI y pruebas de la API DayFlow

## Documentación disponible

Con el backend iniciado en `127.0.0.1:8000`:

- OpenAPI YAML/JSON: `GET /api/v1/schema/`
- Swagger UI: `GET /api/v1/docs/`
- ReDoc: `GET /api/v1/redoc/`
- Esquema versionado: `backend/docs/openapi.yaml`

Para regenerar y validar el esquema desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py spectacular `
  --validate `
  --file .\docs\openapi.yaml `
  --settings=config.settings_test
```

La generación debe terminar sin advertencias ni errores.

## Autenticación segura

El login devuelve únicamente el access token en JSON. El refresh token se
guarda en una cookie `HttpOnly`; no debe copiarse a JavaScript, Swagger,
variables versionadas ni documentación.

Ejemplo PowerShell sin escribir la contraseña ni el token en el código:

```powershell
$baseUrl = "http://127.0.0.1:8000"
$identifier = Read-Host "Username o email"
$securePassword = Read-Host "Contraseña" -AsSecureString
$password = [System.Net.NetworkCredential]::new(
  "",
  $securePassword
).Password
$webSession = [Microsoft.PowerShell.Commands.WebRequestSession]::new()

$loginBody = @{
  identifier = $identifier
  password = $password
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/api/v1/auth/login/" `
  -ContentType "application/json" `
  -Body $loginBody `
  -WebSession $webSession

$headers = @{
  Authorization = "Bearer $($login.access)"
}

$currentUser = Invoke-RestMethod `
  -Method Get `
  -Uri "$baseUrl/api/v1/auth/me/" `
  -Headers $headers

$refreshed = Invoke-RestMethod `
  -Method Post `
  -Uri "$baseUrl/api/v1/auth/refresh/" `
  -WebSession $webSession

$password = $null
$loginBody = $null
$login.access = $null
$headers.Authorization = $null
```

No imprimas `$login`, `$headers` ni el contenido de cookies en una terminal
compartida. El ejemplo usa la sesión web para que PowerShell gestione la
cookie HttpOnly.

## Respuestas y errores

| Código | Uso principal |
| --- | --- |
| `200` | Consultas y acciones completadas |
| `201` | Usuario, catálogo, ticket, comentario o adjunto creado |
| `400` | Payload, filtro, fecha o archivo inválido |
| `401` | JWT o sesión ausente, inválida o expirada |
| `403` | El rol o el cambio obligatorio de contraseña impide la acción |
| `404` | Recurso inexistente o fuera del scope del usuario |
| `409` | Conflicto atómico al tomar, asignar o cambiar un ticket |

Todos los errores controlados usan:

```json
{
  "message": "No se pudo procesar la solicitud.",
  "fields": {
    "due_date": [
      "La fecha límite no puede ser anterior a la creación."
    ]
  }
}
```

Un error sin campo específico conserva `fields` vacío:

```json
{
  "message": "No tienes permisos para realizar esta operación.",
  "fields": {}
}
```

Un conflicto de ticket devuelve:

```json
{
  "message": "El ticket ya fue tomado por otro técnico.",
  "fields": {}
}
```

## Colección Postman

Importa:

1. `docs/postman/DayFlow.postman_collection.json`
2. `docs/postman/DayFlow.local.postman_environment.example.json`

Duplica el entorno de ejemplo dentro de Postman y completa localmente las
variables vacías. No reemplaces el archivo versionado y no exportes el
entorno poblado dentro del repositorio.

Orden recomendado:

1. `Auth / Login`, que guarda temporalmente `access_token`.
2. Consultas de catálogos para obtener IDs.
3. Creación de ticket con una cuenta `EMPLOYEE`.
4. Toma y cambio de estado con una cuenta `TECHNICIAN`.
5. Consultas de analytics.
6. `Auth / Logout`, que elimina el access token del entorno.

Las operaciones disponibles dependen del rol autenticado. Las peticiones de
creación, asignación, cambio de estado y desactivación modifican datos; usa
una base de desarrollo o pruebas.

## Tests automáticos con APIClient

Las pruebas OpenAPI y de flujos críticos están en
`config/test_openapi.py`. Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe manage.py test `
  config.test_openapi `
  --settings=config.settings_test `
  -v 2
```

La suite comprueba:

- publicación de OpenAPI, Swagger y ReDoc;
- esquema Bearer JWT;
- ausencia de tokens reales en ejemplos;
- códigos documentados `200`, `201`, `400`, `401`, `403`, `404` y `409`;
- login y cookie refresh HttpOnly;
- sobre uniforme `message` y `fields`;
- creación, toma atómica, conflicto, cierre e historial de un ticket.

## Cobertura

Configuración: `backend/.coveragerc`.

```powershell
.\.venv\Scripts\python.exe -m coverage erase
.\.venv\Scripts\python.exe -m coverage run manage.py test `
  --settings=config.settings_test `
  -v 1
.\.venv\Scripts\python.exe -m coverage report
.\.venv\Scripts\python.exe -m coverage html
```

El reporte HTML queda en `backend/htmlcov/` y está ignorado por Git. El
último resultado verificado y el alcance de los flujos están en
`docs/coverage-critical.md`.
