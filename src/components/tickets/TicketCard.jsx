import { CalendarDays, Clock3, Tag, UserRound } from "lucide-react";
import Button from "../common/Button";
import { TICKET_STATUSES } from "../../data/tickets";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import TicketPriorityBadge from "./TicketPriorityBadge";
import TicketStatusBadge from "./TicketStatusBadge";

export default function TicketCard({ canTakeTicket = () => false, mode = "standard", onOpen, onTakeTicket, ticket }) {
  const isEmployeeMode = mode === "employee";

  return (
    <article className={`ticket-card ${ticket.status === TICKET_STATUSES.ON_HOLD ? "ticket-card-alert" : ""}`}>
      <div className="ticket-card-header">
        <span>#{ticket.id}</span>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <h3>{ticket.title}</h3>
      <p>{ticket.description}</p>
      <div className="ticket-card-meta">
        {isEmployeeMode ? (
          <>
            <span>
              <Tag size={15} aria-hidden="true" />
              {ticket.category}
            </span>
            <span>
              <UserRound size={15} aria-hidden="true" />
              Técnico: {ticket.assignedToName ?? "Sin asignar"}
            </span>
            <span>
              <Clock3 size={15} aria-hidden="true" />
              Creado: {formatDateTime(ticket.createdAt)}
            </span>
            <span>
              <Clock3 size={15} aria-hidden="true" />
              Actualizado: {formatDateTime(ticket.updatedAt)}
            </span>
          </>
        ) : (
          <span>
            <UserRound size={15} aria-hidden="true" />
            {ticket.assignedToName ?? "Sin asignar"}
          </span>
        )}
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          Fecha límite: {formatDate(ticket.dueDate)}
        </span>
      </div>
      <div className="ticket-card-footer">
        <TicketPriorityBadge priority={ticket.priority} />
        <div className="inline-actions">
          {!isEmployeeMode && canTakeTicket(ticket) ? (
            <Button variant="soft" onClick={() => onTakeTicket(ticket.id)}>
              Tomar
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onOpen(ticket.id)}>
            Ver detalle
          </Button>
        </div>
      </div>
    </article>
  );
}
