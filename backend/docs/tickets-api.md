# API de tickets de DayFlow

Base: `/api/v1/tickets/`. Todas las rutas requieren JWT y haber completado
el cambio obligatorio de contraseña.

## Listado y scopes

`GET /api/v1/tickets/` devuelve paginación estándar.

Filtros:

- `query`: título, descripción, categoría, solicitante o técnico.
- `status`: `OPEN`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `DISMISSED`.
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
- `created_from` y `created_to`: fecha ISO `YYYY-MM-DD`, inclusivas.
- `due_soon=true`: tickets no terminales que vencen entre 1 y 3 días.

Scopes del técnico:

- `scope=all`: vista general actual.
- `scope=available`: `OPEN` sin técnico.
- `scope=mine`: asignados al técnico y no terminales.
- `scope=history`: asignados al técnico y terminales.

El administrador ve todos los tickets. El empleado siempre queda restringido
a sus propios tickets, aunque envíe otro scope.

## Creación y detalle

- `POST /api/v1/tickets/`: solo empleado.
- `GET /api/v1/tickets/{id}/`: respeta el scope por rol.

Creación:

```json
{
  "title": "Equipo sin conexión",
  "description": "Descripción del problema",
  "category": 3,
  "priority": "HIGH",
  "due_date": "2026-07-30"
}
```

El solicitante siempre es el usuario autenticado. El departamento se captura
desde su perfil. El ticket nace `OPEN` y genera historial `CREATED`.

## Acciones

- `POST {id}/take/`: un técnico toma un ticket `OPEN` sin asignar.
- `POST {id}/assign/`: un administrador asigna o reasigna un técnico activo.
- `POST {id}/status/`: un técnico autorizado cambia el estado.
- `POST {id}/comments/`: agrega un comentario.
- `POST {id}/attachments/`: carga un adjunto multipart.
- `GET {id}/history/`: historial paginado con `changes` de solo lectura.
- `GET {id}/attachments/{attachment_id}/download/`: descarga protegida.

Toma y asignación usan transacción y bloqueo `select_for_update`. Si otro
técnico tomó el ticket primero, la segunda operación devuelve `409`.

`COMPLETED` y `DISMISSED` establecen `closed_at`. `ON_HOLD`, `OPEN` e
`IN_PROGRESS` mantienen `closed_at=null`.

## Adjuntos

Tamaño máximo predeterminado: 10 MB, configurable mediante
`TICKET_ATTACHMENT_MAX_MB`.

Tipos permitidos:

- PDF;
- PNG, JPEG y WEBP;
- TXT y CSV UTF-8;
- DOCX y XLSX.

Se valida tamaño, pareja extensión/MIME y contenido básico. La API nunca
expone `storage_path`; entrega una URL de descarga que vuelve a comprobar
los permisos del ticket.

No existen rutas de modificación libre para comentarios, historial,
`TicketHistoryChange` o adjuntos. Tampoco existe borrado físico de tickets.
