import { CheckCircle2, ClipboardList, Clock3, Eye, PauseCircle, TicketCheck, XCircle } from "lucide-react";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import TechnicianRanking from "../../components/dashboard/TechnicianRanking";
import TechnicianReportPanel from "../../components/reports/TechnicianReportPanel";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { formatDateTime } from "../../utils/dateUtils";
import { getCompletedTickets } from "../../utils/ticketUtils";
import "./InformationPanel.css";

const emptySummary = {
  totalTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  onHoldTickets: 0,
  completedTickets: 0,
  dismissedTickets: 0,
  overdueTickets: 0,
};

function getInsightLabel(item) {
  return item.categoryName ?? item.departmentName ?? item.label;
}

function getInsightValue(item) {
  return item.total ?? item.value ?? 0;
}

function BarInsight({ emptyTitle, eyebrow, items, title }) {
  const maxValue = Math.max(1, ...items.map(getInsightValue));

  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {items.length ? (
        <div className="bar-chart">
          {items.map((item) => {
            const label = getInsightLabel(item);
            const value = getInsightValue(item);
            const width = `${Math.max(10, (value / maxValue) * 100)}%`;

            return (
              <div className="bar-row" key={label}>
                <span>{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width }}>
                    <strong>{value}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState title={emptyTitle} message="No hay información suficiente para mostrar este gráfico." />
      )}
    </section>
  );
}

export default function InformationPanel({
  activityHistory = [],
  canDownloadReports,
  categoryVolume = [],
  departmentDemand = [],
  onAuthorizeReport,
  onOpenTicket,
  summary,
  technicianRanking = [],
  tickets,
  users,
}) {
  const stats = summary ?? emptySummary;
  const completedTickets = getCompletedTickets(tickets);

  return (
    <div className="page-stack information-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Información operativa</p>
          <h2>Panel de información</h2>
        </div>
        <strong>{stats.totalTickets} tickets</strong>
      </section>

      <section className="stats-grid">
        <StatCard icon={ClipboardList} label="Total" tone="blue" value={stats.totalTickets} />
        <StatCard icon={Clock3} label="Abiertos" tone="cyan" value={stats.openTickets} />
        <StatCard icon={TicketCheck} label="En proceso" tone="violet" value={stats.inProgressTickets} />
        <StatCard icon={PauseCircle} label="En hold" tone="red" value={stats.onHoldTickets} />
        <StatCard icon={CheckCircle2} label="Completados" tone="green" value={stats.completedTickets} />
        <StatCard icon={XCircle} label="Desestimados" tone="dark" value={stats.dismissedTickets} />
      </section>

      <div className="information-grid">
        <TechnicianRanking technicians={technicianRanking} />
        <BarInsight
          emptyTitle="Sin volumen por categoría"
          eyebrow="Volumen"
          items={categoryVolume}
          title="Solicitudes por categoría"
        />
      </div>

      <div className="information-grid">
        <BarInsight
          emptyTitle="Sin demanda por departamento"
          eyebrow="Demanda"
          items={departmentDemand}
          title="Solicitudes por departamento"
        />
        <section className="panel completed-management">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Solicitudes completadas</p>
              <h2>Gestión de cierres</h2>
            </div>
            <span>{completedTickets.length}</span>
          </div>
          {completedTickets.length ? (
            <div className="completed-list">
              {completedTickets.map((ticket) => (
                <article className="completed-item" key={ticket.id}>
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>
                      #{ticket.id} - {ticket.assignedToName ?? "Sin asignar"} - {formatDateTime(ticket.closedAt)}
                    </span>
                  </div>
                  <TicketStatusBadge status={ticket.status} />
                  <TicketPriorityBadge priority={ticket.priority} />
                  <Button icon={Eye} variant="ghost" onClick={() => onOpenTicket(ticket.id)}>
                    Ver
                  </Button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Sin solicitudes completadas"
              message="Las solicitudes cerradas se mostrarán aquí para consulta y exportación."
            />
          )}
        </section>
      </div>

      <section className="panel system-history-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Historial completo</p>
            <h2>Actividad general del sistema</h2>
          </div>
          <span>{activityHistory.length}</span>
        </div>
        {activityHistory.length ? (
          <div className="system-history-list">
            {activityHistory.map((item) => (
              <article className="system-history-item" key={`${item.ticketId}-${item.id}-${item.createdAt}`}>
                <div>
                  <strong>{item.action}</strong>
                  <span>
                    #{item.ticketId} - {item.ticketTitle}
                  </span>
                </div>
                <span>{item.userName}</span>
                <time>{formatDateTime(item.createdAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Sin historial" message="Las acciones del sistema se mostrarán aquí." />
        )}
      </section>

      {canDownloadReports ? (
        <TechnicianReportPanel
          onAuthorizeReport={onAuthorizeReport}
          tickets={tickets}
          users={users}
        />
      ) : null}
    </div>
  );
}
