# Cobertura de flujos críticos de DayFlow

Fecha de ejecución: 2026-07-27.

Comando:

```powershell
.\.venv\Scripts\python.exe -m coverage run manage.py test `
  --settings=config.settings_test `
  -v 1
.\.venv\Scripts\python.exe -m coverage report
```

Resultado:

- 113 pruebas ejecutadas correctamente.
- 1,704 sentencias de lógica incluidas.
- Cobertura total con branches: **88.5%**.
- `manage.py check`: sin incidencias.

## Módulos críticos

| Área | Archivo | Cobertura |
| --- | --- | ---: |
| JWT personalizado | `accounts/authentication.py` | 100.0% |
| Cookies refresh HttpOnly | `accounts/cookies.py` | 100.0% |
| Errores de autenticación | `accounts/exceptions.py` | 100.0% |
| Servicios de sesión | `accounts/services.py` | 100.0% |
| Endpoints auth/usuarios | `accounts/views.py` | 92.1% |
| Permisos de cuentas | `accounts/permissions.py` | 92.2% |
| Selectors de analytics | `analytics/selectors.py` | 97.7% |
| Endpoints de analytics | `analytics/views.py` | 96.9% |
| Serializers de analytics | `analytics/serializers.py` | 95.5% |
| Modelos de tickets | `tickets/models.py` | 94.4% |
| Permisos de tickets | `tickets/permissions.py` | 94.1% |
| Endpoints de tickets | `tickets/views.py` | 87.8% |
| Servicios transaccionales | `tickets/services.py` | 83.2% |
| Esquema OpenAPI reutilizable | `config/openapi.py` | 100.0% |

## Flujos cubiertos

| Flujo | Evidencia automática |
| --- | --- |
| Login por username/email, inválido e inactivo | `accounts/tests.py`, `config/test_openapi.py` |
| Refresh rotado, logout y blacklist | `accounts/tests.py` |
| Cambio obligatorio y cambio de contraseña | `accounts/tests.py` |
| Usuarios, filtros, permisos y desactivación | `accounts/test_user_api.py` |
| Catálogos activos, administración y desactivación | `catalogs/test_api.py` |
| Creación y scope de tickets | `tickets/test_api.py` |
| Toma atómica y conflicto `409` | `tickets/test_api.py`, `config/test_openapi.py` |
| Asignación, estados terminales e historial | `tickets/test_api.py`, `config/test_openapi.py` |
| Comentarios, adjuntos y descargas protegidas | `tickets/test_api.py` |
| Agregaciones y control N+1 | `analytics/test_api.py` |
| Publicación y códigos del esquema OpenAPI | `config/test_openapi.py` |

Los porcentajes no sustituyen las pruebas de aceptación. En particular,
`tickets/services.py` mantiene ramas defensivas para estados imposibles,
usuarios inactivos y validaciones repetidas bajo bloqueo; algunas ramas no
se fuerzan para evitar pruebas artificiales que contradigan los constraints
del esquema.
