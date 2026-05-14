import { CalendarDays, UserRound } from "lucide-react";
import Button from "../common/Button";
import { TICKET_STATUSES } from "../../data/tickets";
import { formatDate } from "../../utils/dateUtils";
import TicketPriorityBadge from "./TicketPriorityBadge";
import TicketStatusBadge from "./TicketStatusBadge";

export default function TicketCard({ canTakeTicket, onOpen, onTakeTicket, ticket }) {
  return (
    <article className={`ticket-card ${ticket.status === TICKET_STATUSES.ON_HOLD ? "ticket-card-alert" : ""}`}>
      <div className="ticket-card-header">
        <span>#{ticket.id}</span>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <h3>{ticket.title}</h3>
      <p>{ticket.description}</p>
      <div className="ticket-card-meta">
        <span>
          <UserRound size={15} aria-hidden="true" />
          {ticket.assignedToName ?? "Sin asignar"}
        </span>
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          {formatDate(ticket.dueDate)}
        </span>
      </div>
      <div className="ticket-card-footer">
        <TicketPriorityBadge priority={ticket.priority} />
        <div className="inline-actions">
          {canTakeTicket(ticket) ? (
            <Button variant="soft" onClick={() => onTakeTicket(ticket.id)}>
              Tomar
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => onOpen(ticket.id)}>
            Ver
          </Button>
        </div>
      </div>
    </article>
  );
}
