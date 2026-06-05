import {
  CheckCircle2,
  ClipboardList,
  Clock3,
  PauseCircle,
  TicketCheck,
  XCircle,
} from "lucide-react";
import StatCard from "../../components/dashboard/StatCard";
import TechnicianRanking from "../../components/dashboard/TechnicianRanking";
import TicketStatusSummary from "../../components/dashboard/TicketStatusSummary";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { formatDate } from "../../utils/dateUtils";
import "./Dashboard.css";

const emptySummary = {
  totalTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  onHoldTickets: 0,
  completedTickets: 0,
  dismissedTickets: 0,
  overdueTickets: 0,
};

export default function Dashboard({
  dueTickets,
  error = "",
  isLoading = false,
  onOpenTicket,
  onRetry,
  scope = "administrator",
  summary,
  technicianRanking = [],
}) {
  const stats = summary ?? emptySummary;
  const dueSoonTickets = dueTickets ?? [];
  const isTechnicianScope = scope === "technician";
  const isEmployeeScope = scope === "employee";
  const isAdministratorScope = scope === "administrator";

  if (isLoading) {
    return (
      <div className="page-stack dashboard-page">
        <LoadingState title="Cargando dashboard" message="Estamos preparando los indicadores operativos." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack dashboard-page">
        <ErrorState title="No se pudo cargar el dashboard" message={error} onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="page-stack dashboard-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">
            {isTechnicianScope ? "Operación técnica" : isEmployeeScope ? "Panel de usuario" : "Monitoreo administrativo"}
          </p>
          <h2>
            {isTechnicianScope
              ? "Solicitudes disponibles y asignadas"
              : isEmployeeScope
                ? "Estado de tus solicitudes"
                : "Dashboard general del sistema"}
          </h2>
        </div>
        <strong>{stats.totalTickets}</strong>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={ClipboardList}
          label={isTechnicianScope ? "Solicitudes gestionables" : isEmployeeScope ? "Mis solicitudes" : "Total de solicitudes"}
          tone="blue"
          value={stats.totalTickets}
        />
        <StatCard icon={Clock3} label="Abiertos" tone="cyan" value={stats.openTickets} />
        <StatCard icon={TicketCheck} label="En proceso" tone="violet" value={stats.inProgressTickets} />
        <StatCard icon={PauseCircle} label="En hold" tone="red" value={stats.onHoldTickets} />
        <StatCard icon={CheckCircle2} label="Completados" tone="green" value={stats.completedTickets} />
        <StatCard icon={XCircle} label="Desestimados" tone="dark" value={stats.dismissedTickets} />
      </section>

      <div className="dashboard-grid">
        <TicketStatusSummary stats={stats} />
        <section className="panel due-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Vista de vencimientos</p>
              <h2>Solicitudes próximas a vencer</h2>
            </div>
          </div>
          {dueSoonTickets.length ? (
            <div className="due-ticket-list">
              {dueSoonTickets.map((ticket) => (
                <article className="due-ticket" key={ticket.ticketId}>
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>#{ticket.ticketId} - vence {formatDate(ticket.dueDate)}</span>
                  </div>
                  <div className="inline-actions">
                    <TicketStatusBadge status={ticket.status} />
                    <TicketPriorityBadge priority={ticket.priority} />
                    <Button variant="ghost" onClick={() => onOpenTicket(ticket.ticketId)}>
                      Ver
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin vencimientos cercanos" message="No hay solicitudes activas que venzan entre 24 horas y 3 dias." />
          )}
        </section>
      </div>

      {isAdministratorScope ? <TechnicianRanking technicians={technicianRanking} /> : null}
    </div>
  );
}
