# Dashboard API contracts

Este documento define los contratos que el frontend de DayFlow espera recibir cuando el dashboard se conecte a Django REST Framework.

La aplicacion trabaja internamente en `camelCase`. Si DRF expone `snake_case`, la conversion debe resolverse en mappers de frontera, antes de entregar datos a servicios/componentes.

## Estado actual

- No hay `fetch` real implementado para dashboard.
- Los mocks siguen siendo la fuente interna temporal.
- `src/services/dashboardService.js` prepara los agregados con la forma esperada para backend.
- Los componentes visuales no deben contar tickets para construir metricas del dashboard.

## Resumen general

```js
{
  totalTickets: 20,
  openTickets: 1,
  inProgressTickets: 1,
  onHoldTickets: 1,
  completedTickets: 13,
  dismissedTickets: 4,
  overdueTickets: 3
}
```

Campos:

- `totalTickets`: total de tickets del scope solicitado.
- `openTickets`: tickets en estado `OPEN`.
- `inProgressTickets`: tickets en estado `IN_PROGRESS`.
- `onHoldTickets`: tickets en estado `ON_HOLD`.
- `completedTickets`: tickets en estado `COMPLETED`.
- `dismissedTickets`: tickets en estado `DISMISSED`.
- `overdueTickets`: tickets activos con `dueDate` vencida.

## Ranking tecnico

```js
[
  {
    technicianId: 1,
    technicianName: "Erickson Lara",
    completedTickets: 4,
    averageResolutionTime: 135
  }
]
```

Campos:

- `technicianId`: identificador del tecnico.
- `technicianName`: nombre listo para mostrar.
- `completedTickets`: cantidad de tickets completados. No debe contar tickets abiertos, en proceso, en hold ni desestimados.
- `averageResolutionTime`: promedio de resolucion en minutos. Puede ser `null` si no aplica o no hay fechas suficientes.

Orden esperado:

- Descendente por `completedTickets`.
- Ascendente por `technicianName` en empates.

## Tickets por categoria

```js
[
  {
    categoryId: 3,
    categoryName: "Hardware",
    total: 4
  }
]
```

Campos:

- `categoryId`: identificador de categoria o `null` si no existe referencia.
- `categoryName`: nombre visible de categoria.
- `total`: cantidad de tickets de la categoria.

Regla actual:

- Los tickets `DISMISSED` no se incluyen en este grafico.

## Demanda por departamento

```js
[
  {
    departmentId: 3,
    departmentName: "Administracion",
    total: 5
  }
]
```

Campos:

- `departmentId`: identificador del departamento o `null` si no existe referencia.
- `departmentName`: nombre visible del departamento.
- `total`: cantidad de tickets solicitados por el departamento.

Regla actual:

- Los tickets `DISMISSED` no se incluyen en este grafico.

## Vencimientos

```js
[
  {
    ticketId: 1001,
    title: "Laptop no enciende despues de actualizacion",
    dueDate: "2026-06-07",
    status: "OPEN",
    priority: "HIGH"
  }
]
```

Campos:

- `ticketId`: identificador del ticket.
- `title`: titulo listo para mostrar.
- `dueDate`: fecha limite en formato `YYYY-MM-DD`.
- `status`: estado interno del ticket.
- `priority`: prioridad interna del ticket.

Regla actual:

- La vista muestra tickets no terminales que vencen entre 1 y 3 dias desde la fecha actual.

## Historico

```js
[
  {
    period: "2026-05",
    created: 12,
    completed: 8,
    dismissed: 2
  }
]
```

Campos:

- `period`: periodo agregado. Formato actual esperado: `YYYY-MM`.
- `created`: tickets creados en el periodo.
- `completed`: tickets completados en el periodo.
- `dismissed`: tickets desestimados en el periodo.

## Estados de respuesta esperados

Cuando se conecte API real, el servicio deberia poder representar:

- `loading`: solicitud en curso.
- `error`: fallo de red, permisos o validacion de backend.
- `empty`: respuesta valida sin elementos.
- `success`: datos agregados listos para componentes.

Los componentes actuales ya reciben `summary`, `technicianRanking`, `categoryVolume`, `departmentDemand`, `dueTickets` y `activityHistory` como datos preparados.

## Servicios frontend relacionados

- `getSummarySnapshot`
- `getTechnicianRankingSnapshot`
- `getTicketsByCategorySnapshot`
- `getDemandByDepartmentSnapshot`
- `getDueTicketsSnapshot`
- `getHistoricalSnapshot`
- `getActivityHistorySnapshot`

Estos servicios conservan mocks por ahora y son el punto natural para reemplazar snapshots locales por clientes DRF en una etapa posterior.
