import { useState } from "react";
import SearchInput from "../common/SearchInput";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../../data/tickets";
import { getPriorityLabel, getStatusLabel } from "../../utils/ticketUtils";
import { allowedValueError } from "../../utils/formValidation";

const allowedStatuses = ["ALL", ...Object.values(TICKET_STATUSES)];
const allowedPriorities = ["ALL", ...Object.values(TICKET_PRIORITIES)];

export default function TicketFilters({ filters, onChange }) {
  const [fieldErrors, setFieldErrors] = useState({});

  function getNextErrors(nextFilters) {
    const nextErrors = {};
    const statusError = allowedValueError(nextFilters.status, allowedStatuses, "El estado");
    const priorityError = allowedValueError(nextFilters.priority, allowedPriorities, "La prioridad", {
      feminine: true,
    });

    if (statusError) {
      nextErrors.status = statusError;
    }

    if (priorityError) {
      nextErrors.priority = priorityError;
    }

    if (nextFilters.createdFrom && nextFilters.createdTo && nextFilters.createdFrom > nextFilters.createdTo) {
      nextErrors.createdFrom = "La fecha desde no puede ser posterior a la fecha hasta.";
      nextErrors.createdTo = "La fecha hasta no puede ser anterior a la fecha desde.";
    }

    return nextErrors;
  }

  function updateFilter(field, value) {
    const nextFilters = { ...filters, [field]: value };
    setFieldErrors(getNextErrors(nextFilters));
    onChange(nextFilters);
  }

  return (
    <section className="filter-panel" aria-label="Filtros de tickets">
      <SearchInput
        value={filters.query}
        onChange={(value) => updateFilter("query", value)}
        placeholder="Buscar por título, solicitante o técnico"
      />

      <label className="field compact-field">
        <span>Estado</span>
        <select
          aria-invalid={Boolean(fieldErrors.status)}
          value={filters.status}
          onChange={(event) => updateFilter("status", event.target.value)}
        >
          <option value="ALL">Todos</option>
          {Object.values(TICKET_STATUSES).map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
        {fieldErrors.status ? <p className="field-error">{fieldErrors.status}</p> : null}
      </label>

      <label className="field compact-field">
        <span>Prioridad</span>
        <select
          aria-invalid={Boolean(fieldErrors.priority)}
          value={filters.priority}
          onChange={(event) => updateFilter("priority", event.target.value)}
        >
          <option value="ALL">Todas</option>
          {Object.values(TICKET_PRIORITIES).map((priority) => (
            <option key={priority} value={priority}>
              {getPriorityLabel(priority)}
            </option>
          ))}
        </select>
        {fieldErrors.priority ? <p className="field-error">{fieldErrors.priority}</p> : null}
      </label>

      <label className="field compact-field">
        <span>Desde</span>
        <input
          aria-invalid={Boolean(fieldErrors.createdFrom)}
          type="date"
          value={filters.createdFrom}
          onChange={(event) => updateFilter("createdFrom", event.target.value)}
        />
        {fieldErrors.createdFrom ? <p className="field-error">{fieldErrors.createdFrom}</p> : null}
      </label>

      <label className="field compact-field">
        <span>Hasta</span>
        <input
          aria-invalid={Boolean(fieldErrors.createdTo)}
          type="date"
          value={filters.createdTo}
          onChange={(event) => updateFilter("createdTo", event.target.value)}
        />
        {fieldErrors.createdTo ? <p className="field-error">{fieldErrors.createdTo}</p> : null}
      </label>

      <label className="checkbox-field due-soon-toggle">
        <input
          type="checkbox"
          checked={filters.dueSoon}
          onChange={(event) => updateFilter("dueSoon", event.target.checked)}
        />
        <span>Vence en 24 a 72 horas</span>
      </label>
    </section>
  );
}
