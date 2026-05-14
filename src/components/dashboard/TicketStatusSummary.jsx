import { TICKET_STATUSES } from "../../data/tickets";
import { getStatusLabel } from "../../utils/ticketUtils";
import TicketStatusBadge from "../tickets/TicketStatusBadge";

const statusStatMap = [
  ["open", TICKET_STATUSES.OPEN],
  ["inProgress", TICKET_STATUSES.IN_PROGRESS],
  ["onHold", TICKET_STATUSES.ON_HOLD],
  ["completed", TICKET_STATUSES.COMPLETED],
  ["dismissed", TICKET_STATUSES.DISMISSED],
];

export default function TicketStatusSummary({ stats }) {
  return (
    <section className="panel status-summary">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Estado actual</p>
          <h2>Resumen de tickets</h2>
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
