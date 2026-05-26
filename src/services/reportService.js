import { formatDateTime } from "../utils/dateUtils";
import {
  getCompletedTickets,
  getCompletedTicketsByTechnicianAndYear,
  getStatusLabel,
  getTicketDepartment,
  getTicketResolutionTime,
  getTicketTakenAt,
} from "../utils/ticketUtils";
import { downloadXlsx } from "../utils/xlsxExporter";
import { getTicketsSnapshot } from "./ticketService";
import { getUsersSnapshot } from "./userService";
import { isTechnicianUser } from "../data/users";

function ok(data, extra = {}) {
  return Promise.resolve({ ok: true, data, ...extra });
}

function fail(message, status = 400) {
  return Promise.resolve({ ok: false, status, message, error: { message, status } });
}

function safeFilenameText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .trim();
}

export function getReportYearsSnapshot(tickets = getTicketsSnapshot()) {
  const years = new Set(
    tickets
      .filter((ticket) => ticket.closedAt)
      .map((ticket) => new Date(ticket.closedAt).getFullYear())
      .filter((year) => !Number.isNaN(year)),
  );

  years.add(new Date().getFullYear());

  return [...years].sort((first, second) => second - first);
}

export function getReportTechniciansSnapshot(users = getUsersSnapshot()) {
  return users.filter(isTechnicianUser);
}

function buildReportRows({ reportTickets, selectedTechnician, selectedYear, users }) {
  return [
    [`Informe ${selectedYear}`],
    ["Tecnico", `${selectedTechnician.firstName} ${selectedTechnician.lastName}`],
    ["Generado", new Date().toLocaleString()],
    [],
    [
      "ID ticket",
      "Titulo o descripcion",
      "Categoria",
      "Departamento",
      "Usuario solicitante",
      "Tecnico responsable",
      "Fecha creacion",
      "Fecha tomada",
      "Fecha finalizacion",
      "Estado",
      "Tiempo resolucion",
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

export function getCompletedTicketsReport(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const users = filters.users ?? getUsersSnapshot();
  const technicians = getReportTechniciansSnapshot(users);
  const years = getReportYearsSnapshot(tickets);
  const selectedTechnicianId = Number(filters.technicianId || technicians[0]?.id);
  const selectedYear = String(filters.year || years[0] || new Date().getFullYear());
  const selectedTechnician = technicians.find((technician) => technician.id === selectedTechnicianId);

  if (!selectedTechnician) {
    return fail("Selecciona un tecnico valido.", 404);
  }

  const reportTickets = getCompletedTicketsByTechnicianAndYear(tickets, selectedTechnician.id, selectedYear);
  const technicianName = `${selectedTechnician.firstName}${selectedTechnician.lastName}`;
  const filename = `informe_tecnico_${safeFilenameText(technicianName)}_${selectedYear}.xlsx`;

  return ok({
    filename,
    rows: buildReportRows({ reportTickets, selectedTechnician, selectedYear, users }),
    selectedTechnician,
    selectedYear,
    tickets: reportTickets,
    technicians,
    years,
  });
}

export async function exportCompletedTickets(format = "xlsx", filters = {}) {
  const normalizedFormat = format.toLowerCase();
  const report = await getCompletedTicketsReport(filters);

  if (!report.ok) {
    return report;
  }

  if (!report.data.tickets.length) {
    return fail("Este tecnico no tiene solicitudes completadas en el ano seleccionado.", 404);
  }

  if (normalizedFormat !== "xlsx" && normalizedFormat !== "excel") {
    return fail("Formato de exportacion no soportado todavia.", 415);
  }

  downloadXlsx(report.data.rows, report.data.filename, `Informe ${report.data.selectedYear}`);

  return ok(report.data, { message: "Reporte exportado correctamente." });
}

export function getCompletedTicketsReportSnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  return getCompletedTickets(tickets);
}
