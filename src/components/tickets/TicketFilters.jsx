import SearchInput from "../common/SearchInput";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../../data/tickets";
import { getPriorityLabel, getStatusLabel } from "../../utils/ticketUtils";

export default function TicketFilters({ filters, onChange }) {
  function updateFilter(field, value) {
    onChange({ ...filters, [field]: value });
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
        <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
          <option value="ALL">Todos</option>
          {Object.values(TICKET_STATUSES).map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
        </select>
      </label>

      <label className="field compact-field">
        <span>Prioridad</span>
        <select value={filters.priority} onChange={(event) => updateFilter("priority", event.target.value)}>
          <option value="ALL">Todas</option>
          {Object.values(TICKET_PRIORITIES).map((priority) => (
            <option key={priority} value={priority}>
              {getPriorityLabel(priority)}
            </option>
          ))}
        </select>
      </label>

      <label className="field compact-field">
        <span>Desde</span>
        <input
          type="date"
          value={filters.createdFrom}
          onChange={(event) => updateFilter("createdFrom", event.target.value)}
        />
      </label>

      <label className="field compact-field">
        <span>Hasta</span>
        <input
          type="date"
          value={filters.createdTo}
          onChange={(event) => updateFilter("createdTo", event.target.value)}
        />
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
