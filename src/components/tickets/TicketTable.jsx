import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import { getTicketDepartment, getTicketTakenAt } from "../../utils/ticketUtils";
import TicketCard from "./TicketCard";
import TicketPriorityBadge from "./TicketPriorityBadge";
import TicketStatusBadge from "./TicketStatusBadge";

function getTableClassName(mode) {
  if (mode === "administrator") {
    return "data-table administrator-ticket-table";
  }

  if (mode === "employee") {
    return "data-table employee-ticket-table";
  }

  return "data-table";
}

export default function TicketTable({
  canTakeTicket = () => false,
  emptyState,
  mode = "standard",
  onOpenTicket,
  onTakeTicket,
  tickets,
  users = [],
}) {
  if (!tickets.length) {
    return (
      <EmptyState
        title={emptyState?.title ?? "No hay solicitudes con esos filtros"}
        message={emptyState?.message ?? "Ajusta la búsqueda o crea una nueva solicitud de soporte."}
      >
        {emptyState?.action}
      </EmptyState>
    );
  }

  const isAdministratorMode = mode === "administrator";
  const isEmployeeMode = mode === "employee";

  return (
    <>
      <div className="table-wrap ticket-table-wrap">
        <table className={getTableClassName(mode)}>
          {isAdministratorMode ? (
            <thead>
              <tr>
                <th>ID ticket</th>
                <th>Título o descripción</th>
                <th>Usuario solicitante</th>
                <th>Departamento</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Técnico asignado</th>
                <th>Fecha de creación</th>
                <th>Fecha tomada</th>
                <th>Fecha finalización</th>
                <th>Acciones</th>
              </tr>
            </thead>
          ) : isEmployeeMode ? (
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Categoría</th>
                <th>Técnico asignado</th>
                <th>Creación</th>
                <th>Fecha límite</th>
                <th>Última actualización</th>
                <th>Acciones</th>
              </tr>
            </thead>
          ) : (
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Solicitante</th>
                <th>Técnico</th>
                <th>Estado</th>
                <th>Prioridad</th>
                <th>Fecha límite</th>
                <th>Acciones</th>
              </tr>
            </thead>
          )}
          <tbody>
            {tickets.map((ticket) => {
              const takenAt = getTicketTakenAt(ticket);

              if (isAdministratorMode) {
                return (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>
                      <button className="table-title-button" type="button" onClick={() => onOpenTicket(ticket.id)}>
                        <strong>{ticket.title}</strong>
                        <span>{ticket.description}</span>
                      </button>
                    </td>
                    <td>{ticket.createdByName}</td>
                    <td>{getTicketDepartment(ticket, users)}</td>
                    <td>{ticket.category}</td>
                    <td>
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td>{ticket.assignedToName ?? "Sin asignar"}</td>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                    <td>{takenAt ? formatDateTime(takenAt) : "Sin tomar"}</td>
                    <td>{ticket.closedAt ? formatDateTime(ticket.closedAt) : "Pendiente"}</td>
                    <td>
                      <Button variant="ghost" onClick={() => onOpenTicket(ticket.id)}>
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                );
              }

              if (isEmployeeMode) {
                return (
                  <tr key={ticket.id}>
                    <td>#{ticket.id}</td>
                    <td>
                      <button className="table-title-button" type="button" onClick={() => onOpenTicket(ticket.id)}>
                        <strong>{ticket.title}</strong>
                        <span>{ticket.description}</span>
                      </button>
                    </td>
                    <td>
                      <TicketStatusBadge status={ticket.status} />
                    </td>
                    <td>
                      <TicketPriorityBadge priority={ticket.priority} />
                    </td>
                    <td>{ticket.category}</td>
                    <td>{ticket.assignedToName ?? "Sin asignar"}</td>
                    <td>{formatDateTime(ticket.createdAt)}</td>
                    <td>{formatDate(ticket.dueDate)}</td>
                    <td>{formatDateTime(ticket.updatedAt)}</td>
                    <td>
                      <Button variant="ghost" onClick={() => onOpenTicket(ticket.id)}>
                        Ver detalle
                      </Button>
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={ticket.id}>
                  <td>
                    <button className="table-title-button" type="button" onClick={() => onOpenTicket(ticket.id)}>
                      <span>#{ticket.id}</span>
                      <strong>{ticket.title}</strong>
                    </button>
                  </td>
                  <td>{ticket.createdByName}</td>
                  <td>{ticket.assignedToName ?? "Sin asignar"}</td>
                  <td>
                    <TicketStatusBadge status={ticket.status} />
                  </td>
                  <td>
                    <TicketPriorityBadge priority={ticket.priority} />
                  </td>
                  <td>{formatDate(ticket.dueDate)}</td>
                  <td>
                    <div className="inline-actions">
                      {canTakeTicket(ticket) ? (
                        <Button variant="soft" onClick={() => onTakeTicket(ticket.id)}>
                          Tomar ticket
                        </Button>
                      ) : null}
                      <Button variant="ghost" onClick={() => onOpenTicket(ticket.id)}>
                        Ver detalle
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ticket-card-grid">
        {tickets.map((ticket) => (
          <TicketCard
            canTakeTicket={canTakeTicket}
            key={ticket.id}
            mode={mode}
            onOpen={onOpenTicket}
            onTakeTicket={onTakeTicket}
            ticket={ticket}
          />
        ))}
      </div>
    </>
  );
}
