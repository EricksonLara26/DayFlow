# Informe de cierre técnico de DayFlow

Fecha de ejecución: 27 de julio de 2026.

Estado global: **PENDIENTE**.

No falló ninguna prueba crítica funcional. El cierre permanece pendiente por
dos condiciones externas a las suites: configurar Redis compartido para un
despliegue con múltiples workers y generar/validar visualmente el EER dentro
de MySQL Workbench.

## Resultado por área

| Área | Estado | Evidencia |
| --- | --- | --- |
| Pruebas Django | APROBADO | 120 pruebas, 0 fallos; base de prueba destruida al finalizar |
| Pruebas frontend | APROBADO | 15 suites y 119 pruebas, 0 fallos |
| Django `check` | APROBADO | 0 errores y 0 advertencias |
| Migraciones pendientes | APROBADO | `makemigrations --check --dry-run`: sin cambios; `migrate --check`: código 0 |
| Build frontend | APROBADO | Vite 7.3.6, 1721 módulos, salida generada en `dist/` |
| Endpoints principales | APROBADO | smoke test JWT de solo lectura: 8 respuestas 200; login inválido: 401 |
| Esquema lógico MySQL | APROBADO | 9 tablas, 72 columnas y 14 FK coinciden con el DBML |
| Revisión visual Workbench | PENDIENTE | Workbench 8.0.47 está instalado; la automatización no produjo un artefacto EER verificable |
| EER frente al DBML | PENDIENTE | comparación lógica aprobada; falta generar y validar el diagrama en Workbench |
| Mocks y almacenamiento local | APROBADO | no son fuente de verdad de datos de negocio |
| README y documentación | APROBADO | arranque frontend/backend/MySQL documentado sin secretos |
| Preparación de despliegue | PENDIENTE | `check --deploy` bloquea con `dayflow_security.E006` por falta de Redis compartido |

## Comandos críticos ejecutados

```powershell
Push-Location .\backend
.\.venv\Scripts\python.exe manage.py test --settings=config.settings_test
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py migrate --check
.\.venv\Scripts\python.exe manage.py check --deploy
Pop-Location

pnpm test -- --runInBand --silent
pnpm build
```

`migrate --check` mantiene la advertencia conocida `mysql.W003` para
`ticket_attachments.storage_path`. La columna `VARCHAR(500) UNIQUE` es parte
del DBML aprobado y su índice máximo de 2000 bytes cabe en el límite de 3072
bytes de InnoDB con `utf8mb4`.

`check --deploy` devuelve:

- error `dayflow_security.E006`: el throttling usa `LocMemCache`;
- advertencia `security.W005`: HSTS no incluye subdominios;
- advertencia `security.W021`: HSTS preload no está activado.

Redis es obligatorio antes de desplegar varios workers. Las opciones HSTS
solo deben activarse cuando todos los dominios y subdominios funcionen
exclusivamente por HTTPS.

## Smoke test contra `dayflow_db`

Se generó un access token temporal en memoria para un administrador activo. El
token y las credenciales no se imprimieron ni se guardaron. Todas las
solicitudes fueron de solo lectura:

| Endpoint | Resultado |
| --- | ---: |
| `/api/v1/auth/me/` | 200 |
| `/api/v1/users/?page_size=1` | 200 |
| `/api/v1/departments/?active=true&page_size=1` | 200 |
| `/api/v1/categories/?active=true&page_size=1` | 200 |
| `/api/v1/tickets/?page_size=1` | 200 |
| `/api/v1/analytics/summary/` | 200 |
| `/api/v1/analytics/technician-ranking/` | 200 |
| `/api/v1/analytics/historical/` | 200 |
| `/api/v1/auth/login/` con credenciales deliberadamente inválidas | 401 |

Las operaciones de escritura, permisos por rol, conflicto de doble toma,
historial y adjuntos están cubiertas por las 120 pruebas backend y por
[integral-role-test-report.md](integral-role-test-report.md).

## Ingeniería inversa lógica

La comparación se hizo contra `information_schema` de la conexión Django real,
sin modificar filas:

| Tabla | Columnas | Resultado |
| --- | ---: | --- |
| `roles` | 5 | coincide |
| `departments` | 6 | coincide |
| `categories` | 6 | coincide |
| `users` | 14 | coincide |
| `tickets` | 14 | coincide |
| `ticket_comments` | 6 | coincide |
| `ticket_history` | 5 | coincide |
| `ticket_history_changes` | 5 | coincide |
| `ticket_attachments` | 9 | coincide |

También coinciden las 14 relaciones esperadas. Todas las tablas usan InnoDB y
`utf8mb4_0900_ai_ci`; `roles.code` conserva su colación binaria a nivel de
columna. Cada conexión Django inicializa la sesión MySQL en `+00:00`. Los
roles persistidos son únicamente `ADMINISTRATOR`, `TECHNICIAN` y `EMPLOYEE`.

Conteos observados:

| Entidad | Total |
| --- | ---: |
| Roles | 3 |
| Departamentos | 5 |
| Categorías | 8 |
| Usuarios | 1 |
| Tickets, comentarios, historial, cambios y adjuntos | 0 |

## Diferencias legítimas de Django

1. `TextField` se materializa como `LONGTEXT` en MySQL.
2. Los enums del DBML son `VARCHAR` más restricciones `CHECK`; `TextChoices`
   aporta las etiquetas de aplicación sin guardar códigos españoles.
3. `PROTECT` opera en el ORM y las FK de MySQL no usan cascada, por lo que
   conservan el historial.
4. Los defaults de Django se aplican desde la aplicación y no agregan defaults
   SQL permanentes no declarados.
5. Django crea tablas internas de administración, permisos, sesiones,
   migraciones y blacklist JWT. No son tablas de negocio del DBML.
6. `active` es la columna física de usuario. `is_active`, `is_staff` e
   `is_superuser` son propiedades derivadas y no añaden columnas.
7. `event_type` y `action` del historial se derivan de `action_code`;
   `TicketHistoryChange` conserva los valores auditables como filas.

El detalle completo está en
[dbml-model-migration-matrix.md](dbml-model-migration-matrix.md).

## Fuente de verdad

- `ticketService.js` consulta la API para listas, detalle, creación, toma,
  estados, comentarios, historial y adjuntos.
- usuarios, departamentos, categorías y autenticación ya consultan la API.
- las cachés de servicios son copias en memoria hidratadas desde la API y no
  persisten datos de negocio;
- `localStorage` guarda únicamente preferencias visuales;
- `sessionStorage` guarda un usuario sanitizado para restaurar la interfaz;
- el access token vive en memoria y el refresh token en cookie `HttpOnly`;
- `src/mocks/` solo se importa desde pruebas o desde el servidor API simulado
  de `src/test/`.

## Acciones pendientes para aprobar el cierre

1. Configurar `CACHE_URL=redis://...` mediante el gestor de secretos del
   entorno y repetir `manage.py check --deploy`.
2. Confirmar la estrategia HSTS después de validar HTTPS en todos los
   subdominios.
3. En Workbench: `Database > Reverse Engineer`, seleccionar `dayflow_db`,
   generar el EER, excluir o separar las tablas internas de Django y verificar
   visualmente las 9 tablas y 14 relaciones de negocio.
4. Guardar la evidencia EER sin credenciales y actualizar este estado a
   `APROBADO`.
