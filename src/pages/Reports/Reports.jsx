import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import { isTechnicianUser } from "../../data/users";
import {
  exportCompletedTickets,
  getCompletedTicketsReport,
  getReportTechniciansSnapshot,
  getReportYearsSnapshot,
} from "../../services/reportService";
import { formatDateTime } from "../../utils/dateUtils";
import {
  getCompletedTicketsByTechnicianAndYear,
  getStatusLabel,
  getTicketDepartment,
  getTicketResolutionTime,
  getTicketTakenAt,
} from "../../utils/ticketUtils";
import { downloadXlsx } from "../../utils/xlsxExporter";
import "../InformationPanel/InformationPanel.css";

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

export default function Reports({ onAuthorizeReport, tickets, users }) {
  const technicians = getReportTechniciansSnapshot(users);
  const reportYears = getReportYearsSnapshot(tickets);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(String(technicians[0]?.id ?? ""));
  const [selectedYear, setSelectedYear] = useState(String(reportYears[0] ?? new Date().getFullYear()));
  const [reportError, setReportError] = useState("");
  const [reportTickets, setReportTickets] = useState([]);
  const selectedTechnician = technicians.find((technician) => String(technician.id) === selectedTechnicianId);

  useEffect(() => {
    let isMounted = true;

    getCompletedTicketsReport({
      technicianId: selectedTechnicianId,
      tickets,
      users,
      year: selectedYear,
    }).then((response) => {
      if (isMounted) {
        setReportTickets(response.ok ? response.data.tickets : []);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedTechnicianId, selectedYear, tickets, users]);

  async function handleDownloadReport() {
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

    const exportResult = await exportCompletedTickets("xlsx", {
      technicianId: selectedTechnicianId,
      tickets,
      users,
      year: selectedYear,
    });

    if (!exportResult.ok) {
      setReportError(exportResult.message);
    }
  }

  return (
    <div className="page-stack information-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Informes administrativos</p>
          <h2>Descarga de informes por técnico</h2>
        </div>
        <strong>{reportTickets.length} ticket(s)</strong>
      </section>

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
    </div>
  );
}
