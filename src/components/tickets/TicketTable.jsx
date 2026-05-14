import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import { formatDate } from "../../utils/dateUtils";
import TicketCard from "./TicketCard";
import TicketPriorityBadge from "./TicketPriorityBadge";
import TicketStatusBadge from "./TicketStatusBadge";

export default function TicketTable({ canTakeTicket, onOpenTicket, onTakeTicket, tickets }) {
  if (!tickets.length) {
    return (
      <EmptyState
        title="No hay solicitudes con esos filtros"
        message="Ajusta la busqueda o crea una nueva solicitud de soporte."
      />
    );
  }

  return (
    <>
      <div className="table-wrap ticket-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Solicitante</th>
              <th>Tecnico</th>
              <th>Estado</th>
              <th>Prioridad</th>
              <th>Fecha limite</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="ticket-card-grid">
        {tickets.map((ticket) => (
          <TicketCard
            canTakeTicket={canTakeTicket}
            key={ticket.id}
            onOpen={onOpenTicket}
            onTakeTicket={onTakeTicket}
            ticket={ticket}
          />
        ))}
      </div>
    </>
  );
}
