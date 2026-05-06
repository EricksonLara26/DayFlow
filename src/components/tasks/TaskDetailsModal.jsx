import { useEffect } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Trash2,
  X,
} from "lucide-react";
import { getAreaName } from "../../utils/areaUtils";
import { formatTimeValue, getTaskTimeRange } from "../../utils/timeUtils";
import TaskDescription from "./TaskDescription";

function formatReadableDate(date) {
  if (!date) {
    return "Sin fecha";
  }

  try {
    return new Intl.DateTimeFormat("es-DO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(`${date}T00:00:00`));
  } catch {
    return date;
  }
}

export default function TaskDetailsModal({
  task,
  areas,
  timeFormat,
  onClose,
  onSetStatus,
  onDeleteTask,
}) {
  const areaName = getAreaName(areas, task.areaId);
  const isCompleted = task.status === "completada";
  const nextStatus = isCompleted ? "pendiente" : "completada";

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  function handleStatusChange() {
    onSetStatus(task.id, nextStatus);
  }

  function handleDelete() {
    onClose();
    onDeleteTask(task.id);
  }

  return (
    <div
      className="task-detail-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
      onClick={onClose}
    >
      <section className={`panel task-detail-panel ${task.status}`} onClick={(event) => event.stopPropagation()}>
        <header className="task-detail-hero">
          <div className="task-detail-title-block">
            <p className="eyebrow">Detalle de tarea</p>
            <h2 id="task-detail-title">{task.title}</h2>
            <div className="task-detail-meta">
              <span>{areaName}</span>
              <span>{formatReadableDate(task.dueDate)}</span>
              <span>{getTaskTimeRange(task, timeFormat)}</span>
            </div>
          </div>
          <button className="icon-button" type="button" aria-label="Cerrar detalle" title="Cerrar" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="task-detail-layout">
          <div className="task-detail-main">
            <section className="task-detail-section" aria-label="Descripcion completa">
              <div className="task-detail-section-heading">
                <p className="eyebrow">Descripción</p>
                <h3>Notas y pasos</h3>
              </div>
              <TaskDescription text={task.description} />
            </section>

            <div className="task-detail-actions">
              <button className="outline-button" type="button" onClick={handleStatusChange}>
                {isCompleted ? <Clock3 size={17} /> : <Check size={17} />}
                {isCompleted ? "Marcar pendiente" : "Completar tarea"}
              </button>
              <button className="danger-button" type="button" onClick={handleDelete}>
                <Trash2 size={17} />
                Eliminar
              </button>
            </div>
          </div>

          <aside className="task-detail-side" aria-label="Planificacion y estado">
            <div className="task-detail-status">
              <span className="task-detail-status-icon">
                {isCompleted ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}
              </span>
              <div>
                <p className="eyebrow">Estado</p>
                <strong>{isCompleted ? "Completada" : "Pendiente"}</strong>
              </div>
            </div>

            <dl className="task-detail-list">
              <div>
                <dt>
                  <FolderKanban size={16} />
                  Bloque
                </dt>
                <dd>{areaName}</dd>
              </div>
              <div>
                <dt>
                  <CalendarDays size={16} />
                  Fecha
                </dt>
                <dd>{formatReadableDate(task.dueDate)}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={16} />
                  Inicio
                </dt>
                <dd>{task.startTime ? formatTimeValue(task.startTime, timeFormat) : "Sin hora"}</dd>
              </div>
              <div>
                <dt>
                  <Clock3 size={16} />
                  Fin
                </dt>
                <dd>{task.endTime ? formatTimeValue(task.endTime, timeFormat) : "Sin hora"}</dd>
              </div>
              <div>
                <dt>
                  <Bell size={16} />
                  Recordatorio
                </dt>
                <dd>{task.gmailReminder ? "Gmail activo" : "Sin aviso por Gmail"}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </div>
  );
}
