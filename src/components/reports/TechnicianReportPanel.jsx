import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AccessDeniedState from "../common/AccessDeniedState";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import SuccessMessage from "../common/SuccessMessage";
import {
  COMPLETED_TICKETS_REPORT_COLUMNS,
  exportCompletedTickets,
  getCompletedTicketReportValues,
  getCompletedTicketsReportData,
  getReportTechniciansSnapshot,
  getReportYearsSnapshot,
} from "../../services/reportService";
import { getCurrentYear } from "../../utils/dateUtils";
import { allowedValueError, getApiErrorMessage } from "../../utils/formValidation";

export default function TechnicianReportPanel({
  canDownloadReports = true,
  onAuthorizeReport,
  onReportCountChange,
  tickets,
  users,
}) {
  const technicians = useMemo(() => getReportTechniciansSnapshot(users), [users]);
  const reportYears = useMemo(() => getReportYearsSnapshot(tickets), [tickets]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(String(technicians[0]?.id ?? ""));
  const [selectedYear, setSelectedYear] = useState(String(reportYears[0] ?? getCurrentYear()));
  const [fieldErrors, setFieldErrors] = useState({});
  const [reportError, setReportError] = useState("");
  const [reportSuccess, setReportSuccess] = useState("");
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const report = useMemo(
    () =>
      getCompletedTicketsReportData({
        technicianId: selectedTechnicianId,
        tickets,
        users,
        year: selectedYear,
      }),
    [selectedTechnicianId, selectedYear, tickets, users],
  );
  const selectedTechnician = report.ok ? report.data.selectedTechnician : null;
  const reportTickets = report.ok ? report.data.tickets : [];

  useEffect(() => {
    onReportCountChange?.(reportTickets.length);
  }, [onReportCountChange, reportTickets.length]);

  function updateReportField(field, value) {
    if (field === "technician") {
      setSelectedTechnicianId(value);
    }

    if (field === "year") {
      setSelectedYear(value);
    }

    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setReportError("");
    setReportSuccess("");
  }

  function validateReportControls() {
    const nextErrors = {};
    const technicianError = allowedValueError(
      selectedTechnicianId,
      technicians.map((technician) => String(technician.id)),
      "El técnico",
    );
    const yearError = allowedValueError(
      selectedYear,
      reportYears.map((year) => String(year)),
      "El año",
    );

    if (technicianError) {
      nextErrors.technician = technicianError;
    }

    if (yearError) {
      nextErrors.year = yearError;
    }

    return nextErrors;
  }

  async function handleDownloadReport() {
    if (isDownloadingReport) {
      return;
    }

    setReportError("");
    setReportSuccess("");
    const nextErrors = validateReportControls();

    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      setReportError("Revisa los filtros del informe antes de descargar.");
      return;
    }

    setFieldErrors({});
    const authorization = onAuthorizeReport({ technicianId: selectedTechnicianId, year: selectedYear });

    if (!authorization.ok) {
      setReportError(getApiErrorMessage(authorization, "No tienes permisos para descargar este informe."));
      return;
    }

    if (!selectedTechnician || !reportTickets.length) {
      setReportError("Este técnico no tiene solicitudes completadas en el año seleccionado.");
      return;
    }

    setIsDownloadingReport(true);

    try {
      const exportResult = await exportCompletedTickets("xlsx", {
        technicianId: selectedTechnicianId,
        tickets,
        users,
        year: selectedYear,
      });

      if (!exportResult.ok) {
        setReportError(getApiErrorMessage(exportResult, "No se pudo generar el informe."));
        return;
      }

      setReportSuccess("Informe generado correctamente.");
    } catch {
      setReportError("No se pudo generar el informe.");
    } finally {
      setIsDownloadingReport(false);
    }
  }

  if (!canDownloadReports) {
    return (
      <AccessDeniedState
        message="Solo las cuentas autorizadas pueden descargar informes."
        title="No tienes permiso para descargar informes."
      />
    );
  }

  return (
    <section className="panel report-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Descargar informe</p>
          <h2>Informe anual por técnico</h2>
        </div>
        <Button icon={Download} loading={isDownloadingReport} onClick={handleDownloadReport}>
          Descargar Excel
        </Button>
      </div>

      <div className="report-controls">
        <label className="field compact-field">
          <span>Técnico</span>
          <select
            aria-invalid={Boolean(fieldErrors.technician)}
            value={selectedTechnicianId}
            onChange={(event) => updateReportField("technician", event.target.value)}
          >
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.firstName} {technician.lastName}
              </option>
            ))}
          </select>
          {fieldErrors.technician ? <p className="field-error">{fieldErrors.technician}</p> : null}
        </label>
        <label className="field compact-field">
          <span>Año</span>
          <select
            aria-invalid={Boolean(fieldErrors.year)}
            value={selectedYear}
            onChange={(event) => updateReportField("year", event.target.value)}
          >
            {reportYears.map((year) => (
              <option key={year} value={year}>
                Informe {year}
              </option>
            ))}
          </select>
          {fieldErrors.year ? <p className="field-error">{fieldErrors.year}</p> : null}
        </label>
      </div>

      {reportError ? <p className="form-error">{reportError}</p> : null}
      <SuccessMessage>{reportSuccess}</SuccessMessage>

      {reportTickets.length ? (
        <div className="table-wrap report-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {COMPLETED_TICKETS_REPORT_COLUMNS.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportTickets.map((ticket) => {
                const values = getCompletedTicketReportValues(ticket, users);

                return (
                  <tr key={ticket.id}>
                    <td>#{values.id}</td>
                    <td>{values.title}</td>
                    <td>{values.category}</td>
                    <td>{values.department}</td>
                    <td>{values.requesterName}</td>
                    <td>{values.technicianName}</td>
                    <td>{values.createdAt}</td>
                    <td>{values.takenAt}</td>
                    <td>{values.closedAt}</td>
                    <td>{values.status}</td>
                    <td>{values.resolutionTime}</td>
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
  );
}
