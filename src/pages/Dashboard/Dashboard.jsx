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
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { formatDate } from "../../utils/dateUtils";
import { calculateDashboardStats, getTicketsDueInThreeDays } from "../../utils/ticketUtils";
import "./Dashboard.css";

export default function Dashboard({ onOpenTicket, scope = "administrator", technicianRanking = [], tickets }) {
  const stats = calculateDashboardStats(tickets);
  const dueSoonTickets = getTicketsDueInThreeDays(tickets);
  const isTechnicianScope = scope === "technician";
  const isEmployeeScope = scope === "employee";
  const isAdministratorScope = scope === "administrator";

  return (
    <div className="page-stack dashboard-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">
            {isTechnicianScope ? "Operación técnica" : isEmployeeScope ? "Panel de empleado" : "Monitoreo administrativo"}
          </p>
          <h2>
            {isTechnicianScope
              ? "Solicitudes disponibles y asignadas"
              : isEmployeeScope
                ? "Estado de tus solicitudes"
                : "Dashboard general del sistema"}
          </h2>
        </div>
        <strong>{stats.total}</strong>
      </section>

      <section className="stats-grid">
        <StatCard
          icon={ClipboardList}
          label={isTechnicianScope ? "Solicitudes gestionables" : isEmployeeScope ? "Mis solicitudes" : "Total de solicitudes"}
          tone="blue"
          value={stats.total}
        />
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
            <EmptyState title="Sin vencimientos cercanos" message="No hay solicitudes activas que venzan entre 24 horas y 3 dias." />
          )}
        </section>
      </div>

      {isAdministratorScope ? <TechnicianRanking technicians={technicianRanking} /> : null}
    </div>
  );
}
