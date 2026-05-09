import { Bell, CalendarDays, Clock3, Flag, FolderKanban, Plus, Repeat, Save, X } from "lucide-react";
import { priorityOptions, recurrenceOptions } from "../../constants/taskForm";
import DescriptionEditor from "./DescriptionEditor";

// Modal/formulario para crear una tarea nueva dentro de un bloque existente.
export default function TaskForm({ areas, form, isEditing, onChange, onSubmit, onClose }) {
  return (
    <section className="panel task-form-panel task-composer-panel">
      <div className="task-form-hero">
        <div>
          <p className="eyebrow">{isEditing ? "Editar tarea" : "Nueva tarea"}</p>
          <h2>{isEditing ? "Ajusta el plan" : "Convierte una idea en accion"}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Cerrar" title="Cerrar" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="task-composer-grid">
        <div className="task-composer-main">
          <label className="field task-title-field">
            Titulo
            <input
              className="task-title-input"
              value={form.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="Ej. Entregar practica"
            />
          </label>
          <div className="field description-field task-details-field">
            <span>Detalles de la tarea</span>
            <DescriptionEditor
              value={form.description}
              onChange={(nextDescription) => onChange("description", nextDescription)}
            />
          </div>
        </div>

        <aside className="task-composer-side" aria-label="Planificacion de tarea">
          <div className="task-side-heading">
            <span className="task-side-icon">
              <CalendarDays size={19} />
            </span>
            <div>
              <p className="eyebrow">Planificacion</p>
              <h3>Detalles</h3>
            </div>
          </div>

          <label className="field">
            Bloque
            <div className="input-with-icon">
              <FolderKanban size={17} />
              <select value={form.areaId} onChange={(event) => onChange("areaId", event.target.value)}>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          </label>
          <label className="field">
            Fecha
            <div className="input-with-icon">
              <CalendarDays size={17} />
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => onChange("dueDate", event.target.value)}
              />
            </div>
          </label>

          <div className="time-field-grid">
            <label className="field">
              Inicio
              <div className="input-with-icon">
                <Clock3 size={17} />
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(event) => onChange("startTime", event.target.value)}
                />
              </div>
            </label>
            <label className="field">
              Fin
              <div className="input-with-icon">
                <Clock3 size={17} />
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(event) => onChange("endTime", event.target.value)}
                />
              </div>
            </label>
          </div>

          <label className="field">
            Prioridad
            <div className="input-with-icon">
              <Flag size={17} />
              <select value={form.priority} onChange={(event) => onChange("priority", event.target.value)}>
                {priorityOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="field">
            Repeticion
            <div className="input-with-icon">
              <Repeat size={17} />
              <select value={form.recurrence} onChange={(event) => onChange("recurrence", event.target.value)}>
                {recurrenceOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="toggle-row task-reminder-toggle">
            <input
              type="checkbox"
              checked={form.gmailReminder}
              onChange={(event) => onChange("gmailReminder", event.target.checked)}
            />
            <span>
              <Bell size={17} />
              Aviso por Gmail
            </span>
          </label>

          <button className="primary-button wide task-create-button" onClick={onSubmit}>
            {isEditing ? <Save size={18} /> : <Plus size={18} />}
            {isEditing ? "Guardar cambios" : "Crear tarea"}
          </button>
        </aside>
      </div>
    </section>
  );
}
