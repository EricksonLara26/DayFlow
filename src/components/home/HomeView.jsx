import { Bell, CalendarDays, ChevronRight, FolderKanban } from "lucide-react";
import { getTaskTimeRange } from "../../utils/timeUtils";

// Inicio resume lo mas importante y permite saltar rapidamente a tareas por bloque.
export default function HomeView({ tasks, areas, reminders, onChangeView, onSelectArea, timeFormat }) {
  const pendingTasks = tasks.filter((task) => task.status === "pendiente");
  const completedTasks = tasks.filter((task) => task.status === "completada");
  const nextTasks = [...pendingTasks].sort((first, second) =>
    `${first.dueDate} ${first.startTime ?? first.dueTime ?? ""}`.localeCompare(
      `${second.dueDate} ${second.startTime ?? second.dueTime ?? ""}`,
    ),
  );
  const areaSummaries = areas.map((area) => {
    const areaTasks = tasks.filter((task) => task.areaId === area.id);

    return {
      ...area,
      total: areaTasks.length,
      pending: areaTasks.filter((task) => task.status === "pendiente").length,
    };
  });

  return (
    <section className="home-grid home-minimal" aria-label="Vista previa de DayFlow">
      <div className="home-main-column">
        <article className="panel home-summary">
          <div className="home-summary-copy">
            <p className="eyebrow">Inicio</p>
            <h2>Tu dia en foco</h2>
            <p>Una vista breve para entrar directo a lo importante.</p>
          </div>
          <div className="home-metrics" aria-label="Resumen de tareas">
            <button className="home-metric" type="button" onClick={() => onChangeView("Tareas")}>
              <strong>{pendingTasks.length}</strong>
              <span>Pendientes</span>
            </button>
            <button className="home-metric" type="button" onClick={() => onChangeView("Tareas")}>
              <strong>{completedTasks.length}</strong>
              <span>Completadas</span>
            </button>
            <button className="home-metric" type="button" onClick={() => onSelectArea("all")}>
              <strong>{areas.length}</strong>
              <span>Bloques</span>
            </button>
          </div>
        </article>

        <article className="panel home-agenda-panel">
          <div className="panel-header compact-panel-header">
            <div>
              <p className="eyebrow">Prioridad</p>
              <h2>Proximas tareas</h2>
            </div>
            <button className="icon-button" type="button" aria-label="Ver tareas" onClick={() => onChangeView("Tareas")}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="home-preview-list">
            {nextTasks.map((task) => {
              const taskArea = areas.find((area) => area.id === task.areaId);

              return (
                <button
                  className="home-task-preview"
                  key={task.id}
                  type="button"
                  onClick={() => onSelectArea(task.areaId)}
                >
                  <span
                    className="task-color-bar"
                    style={{ background: taskArea?.color ?? "#1f6feb" }}
                  />
                  <span className="home-task-copy">
                    <strong>{task.title}</strong>
                    <span>
                      {task.dueDate} - {getTaskTimeRange(task, timeFormat)}
                    </span>
                  </span>
                </button>
              );
            })}
            {nextTasks.length === 0 && (
              <p className="empty-state">No hay tareas pendientes por ahora.</p>
            )}
          </div>
        </article>
      </div>

      <div className="home-side-column">
        <article className="panel home-block-panel">
          <div className="panel-header compact-panel-header">
            <div>
              <p className="eyebrow">Bloques</p>
              <h2>Espacios activos</h2>
            </div>
            <FolderKanban size={20} />
          </div>
          <div className="home-preview-list">
            {areaSummaries.map((area) => (
              <button
                className="home-block-row"
                key={area.id}
                type="button"
                onClick={() => onSelectArea(area.id)}
              >
                <span className="area-dot" style={{ background: area.color }} />
                <span>
                  <strong>{area.name}</strong>
                  <small>{area.pending} pendientes</small>
                </span>
                <b>{area.total}</b>
              </button>
            ))}
          </div>
        </article>

        <article className="panel home-reminder-panel">
          <div className="panel-header compact-panel-header">
            <div>
              <p className="eyebrow">Avisos</p>
              <h2>{reminders.length} recordatorios</h2>
            </div>
            <Bell size={20} />
          </div>
          <div className="home-preview-list">
            {reminders.slice(0, 3).map((task) => (
              <button
                className="home-reminder-row"
                key={`reminder-${task.id}`}
                type="button"
                onClick={() => onSelectArea(task.areaId)}
              >
                <CalendarDays size={17} />
                <span>
                  <strong>{task.title}</strong>
                  <small>
                    {task.dueDate} - {getTaskTimeRange(task, timeFormat)}
                  </small>
                </span>
              </button>
            ))}
            {reminders.length === 0 && <p className="empty-state">No hay recordatorios activos.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}
