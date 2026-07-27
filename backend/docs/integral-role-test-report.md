# Informe de prueba integral por roles de DayFlow

Fecha de ejecución: 2026-07-27  
Base comprobada: `dayflow_db`  
API comprobada: `/api/v1/`  
Resultado general: **APROBADO — 25 de 25 pasos**

## Alcance y estrategia

La prueba se ejecutó contra las vistas reales de Django REST Framework y la
conexión MySQL configurada. Todos los datos se crearon dentro de una única
transacción y se forzó rollback al terminar.

El adjunto utilizó `InMemoryStorage`; por tanto, no se escribió ningún archivo
en `MEDIA_ROOT`. Los access y refresh tokens solamente se comprobaron por
presencia y propiedades de seguridad. El informe no contiene tokens,
contraseñas ni hashes.

## Datos de preparación

Se prepararon temporalmente:

- un departamento activo;
- una categoría activa;
- dos empleados;
- dos técnicos, necesarios para comprobar el conflicto de asignación;
- un administrador;
- un ticket perteneciente al segundo empleado para comprobar aislamiento;
- contraseñas aleatorias generadas durante la ejecución y nunca impresas.

La preparación y todas las operaciones fueron revertidas. La comprobación
posterior confirmó:

```text
rollback_clean=true
database_rows_remaining=0
disk_files_created=0
real_credentials_reported=false
```

## Empleado

| Paso | Resultado esperado | Resultado real | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| Login | HTTP 200, access JWT, refresh HttpOnly y usuario sin password | HTTP 200 | `access_present=true`, `refresh_httponly=true`, `password_exposed=false` | Aprobado |
| Crear ticket con fecha límite | HTTP 201, estado OPEN y fecha conservada | HTTP 201 | `status=OPEN`, `due_date_preserved=true` | Aprobado |
| Crear ticket sin fecha límite | HTTP 201, estado OPEN y `due_date=null` | HTTP 201 | `due_date_is_null=true` | Aprobado |
| Adjuntar evidencia | Carga 201, descarga 200 y contenido íntegro | Carga 201; descarga 200 | 25 bytes recuperados, `storage_path` no expuesto, almacenamiento en memoria | Aprobado |
| Ver solo sus tickets | Sus dos tickets visibles y ticket ajeno oculto | Lista 200; detalle ajeno 404 | `own_visible=2`, `foreign_visible=false`, lista total del empleado=2 | Aprobado |
| Comentar | HTTP 201 con el empleado como autor | HTTP 201 | `comment_created=true`, autor autenticado confirmado | Aprobado |
| Cambiar contraseña | HTTP 200, nuevo access, hash actualizado y password no expuesto | HTTP 200 | `new_access_present=true`, `hash_verified=true`, `password_exposed=false` | Aprobado |

## Técnico

| Paso | Resultado esperado | Resultado real | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| Login del técnico principal | HTTP 200 con JWT y refresh HttpOnly | HTTP 200 | Tokens presentes sin exponer sus valores | Aprobado |
| Login del técnico de conflicto | HTTP 200 con JWT y refresh HttpOnly | HTTP 200 | Segundo actor autenticado de forma independiente | Aprobado |
| Ver disponibles | Lista 200 con los tickets OPEN sin asignar | HTTP 200 | Los dos tickets temporales estaban incluidos; lista disponible total=3 | Aprobado |
| Tomar ticket | HTTP 200, técnico asignado y estado IN_PROGRESS | HTTP 200 | `assigned_to_authenticated_technician=true` | Aprobado |
| Evitar doble asignación | El segundo técnico recibe HTTP 409 | HTTP 409 | `conflict=true`, no se creó una segunda asignación | Aprobado |
| Cambiar a ON_HOLD y volver a IN_PROGRESS | Ambas operaciones 200; ON_HOLD no cierra | 200 y 200 | `on_hold_closed_at=null`, reanudación confirmada | Aprobado |
| Comentar | HTTP 201 con el técnico como autor | HTTP 201 | Autor autenticado confirmado | Aprobado |
| Completar y desestimar | Estados terminales 200 y `closed_at` informado | COMPLETED 200; segundo take 200; DISMISSED 200 | `terminal_closed_at_present=true` | Aprobado |
| Ver historial | HTTP 200 con acciones y cambios internos de estado | HTTP 200 | Acciones `CREATED`, `TAKEN`, `STATUS_CHANGED`, `COMMENT_ADDED`, `ATTACHMENT_ADDED`; cuatro filas `TicketHistoryChange` | Aprobado |
| Ver métricas personales | Resumen, ranking y scope histórico limitados al técnico | Todos HTTP 200 | Un completado, un desestimado, una fila de ranking y dos tickets terminales propios | Aprobado |

## Administrador

| Paso | Resultado esperado | Resultado real | Evidencia | Estado |
| --- | --- | --- | --- | --- |
| Login | HTTP 200 con JWT, refresh HttpOnly y usuario seguro | HTTP 200 | `access_present=true`, `refresh_httponly=true`, password no expuesto | Aprobado |
| Dashboard global | HTTP 200 con alcance global | HTTP 200 | Total=3, completados=1, desestimados=1 | Aprobado |
| Listar y crear usuarios | Lista 200 y creación 201 | 200 y 201 | Lista temporal=6; password no expuesto; cambio obligatorio activo | Aprobado |
| Editar usuario | HTTP 200 y campos actualizados | HTTP 200 | Nombre y posición actualizados | Aprobado |
| Restablecer contraseña temporal | HTTP 200, hash válido y cambio obligatorio | HTTP 200 | Hash verificado; password no expuesto; `must_change_password=true` | Aprobado |
| Desactivar usuario | HTTP 200 y desactivación lógica | HTTP 200 | `is_active=false`; fila preservada; no se usó DELETE | Aprobado |
| Consultar todos los tickets | HTTP 200 e inclusión de tickets de ambos empleados | HTTP 200 | Los tres tickets temporales estaban visibles | Aprobado |
| Ver panel e informes | Endpoints analíticos 200 e informe anual solo administrativo | Seis endpoints 200; informe anual 200; técnico 403 | Categoría=2, departamento=2, informe anual=1, guardia de rol=403 | Aprobado |

## Endpoints analíticos comprobados

- `GET /api/v1/analytics/summary/`
- `GET /api/v1/analytics/technician-ranking/`
- `GET /api/v1/analytics/tickets-by-category/`
- `GET /api/v1/analytics/demand-by-department/`
- `GET /api/v1/analytics/due-tickets/`
- `GET /api/v1/analytics/historical/`
- `GET /api/v1/analytics/activity-history/`
- `GET /api/v1/analytics/annual-technician-report/`

El informe anual respondió 200 para el administrador y 403 para el técnico.
Los totales por categoría y departamento excluyeron correctamente el ticket
desestimado.

## Conclusión

Los contratos de autenticación, permisos por objeto, scopes, concurrencia,
estados, adjuntos, auditoría, usuarios y analítica se comportaron conforme a
las reglas de DayFlow. No se detectaron fallos y la ejecución no dejó datos,
archivos, tokens publicados ni credenciales de prueba persistidas.
