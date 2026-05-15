import { Download, Eye } from "lucide-react";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import TechnicianRanking from "../../components/dashboard/TechnicianRanking";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { isTechnicianUser } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";
import {
  calculateDashboardStats,
  getCompletedTickets,
  getTechnicianCompletionStats,
  getTicketDemandByDepartment,
  getTicketsExcludingDismissed,
  getTicketVolumeByCategory,
} from "../../utils/ticketUtils";
import "./InformationPanel.css";

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

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
        <EmptyState title={emptyTitle} message="No hay informacion suficiente para mostrar este grafico." />
      )}
    </section>
  );
}

export default function InformationPanel({ onOpenTicket, tickets, users }) {
  const technicians = users.filter(isTechnicianUser);
  const stats = calculateDashboardStats(tickets);
  const completedTickets = getCompletedTickets(tickets);
  const reportableTickets = getTicketsExcludingDismissed(tickets);
  const technicianRanking = getTechnicianCompletionStats(technicians, tickets);
  const categoryVolume = getTicketVolumeByCategory(reportableTickets);
  const departmentDemand = getTicketDemandByDepartment(reportableTickets, users);

  function downloadReport() {
    const rows = [
      ["DayFlow - informe operativo"],
      ["Generado", new Date().toLocaleString()],
      [],
      ["Resumen"],
      ["Total de solicitudes", stats.total],
      ["Abiertos", stats.open],
      ["En proceso", stats.inProgress],
      ["En hold", stats.onHold],
      ["Completados", stats.completed],
      ["Desestimados", stats.dismissed],
      [],
      ["Ranking por tecnico"],
      ["Tecnico", "Completados"],
      ...technicianRanking
        .filter((technician) => (technician.completedTickets ?? 0) > 0)
        .map((technician) => [
          `${technician.firstName} ${technician.lastName}`,
          technician.completedTickets ?? 0,
        ]),
      [],
      ["Solicitudes completadas"],
      ["ID", "Titulo", "Categoria", "Tecnico", "Fecha de cierre"],
      ...completedTickets.map((ticket) => [
        ticket.id,
        ticket.title,
        ticket.category,
        ticket.assignedToName ?? "Sin asignar",
        ticket.completedAt ? formatDateTime(ticket.completedAt) : "",
      ]),
      [],
      ["Volumen por categoria"],
      ["Categoria", "Solicitudes"],
      ...categoryVolume.map((item) => [item.label, item.value]),
      [],
      ["Demanda por departamento"],
      ["Departamento", "Solicitudes"],
      ...departmentDemand.map((item) => [item.label, item.value]),
    ];
    const blob = new Blob([buildCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dayflow-informe-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page-stack information-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Informacion operativa</p>
          <h2>Panel de informacion</h2>
        </div>
        <Button icon={Download} onClick={downloadReport}>
          Descargar informe
        </Button>
      </section>

      <div className="information-grid">
        <TechnicianRanking technicians={technicianRanking} />
        <BarInsight
          emptyTitle="Sin volumen por categoria"
          eyebrow="Volumen"
          items={categoryVolume}
          title="Solicitudes por categoria"
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
              <h2>Gestion de cierres</h2>
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
                      #{ticket.id} - {ticket.assignedToName ?? "Sin asignar"} - {formatDateTime(ticket.completedAt)}
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
              message="Las solicitudes cerradas se mostraran aqui para consulta y exportacion."
            />
          )}
        </section>
      </div>
    </div>
  );
}
