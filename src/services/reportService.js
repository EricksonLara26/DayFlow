import { getUserFullName, isTechnicianUser } from "../data/users";
import { formatDateTime, getCurrentYear, getYearsFromDateField } from "../utils/dateUtils";
import { buildExportFilename, downloadSpreadsheet } from "../utils/exportUtils";
import {
  getCompletedTickets,
  getCompletedTicketsByTechnicianAndYear,
  getStatusLabel,
  getTicketDepartment,
  getTicketResolutionTime,
  getTicketTakenAt,
} from "../utils/ticketUtils";
import { getTicketsSnapshot } from "./ticketService";
import { getUsersSnapshot } from "./userService";

export const COMPLETED_TICKETS_REPORT_COLUMNS = [
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
];

function createOk(data, extra = {}) {
  return { ok: true, data, ...extra };
}

function createFailure(message, status = 400) {
  return { ok: false, status, message, error: { message, status } };
}

function ok(data, extra = {}) {
  return Promise.resolve(createOk(data, extra));
}

function fail(message, status = 400) {
  return Promise.resolve(createFailure(message, status));
}

export function getReportYearsSnapshot(tickets = getTicketsSnapshot()) {
  return getYearsFromDateField(tickets, "closedAt");
}

export function getReportTechniciansSnapshot(users = getUsersSnapshot()) {
  return users.filter(isTechnicianUser);
}

export function getCompletedTicketReportValues(ticket, users) {
  const takenAt = getTicketTakenAt(ticket);

  return {
    id: ticket.id,
    title: ticket.title || ticket.description,
    category: ticket.category,
    department: getTicketDepartment(ticket, users),
    requesterName: ticket.createdByName,
    technicianName: ticket.assignedToName ?? "Sin asignar",
    createdAt: formatDateTime(ticket.createdAt),
    takenAt: takenAt ? formatDateTime(takenAt) : "Sin tomar",
    closedAt: formatDateTime(ticket.closedAt),
    status: getStatusLabel(ticket.status),
    resolutionTime: getTicketResolutionTime(ticket),
  };
}

export function getCompletedTicketReportRow(ticket, users) {
  const values = getCompletedTicketReportValues(ticket, users);

  return [
    values.id,
    values.title,
    values.category,
    values.department,
    values.requesterName,
    values.technicianName,
    values.createdAt,
    values.takenAt,
    values.closedAt,
    values.status,
    values.resolutionTime,
  ];
}

function buildReportRows({ reportTickets, selectedTechnician, selectedYear, users }) {
  return [
    [`Informe ${selectedYear}`],
    ["Técnico", getUserFullName(selectedTechnician)],
    ["Generado", new Date().toLocaleString()],
    [],
    COMPLETED_TICKETS_REPORT_COLUMNS,
    ...reportTickets.map((ticket) => getCompletedTicketReportRow(ticket, users)),
  ];
}

export function getCompletedTicketsReportData(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const users = filters.users ?? getUsersSnapshot();
  const technicians = getReportTechniciansSnapshot(users);
  const years = getReportYearsSnapshot(tickets);
  const selectedTechnicianId = Number(filters.technicianId || technicians[0]?.id);
  const selectedYear = String(filters.year || years[0] || getCurrentYear());
  const selectedTechnician = technicians.find((technician) => technician.id === selectedTechnicianId);

  if (!selectedTechnician) {
    return createFailure("Selecciona un técnico válido.", 404);
  }

  const reportTickets = getCompletedTicketsByTechnicianAndYear(tickets, selectedTechnician.id, selectedYear);
  const filename = buildExportFilename("informe_tecnico", [getUserFullName(selectedTechnician), selectedYear], "xlsx");

  return createOk({
    filename,
    rows: buildReportRows({ reportTickets, selectedTechnician, selectedYear, users }),
    selectedTechnician,
    selectedYear,
    tickets: reportTickets,
    technicians,
    years,
  });
}

export function getCompletedTicketsReport(filters = {}) {
  const report = getCompletedTicketsReportData(filters);

  return report.ok ? ok(report.data) : fail(report.message, report.status);
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

  downloadSpreadsheet(report.data.rows, report.data.filename, `Informe ${report.data.selectedYear}`);

  return ok(report.data, { message: "Reporte exportado correctamente." });
}

export function getCompletedTicketsReportSnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  return getCompletedTickets(tickets);
}
