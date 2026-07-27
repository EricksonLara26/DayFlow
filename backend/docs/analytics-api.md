# API de analítica de DayFlow

Base: `/api/v1/analytics/`. Todos los resultados se calculan desde las tablas
operacionales; no existen tablas de totales ni migraciones para analítica.
Las rutas requieren JWT y haber completado el cambio obligatorio de
contraseña.

## Alcance por rol

- `ADMINISTRATOR`: consulta todos los tickets.
- `TECHNICIAN`: consulta los tickets `OPEN` sin asignar y todos los tickets
  asignados a sí mismo.
- `EMPLOYEE`: consulta únicamente sus propios tickets.

El informe anual es administrativo y requiere `ADMINISTRATOR`.

## Endpoints

### Resumen

`GET /api/v1/analytics/summary/`

```json
{
  "total_tickets": 42,
  "open_tickets": 8,
  "in_progress_tickets": 10,
  "on_hold_tickets": 2,
  "completed_tickets": 20,
  "dismissed_tickets": 2,
  "overdue_tickets": 3
}
```

`overdue_tickets` cuenta tickets no terminales con `due_date` anterior a la
fecha UTC actual.

### Ranking de técnicos

`GET /api/v1/analytics/technician-ranking/`

```json
[
  {
    "technician_id": 7,
    "technician_name": "Ana Técnica",
    "completed_tickets": 12,
    "average_resolution_time": 95
  }
]
```

`average_resolution_time` se expresa en minutos y es `null` si el técnico no
tiene tickets completados. La vista administrativa incluye técnicos activos
sin tickets con total cero.

### Totales por categoría y departamento

- `GET /api/v1/analytics/tickets-by-category/`
- `GET /api/v1/analytics/demand-by-department/`

Ambos excluyen `DISMISSED`.

```json
[
  {
    "category_id": 3,
    "category_name": "Hardware",
    "total": 14
  }
]
```

```json
[
  {
    "department_id": 2,
    "department_name": "Operaciones",
    "total": 18
  }
]
```

El departamento proviene de `requester_department`, que conserva la
instantánea del departamento al crear el ticket.

### Próximos vencimientos

`GET /api/v1/analytics/due-tickets/`

Devuelve tickets no terminales que vencen desde mañana hasta dentro de tres
días, inclusive.

```json
[
  {
    "ticket_id": 31,
    "title": "Renovar certificado",
    "due_date": "2026-07-29",
    "status": "IN_PROGRESS",
    "priority": "HIGH"
  }
]
```

### Histórico mensual

`GET /api/v1/analytics/historical/`

```json
[
  {
    "period": "2026-07",
    "created": 15,
    "completed": 11,
    "dismissed": 1
  }
]
```

`created` usa `created_at`; `completed` y `dismissed` usan `closed_at`.

### Historial de actividad

`GET /api/v1/analytics/activity-history/`

La respuesta usa la paginación estándar (`count`, `next`, `previous`,
`results`) y orden descendente por fecha. Cada resultado contiene `id`,
`event_type`, `action_code`, `action`, `actor_id`, `actor_name`,
`created_at`, `ticket_id`, `ticket_title` y `changes`.
`TicketHistoryChange` es de solo lectura y se obtiene mediante prefetch; no
existe una ruta para modificarlo libremente.

### Informe anual por técnico

`GET /api/v1/analytics/annual-technician-report/?technician_id=7&year=2026`

Solo incluye tickets `COMPLETED` cuyo `closed_at` pertenece al año indicado.
Devuelve los datos del técnico, el total y los tickets con categoría,
departamento, solicitante, técnico, fechas y tiempo de resolución en minutos.

## Frontera snake_case a camelCase

La API conserva `snake_case`. Los mappers del frontend convierten:

| API | Frontend |
| --- | --- |
| `total_tickets` | `totalTickets` |
| `open_tickets` | `openTickets` |
| `in_progress_tickets` | `inProgressTickets` |
| `on_hold_tickets` | `onHoldTickets` |
| `completed_tickets` | `completedTickets` |
| `dismissed_tickets` | `dismissedTickets` |
| `overdue_tickets` | `overdueTickets` |
| `technician_id` | `technicianId` |
| `technician_name` | `technicianName` |
| `average_resolution_time` | `averageResolutionTime` |
| `category_id` | `categoryId` |
| `category_name` | `categoryName` |
| `department_id` | `departmentId` |
| `department_name` | `departmentName` |
| `ticket_id` | `ticketId` |
| `ticket_title` | `ticketTitle` |
| `due_date` | `dueDate` |
| `actor_name` | `userName` |
| `created_at` | `createdAt` |
