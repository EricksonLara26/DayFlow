import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  PauseCircle,
  TicketCheck,
  XCircle,
} from "lucide-react";
import StatCard from "../../components/dashboard/StatCard";
import TicketStatusSummary from "../../components/dashboard/TicketStatusSummary";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { formatDate } from "../../utils/dateUtils";
import { calculateDashboardStats, getTicketsDueInThreeDays } from "../../utils/ticketUtils";
import "./Dashboard.css";

export default function Dashboard({ onOpenTicket, tickets }) {
  const stats = calculateDashboardStats(tickets);
  const dueSoonTickets = getTicketsDueInThreeDays(tickets);

  return (
    <div className="page-stack dashboard-page">
      <section className="stats-grid">
        <StatCard icon={ClipboardList} label="Total de solicitudes" tone="blue" value={stats.total} />
        <StatCard icon={Clock3} label="Abiertos" tone="cyan" value={stats.open} />
        <StatCard icon={TicketCheck} label="En proceso" tone="violet" value={stats.inProgress} />
        <StatCard icon={PauseCircle} label="En hold" tone="red" value={stats.onHold} />
        <StatCard icon={CheckCircle2} label="Completados" tone="green" value={stats.completed} />
        <StatCard icon={XCircle} label="Desestimados" tone="dark" value={stats.dismissed} />
      </section>

      <div className="dashboard-grid">
        <TicketStatusSummary stats={stats} />
        <section className="panel due-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Vista de vencimientos</p>
              <h2>Solicitudes proximas a vencer</h2>
            </div>
          </div>
          {dueSoonTickets.length ? (
            <div className="due-ticket-list">
              {dueSoonTickets.map((ticket) => (
                <article className="due-ticket" key={ticket.id}>
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>{ticket.createdByName} - vence {formatDate(ticket.dueDate)}</span>
                  </div>
                  <div className="inline-actions">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                    <Button variant="ghost" onClick={() => onOpenTicket(ticket.id)}>
                      Ver
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin vencimientos cercanos" message="No hay solicitudes activas que venzan en 3 dias." />
          )}
        </section>
      </div>
    </div>
  );
}
