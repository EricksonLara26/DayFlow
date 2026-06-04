import { TICKET_STATUSES } from "../../data/tickets";
import { getStatusLabel } from "../../utils/ticketUtils";
import TicketStatusBadge from "../tickets/TicketStatusBadge";

const statusStatMap = [
  ["openTickets", TICKET_STATUSES.OPEN],
  ["inProgressTickets", TICKET_STATUSES.IN_PROGRESS],
  ["onHoldTickets", TICKET_STATUSES.ON_HOLD],
  ["completedTickets", TICKET_STATUSES.COMPLETED],
  ["dismissedTickets", TICKET_STATUSES.DISMISSED],
];

export default function TicketStatusSummary({ stats }) {
  return (
    <section className="panel status-summary">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Vista de estado actual</p>
          <h2>Resumen de solicitudes</h2>
        </div>
      </div>
      <div className="status-summary-list">
        {statusStatMap.map(([key, status]) => (
          <div className="status-summary-row" key={status}>
            <TicketStatusBadge status={status} />
            <span>{getStatusLabel(status)}</span>
            <strong>{stats[key]}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
