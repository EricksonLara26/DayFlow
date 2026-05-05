import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAreaName } from "../../utils/areaUtils";
import { toDateKey } from "../../utils/dateUtils";
import { getTaskTimeRange } from "../../utils/timeUtils";

// Vista mensual que agrupa las tareas por fecha dentro del calendario.
export default function CalendarView({
  tasks,
  areas,
  monthDate,
  onPreviousMonth,
  onNextMonth,
  onToday,
  timeFormat,
}) {
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const monthName = monthDate.toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekdayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Se agregan celdas vacias al inicio para alinear correctamente el primer dia.
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ id: `empty-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const dateKey = toDateKey(year, monthIndex, day);
      const dayTasks = tasks
        .filter((task) => task.dueDate === dateKey)
        .sort((first, second) =>
          (first.startTime ?? first.dueTime ?? "").localeCompare(
            second.startTime ?? second.dueTime ?? "",
          ),
        );

      return { id: dateKey, day, dateKey, tasks: dayTasks };
    }),
  ];

  return (
    <section className="panel calendar-panel" aria-label="Vista calendario">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Calendario</p>
          <h2>{monthName}</h2>
        </div>
        <div className="calendar-actions">
          <button
            className="icon-button calendar-nav-button"
            type="button"
            aria-label="Mes anterior"
            title="Mes anterior"
            onClick={onPreviousMonth}
          >
            <ChevronLeft size={18} />
          </button>
          <button className="outline-button calendar-today-button" type="button" onClick={onToday}>
            Hoy
          </button>
          <button
            className="icon-button calendar-nav-button"
            type="button"
            aria-label="Mes siguiente"
            title="Mes siguiente"
            onClick={onNextMonth}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="calendar-grid calendar-weekdays">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarCells.map((cell) =>
          cell.day ? (
            <article className="calendar-day" key={cell.id}>
              <strong>{cell.day}</strong>
              <div className="calendar-task-stack">
                {cell.tasks.map((task) => (
                  <span className={`calendar-task ${task.status}`} key={task.id}>
                    {getTaskTimeRange(task, timeFormat)} - {getAreaName(areas, task.areaId)}: {task.title}
                  </span>
                ))}
              </div>
            </article>
          ) : (
            <span className="calendar-day empty" key={cell.id} />
          ),
        )}
      </div>
      {tasks.length === 0 && (
        <p className="empty-state">No hay tareas para mostrar en el calendario.</p>
      )}
    </section>
  );
}
