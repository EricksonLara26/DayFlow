import { Check, ChevronRight, Circle, Trash2 } from "lucide-react";
import { getAreaName } from "../../utils/areaUtils";
import { getTaskTimeRange } from "../../utils/timeUtils";
import TaskDescription from "./TaskDescription";

// Lista de tareas filtradas con boton para alternar pendiente/completada.
export default function TaskList({ tasks, areas, onSetStatus, onDeleteTask, onOpenTask, timeFormat }) {
  function isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest("a, button"));
  }

  function handleTaskClick(event, task) {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    onOpenTask(task);
  }

  function handleTaskKeyDown(event, task) {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onOpenTask(task);
  }

  return (
    <section className="panel tasks-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Gestión</p>
          <h2>Tareas filtradas</h2>
        </div>
        <ChevronRight size={18} />
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <article
            className={`task-item ${task.status}`}
            key={task.id}
            role="button"
            tabIndex={0}
            aria-label={`Ver detalle de ${task.title}`}
            onClick={(event) => handleTaskClick(event, task)}
            onKeyDown={(event) => handleTaskKeyDown(event, task)}
          >
            <button
              className="check-button"
              aria-label={task.status === "completada" ? "Completada" : "Pendiente"}
              onClick={(event) => {
                event.stopPropagation();
                onSetStatus(task.id, task.status === "completada" ? "pendiente" : "completada");
              }}
            >
              {task.status === "completada" ? <Check size={15} /> : <Circle size={14} />}
            </button>
            <div className="task-copy">
              <strong>{task.title}</strong>
              <TaskDescription text={task.description} />
              <div className="task-meta">
                <span>{getAreaName(areas, task.areaId)}</span>
                <span>{task.dueDate}</span>
                <span>{getTaskTimeRange(task, timeFormat)}</span>
                {task.gmailReminder && <span>Gmail activo</span>}
              </div>
            </div>
            <button
              className="task-delete-button"
              type="button"
              aria-label={`Eliminar tarea ${task.title}`}
              title="Eliminar tarea"
              onClick={(event) => {
                event.stopPropagation();
                onDeleteTask(task.id);
              }}
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))}

        {tasks.length === 0 && (
          <p className="empty-state">No hay tareas para los filtros seleccionados.</p>
        )}
      </div>
    </section>
  );
}
