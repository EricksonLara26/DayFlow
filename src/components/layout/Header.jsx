import { Bell, Plus, Search } from "lucide-react";
import { getTaskTimeRange } from "../../utils/timeUtils";

// Encabezado superior con busqueda, recordatorios y acceso rapido para crear tareas.
export default function Header({
  query,
  onQueryChange,
  onCreateTask,
  alertsCount,
  reminders,
  onOpenReminder,
  isNotificationsOpen,
  onToggleNotifications,
  showSearch,
  timeFormat,
}) {
  return (
    <header className={showSearch ? "topbar task-topbar" : "topbar task-topbar topbar-actions-only"}>
      {showSearch && (
        <label className="search">
          <Search size={18} />
          <input
            type="search"
            placeholder="Buscar tarea, área o fecha"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
      )}
      <div className="topbar-actions">
        <div className="notification-wrap">
          <button
            className={
              isNotificationsOpen
                ? "icon-button notification-button notification-button-active"
                : "icon-button notification-button"
            }
            aria-label="Mostrar recordatorios"
            aria-expanded={isNotificationsOpen}
            aria-pressed={isNotificationsOpen}
            onClick={onToggleNotifications}
          >
            <Bell size={19} />
            {alertsCount > 0 && <span className="badge">{alertsCount}</span>}
          </button>
          {isNotificationsOpen && (
            <section className="notification-menu" aria-label="Recordatorios">
              <div className="notification-header">
                <strong>Recordatorios</strong>
                <span>{alertsCount}</span>
              </div>
              <div className="notification-list">
                {reminders.map((task) => (
                  <button
                    className="notification-item"
                    key={task.id}
                    type="button"
                    onClick={() => onOpenReminder(task)}
                  >
                    <time>{getTaskTimeRange(task, timeFormat)}</time>
                    <div>
                      <strong>{task.title}</strong>
                      <span>{task.dueDate}</span>
                    </div>
                  </button>
                ))}
                {reminders.length === 0 && (
                  <p className="empty-state">No hay recordatorios pendientes.</p>
                )}
              </div>
            </section>
          )}
        </div>
        <button className="primary-button" onClick={onCreateTask}>
          <Plus size={18} />
          Nueva tarea
        </button>
      </div>
    </header>
  );
}
