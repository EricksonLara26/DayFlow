# DayFlow frontend data model

Este documento define el modelo de datos canonico del frontend. La aplicacion debe trabajar internamente en `camelCase`; cualquier conversion hacia o desde Django REST Framework debe resolverse en mappers de frontera.

## Convencion general

- El frontend usa `camelCase` para objetos, formularios, estado local, servicios y componentes.
- El backend Django/MySQL probablemente expondra `snake_case`.
- La conversion esperada vive fuera de los componentes, por ejemplo `first_name` -> `firstName` y `created_at` -> `createdAt`.
- No deben convivir dos nombres para el mismo dato dentro del modelo frontend. Ejemplos no permitidos: `firstName` + `nombre`, `role` + `rol`, `department` + `departamento`, `category` + `categoria`, `closedAt` + `completedAt`.

## User

Estructura esperada:

```js
{
  id: 1,
  firstName: "Erickson",
  lastName: "Lara",
  username: "tecnico",
  email: "tecnico@empresa.com",
  role: "TECHNICIAN",
  department: "Soporte Tecnico",
  position: "Tecnico de soporte senior",
  active: true,
  createdAt: "2026-05-23T12:00:00.000Z",
  updatedAt: "2026-05-23T12:00:00.000Z"
}
```

Campos obligatorios:

- `id`: identificador unico.
- `firstName`: nombre.
- `lastName`: apellido.
- `username`: nombre de usuario para autenticacion.
- `email`: correo.
- `role`: rol interno (`ADMINISTRATOR`, `TECHNICIAN`, `EMPLOYEE`).
- `department`: departamento o area.
- `position`: cargo o puesto.
- `active`: estado del usuario.

Campos opcionales:

- `password`: solo para mocks locales de login. No debe formar parte del usuario expuesto por un backend real.
- `createdAt`: fecha de creacion.
- `updatedAt`: fecha de ultima actualizacion.

## Ticket

Estructura esperada:

```js
{
  id: 1001,
  title: "Laptop no enciende",
  description: "El equipo no inicia correctamente.",
  category: "Hardware",
  status: "OPEN",
  priority: "HIGH",
  createdBy: 10,
  assignedTo: null,
  createdAt: "2026-05-12T09:15:00.000Z",
  updatedAt: "2026-05-12T09:15:00.000Z",
  closedAt: null,
  dueDate: "2026-05-15",
  comments: [],
  history: []
}
```

Campos obligatorios:

- `id`: identificador unico.
- `title`: titulo breve.
- `description`: descripcion del problema o solicitud.
- `category`: categoria del ticket.
- `status`: estado (`OPEN`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `DISMISSED`).
- `priority`: prioridad (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `createdBy`: `id` del usuario solicitante.
- `createdAt`: fecha de creacion.
- `updatedAt`: fecha de ultima actualizacion.
- `dueDate`: fecha limite en formato `YYYY-MM-DD`.
- `comments`: lista de comentarios.
- `history`: lista de eventos de historial.

Campos opcionales:

- `assignedTo`: `id` del tecnico asignado o `null`.
- `closedAt`: fecha de cierre cuando el ticket queda completado o desestimado.
- `takenAt`: fecha en que un tecnico toma el ticket.

Nota de demo: los mocks actuales pueden conservar campos de presentacion como `createdByName` y `assignedToName` para no ampliar el alcance visual. La fuente canonica de relacion es `createdBy` y `assignedTo`.

## Category

Estructura esperada:

```js
{
  id: 1,
  name: "Hardware",
  description: "Equipos fisicos y perifericos",
  active: true,
  createdAt: "2026-05-23T12:00:00.000Z",
  updatedAt: "2026-05-23T12:00:00.000Z"
}
```

Campos obligatorios:

- `id`: identificador unico.
- `name`: nombre visible de la categoria.
- `active`: estado de uso.

Campos opcionales:

- `description`: descripcion administrativa.
- `createdAt`: fecha de creacion.
- `updatedAt`: fecha de ultima actualizacion.

## Department

Estructura esperada:

```js
{
  id: 1,
  name: "Tecnologia",
  description: "Area de tecnologia y soporte",
  active: true,
  createdAt: "2026-05-23T12:00:00.000Z",
  updatedAt: "2026-05-23T12:00:00.000Z"
}
```

Campos obligatorios:

- `id`: identificador unico.
- `name`: nombre visible del departamento.
- `active`: estado de uso.

Campos opcionales:

- `description`: descripcion administrativa.
- `createdAt`: fecha de creacion.
- `updatedAt`: fecha de ultima actualizacion.

## TicketHistory

Estructura esperada:

```js
{
  id: 1,
  ticketId: 1001,
  action: "Ticket creado",
  userId: 10,
  userName: "Juan Perez",
  createdAt: "2026-05-12T09:15:00.000Z"
}
```

Campos obligatorios:

- `id`: identificador unico dentro del historial del ticket.
- `action`: descripcion corta de la accion.
- `userId`: `id` del usuario que produjo el evento.
- `createdAt`: fecha del evento.

Campos opcionales:

- `ticketId`: util cuando el historial se aplana para paneles administrativos.
- `userName`: valor de presentacion para la demo. La referencia canonica es `userId`.

## Comment

Estructura esperada:

```js
{
  id: 1,
  ticketId: 1001,
  authorId: 10,
  authorName: "Juan Perez",
  role: "EMPLOYEE",
  message: "Necesito el equipo para cierre de nomina.",
  createdAt: "2026-05-12T09:20:00.000Z"
}
```

Campos obligatorios:

- `id`: identificador unico dentro de los comentarios del ticket.
- `authorId`: `id` del usuario autor.
- `message`: contenido del comentario.
- `createdAt`: fecha de creacion.

Campos opcionales:

- `ticketId`: util cuando los comentarios se consulten fuera del ticket.
- `authorName`: valor de presentacion para la demo. La referencia canonica es `authorId`.
- `role`: rol visible del autor al momento del comentario.

## Evidence

No existe un modelo de evidencia implementado actualmente. Si se agrega, el frontend deberia usar esta estructura:

```js
{
  id: 1,
  ticketId: 1001,
  uploadedBy: 10,
  fileName: "captura-error.png",
  fileUrl: "https://example.com/files/captura-error.png",
  mimeType: "image/png",
  createdAt: "2026-05-12T09:30:00.000Z"
}
```

Campos obligatorios:

- `id`: identificador unico.
- `ticketId`: ticket asociado.
- `uploadedBy`: `id` del usuario que subio la evidencia.
- `fileName`: nombre del archivo.
- `fileUrl`: URL o ruta de descarga.
- `mimeType`: tipo MIME.
- `createdAt`: fecha de carga.

Campos opcionales:

- `description`: descripcion breve de la evidencia.

## Futuro mapper Django

Ejemplo esperado de conversion:

```js
// Backend -> frontend
{
  first_name: "Erickson",
  last_name: "Lara",
  created_at: "2026-05-23T12:00:00.000Z",
  closed_at: null
}

// Frontend
{
  firstName: "Erickson",
  lastName: "Lara",
  createdAt: "2026-05-23T12:00:00.000Z",
  closedAt: null
}
```

Los componentes no deben conocer `snake_case`; solo deben recibir el modelo frontend ya normalizado.
