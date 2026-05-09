import { AlertTriangle, Bell, CalendarDays, CheckCircle2, Flag, ListFilter, TimerReset } from "lucide-react";

const filterOptions = [
  { id: "all", label: "Todas", icon: ListFilter },
  { id: "pendiente", label: "Pendientes", icon: TimerReset },
  { id: "completada", label: "Completadas", icon: CheckCircle2 },
  { id: "today", label: "Hoy", icon: CalendarDays },
  { id: "week", label: "Semana", icon: CalendarDays },
  { id: "overdue", label: "Vencidas", icon: AlertTriangle },
  { id: "reminders", label: "Avisos", icon: Bell },
  { id: "high", label: "Alta", icon: Flag },
];

// Filtros de tareas con conteos rapidos para revisar el dia sin perder contexto.
export default function Filters({ activeFilter, onFilterChange, counts }) {
  return (
    <section className="filter-bar rich-filter-bar" aria-label="Filtros de tareas">
      <div className="segmented task-filter-segmented" role="group" aria-label="Filtrar tareas">
        {filterOptions.map((option) => {
          const FilterIcon = option.icon;

          return (
            <button
              className={activeFilter === option.id ? "active" : ""}
              type="button"
              key={option.id}
              aria-pressed={activeFilter === option.id}
              onClick={() => onFilterChange(option.id)}
            >
              <FilterIcon size={16} />
              <span>{option.label}</span>
              <small>{counts?.[option.id] ?? 0}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
