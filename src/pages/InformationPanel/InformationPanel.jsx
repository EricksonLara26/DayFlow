import { CheckCircle2, ClipboardList, Clock3, Download, Eye, PauseCircle, TicketCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import StatCard from "../../components/dashboard/StatCard";
import TechnicianRanking from "../../components/dashboard/TechnicianRanking";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge";
import { isTechnicianUser } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";
import {
  calculateDashboardStats,
  getCompletedTickets,
  getCompletedTicketsByTechnicianAndYear,
  getStatusLabel,
  getTechnicianCompletionStats,
  getTicketDemandByDepartment,
  getTicketDepartment,
  getTicketResolutionTime,
  getTicketTakenAt,
  getTicketsExcludingDismissed,
  getTicketVolumeByCategory,
} from "../../utils/ticketUtils";
import { downloadXlsx } from "../../utils/xlsxExporter";
import "./InformationPanel.css";

function safeFilenameText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .trim();
}

function getReportYears(tickets) {
  const years = new Set(
    tickets
      .filter((ticket) => ticket.closedAt)
      .map((ticket) => new Date(ticket.closedAt).getFullYear())
      .filter((year) => !Number.isNaN(year)),
  );

  years.add(new Date().getFullYear());

  return [...years].sort((first, second) => second - first);
}

function buildReportRows({ reportTickets, selectedTechnician, selectedYear, users }) {
  return [
    [`Informe ${selectedYear}`],
    ["Técnico", `${selectedTechnician.firstName} ${selectedTechnician.lastName}`],
    ["Generado", new Date().toLocaleString()],
    [],
    [
      "ID ticket",
      "Título o descripción",
      "Categoría",
      "Departamento",
      "Usuario solicitante",
      "Técnico responsable",
      "Fecha creación",
      "Fecha tomada",
      "Fecha finalización",
      "Estado",
      "Tiempo resolución",
    ],
    ...reportTickets.map((ticket) => {
      const takenAt = getTicketTakenAt(ticket);

      return [
        ticket.id,
        ticket.title || ticket.description,
        ticket.category,
        getTicketDepartment(ticket, users),
        ticket.createdByName,
        ticket.assignedToName ?? "Sin asignar",
        formatDateTime(ticket.createdAt),
        takenAt ? formatDateTime(takenAt) : "Sin tomar",
        formatDateTime(ticket.closedAt),
        getStatusLabel(ticket.status),
        getTicketResolutionTime(ticket),
      ];
    }),
  ];
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
  const reportYears = getReportYears(tickets);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(String(technicians[0]?.id ?? ""));
  const [selectedYear, setSelectedYear] = useState(String(reportYears[0] ?? new Date().getFullYear()));
  const [reportError, setReportError] = useState("");
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
  const selectedTechnician = technicians.find((technician) => String(technician.id) === selectedTechnicianId);
  const reportTickets = useMemo(
    () =>
      selectedTechnician
        ? getCompletedTicketsByTechnicianAndYear(tickets, selectedTechnician.id, selectedYear)
        : [],
    [selectedTechnician, selectedYear, tickets],
  );

  function handleDownloadReport() {
    setReportError("");
    const authorization = onAuthorizeReport({ technicianId: selectedTechnicianId, year: selectedYear });

    if (!authorization.ok) {
      setReportError(authorization.message);
      return;
    }

    if (!selectedTechnician || !reportTickets.length) {
      setReportError("Este técnico no tiene solicitudes completadas en el año seleccionado.");
      return;
    }

    const technicianName = `${selectedTechnician.firstName}${selectedTechnician.lastName}`;
    const filename = `informe_tecnico_${safeFilenameText(technicianName)}_${selectedYear}.xlsx`;
    const rows = buildReportRows({ reportTickets, selectedTechnician, selectedYear, users });

    downloadXlsx(rows, filename, `Informe ${selectedYear}`);
  }

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
        <section className="panel report-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Descargar informe</p>
              <h2>Informe anual por técnico</h2>
            </div>
            <Button icon={Download} onClick={handleDownloadReport}>
              Descargar Excel
            </Button>
          </div>

          <div className="report-controls">
            <label className="field compact-field">
              <span>Técnico</span>
              <select value={selectedTechnicianId} onChange={(event) => setSelectedTechnicianId(event.target.value)}>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.firstName} {technician.lastName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field compact-field">
              <span>Año</span>
              <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                {reportYears.map((year) => (
                  <option key={year} value={year}>
                    Informe {year}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {reportError ? <p className="form-error">{reportError}</p> : null}

          {reportTickets.length ? (
            <div className="table-wrap report-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID ticket</th>
                    <th>Título o descripción</th>
                    <th>Categoría</th>
                    <th>Departamento</th>
                    <th>Usuario solicitante</th>
                    <th>Técnico responsable</th>
                    <th>Fecha creación</th>
                    <th>Fecha tomada</th>
                    <th>Fecha finalización</th>
                    <th>Estado</th>
                    <th>Tiempo resolución</th>
                  </tr>
                </thead>
                <tbody>
                  {reportTickets.map((ticket) => {
                    const takenAt = getTicketTakenAt(ticket);

                    return (
                      <tr key={ticket.id}>
                        <td>#{ticket.id}</td>
                        <td>{ticket.title || ticket.description}</td>
                        <td>{ticket.category}</td>
                        <td>{getTicketDepartment(ticket, users)}</td>
                        <td>{ticket.createdByName}</td>
                        <td>{ticket.assignedToName ?? "Sin asignar"}</td>
                        <td>{formatDateTime(ticket.createdAt)}</td>
                        <td>{takenAt ? formatDateTime(takenAt) : "Sin tomar"}</td>
                        <td>{formatDateTime(ticket.closedAt)}</td>
                        <td>{getStatusLabel(ticket.status)}</td>
                        <td>{getTicketResolutionTime(ticket)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin solicitudes completadas"
              message="Este técnico no tiene solicitudes completadas en el año seleccionado."
            />
          )}
        </section>
      ) : null}
    </div>
  );
}
