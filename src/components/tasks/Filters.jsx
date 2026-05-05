import { ListFilter } from "lucide-react";

// Filtro de estado para la vista de tareas.
export default function Filters({ statusFilter, onStatusFilterChange }) {
  return (
    <section className="filter-bar" aria-label="Filtros de tareas">
      <label className="select-field">
        <ListFilter size={17} />
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value)}>
          <option value="all">Todas</option>
          <option value="pendiente">Pendientes</option>
          <option value="completada">Completadas</option>
        </select>
      </label>
    </section>
  );
}
