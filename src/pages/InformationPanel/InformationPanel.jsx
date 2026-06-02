import { CheckCircle2, ClipboardList, Clock3, Eye, PauseCircle, TicketCheck, XCircle } from "lucide-react";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import TechnicianRanking from "../../components/dashboard/TechnicianRanking";
import TechnicianReportPanel from "../../components/reports/TechnicianReportPanel";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { isTechnicianUser } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";
import {
  calculateDashboardStats,
  getCompletedTickets,
  getTicketDemandByDepartment,
  getTechnicianCompletionStats,
  getTicketsExcludingDismissed,
  getTicketVolumeByCategory,
} from "../../utils/ticketUtils";
import "./InformationPanel.css";

function BarInsight({ emptyTitle, eyebrow, items, title }) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));

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
            const width = `${Math.max(10, (item.value / maxValue) * 100)}%`;

            return (
              <div className="bar-row" key={item.label}>
                <span>{item.label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width }}>
                    <strong>{item.value}</strong>
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
  canDownloadReports,
  onAuthorizeReport,
  onOpenTicket,
  tickets,
  users,
}) {
  const technicians = users.filter(isTechnicianUser);
  const stats = calculateDashboardStats(tickets);
  const completedTickets = getCompletedTickets(tickets);
  const reportableTickets = getTicketsExcludingDismissed(tickets);
  const technicianRanking = getTechnicianCompletionStats(technicians, tickets);
  const categoryVolume = getTicketVolumeByCategory(reportableTickets);
  const departmentDemand = getTicketDemandByDepartment(reportableTickets, users);
  const fullHistory = tickets
    .flatMap((ticket) =>
      ticket.history.map((item) => ({
        ...item,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
      })),
    )
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  return (
    <div className="page-stack information-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Información operativa</p>
          <h2>Panel de información</h2>
        </div>
        <strong>{stats.total} tickets</strong>
      </section>

      <section className="stats-grid">
        <StatCard icon={ClipboardList} label="Total" tone="blue" value={stats.total} />
        <StatCard icon={Clock3} label="Abiertos" tone="cyan" value={stats.open} />
        <StatCard icon={TicketCheck} label="En proceso" tone="violet" value={stats.inProgress} />
        <StatCard icon={PauseCircle} label="En hold" tone="red" value={stats.onHold} />
        <StatCard icon={CheckCircle2} label="Completados" tone="green" value={stats.completed} />
        <StatCard icon={XCircle} label="Desestimados" tone="dark" value={stats.dismissed} />
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
          <span>{fullHistory.length}</span>
        </div>
        {fullHistory.length ? (
          <div className="system-history-list">
            {fullHistory.map((item) => (
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
