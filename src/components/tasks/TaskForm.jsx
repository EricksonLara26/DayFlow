import { useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Flag,
  FolderKanban,
  Plus,
  Repeat,
  Save,
  X,
} from "lucide-react";
import { priorityOptions, recurrenceOptions } from "../../constants/taskForm";
import { addDaysToDateKey, getTodayKey, parseDateKey } from "../../utils/dateUtils";
import DescriptionEditor from "./DescriptionEditor";

function formatDateChip(dateKey) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return dateKey;
  }

  try {
    return new Intl.DateTimeFormat("es-DO", {
      day: "numeric",
      month: "short",
    }).format(date);
  } catch {
    return dateKey;
  }
}

// Modal/formulario para crear una tarea nueva dentro de un bloque existente.
export default function TaskForm({ areas, form, isEditing, onChange, onSubmit, onClose }) {
  const [openPicker, setOpenPicker] = useState(null);
  const todayKey = getTodayKey();
  const datePresetOptions = [
    { id: "today", label: "Hoy", value: todayKey },
    { id: "tomorrow", label: "Manana", value: addDaysToDateKey(todayKey, 1) },
    { id: "week", label: "+7 dias", value: addDaysToDateKey(todayKey, 7) },
  ];
  const selectedArea = areas.find((area) => area.id === form.areaId) ?? areas[0];
  const selectedPriority = priorityOptions.find((option) => option.id === form.priority) ?? priorityOptions[1];
  const selectedRecurrence =
    recurrenceOptions.find((option) => option.id === form.recurrence) ?? recurrenceOptions[0];

  function togglePicker(picker) {
    setOpenPicker((current) => (current === picker ? null : picker));
  }

  function chooseOption(field, value) {
    onChange(field, value);
    setOpenPicker(null);
  }

  function getPickerTriggerClass(picker) {
    return openPicker === picker
      ? "input-with-icon task-picker-trigger active"
      : "input-with-icon task-picker-trigger";
  }

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

          <div className="field">
            <span>Bloque</span>
            <div className="task-picker-wrap">
              <button
                className={getPickerTriggerClass("area")}
                type="button"
                aria-expanded={openPicker === "area"}
                onClick={() => togglePicker("area")}
              >
                <FolderKanban size={17} />
                <span className="task-picker-value">
                  <span className="area-dot" style={{ background: selectedArea?.color }} />
                  <span>{selectedArea?.name ?? "Selecciona"}</span>
                </span>
                <ChevronDown size={16} />
              </button>
              {openPicker === "area" && (
                <div className="task-picker-panel" role="listbox">
                  {areas.map((area) => {
                    const isActive = form.areaId === area.id;

                    return (
                      <button
                        className={isActive ? "task-picker-option active" : "task-picker-option"}
                        key={area.id}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => chooseOption("areaId", area.id)}
                      >
                        <span className="area-dot" style={{ background: area.color }} />
                        <span>{area.name}</span>
                        {isActive && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <span>Fecha</span>
            <div className="task-picker-wrap">
              <button
                className={getPickerTriggerClass("date")}
                type="button"
                aria-expanded={openPicker === "date"}
                onClick={() => togglePicker("date")}
              >
                <CalendarDays size={17} />
                <span className="task-picker-value">{form.dueDate}</span>
                <ChevronDown size={16} />
              </button>
              {openPicker === "date" && (
                <div className="task-picker-panel task-date-picker-panel">
                  <div className="task-date-presets" role="group" aria-label="Fechas rapidas">
                    {datePresetOptions.map((option) => {
                      const isActive = form.dueDate === option.value;

                      return (
                        <button
                          className={isActive ? "task-date-option active" : "task-date-option"}
                          key={option.id}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => chooseOption("dueDate", option.value)}
                        >
                          <strong>{option.label}</strong>
                          <span>{formatDateChip(option.value)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <label className="field compact-date-field">
                    Fecha exacta
                    <div className="input-with-icon">
                      <CalendarDays size={17} />
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(event) => chooseOption("dueDate", event.target.value)}
                      />
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

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

          <div className="field">
            <span>Prioridad</span>
            <div className="task-picker-wrap">
              <button
                className={getPickerTriggerClass("priority")}
                type="button"
                aria-expanded={openPicker === "priority"}
                onClick={() => togglePicker("priority")}
              >
                <Flag size={17} />
                <span className="task-picker-value">{selectedPriority.label}</span>
                <ChevronDown size={16} />
              </button>
              {openPicker === "priority" && (
                <div className="task-picker-panel">
                  {priorityOptions.map((option) => {
                    const isActive = form.priority === option.id;

                    return (
                      <button
                        className={isActive ? `task-picker-option priority-${option.id} active` : `task-picker-option priority-${option.id}`}
                        key={option.id}
                        type="button"
                        onClick={() => chooseOption("priority", option.id)}
                      >
                        <Flag size={15} />
                        <span>{option.label}</span>
                        {isActive && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="field">
            <span>Repeticion</span>
            <div className="task-picker-wrap">
              <button
                className={getPickerTriggerClass("recurrence")}
                type="button"
                aria-expanded={openPicker === "recurrence"}
                onClick={() => togglePicker("recurrence")}
              >
                <Repeat size={17} />
                <span className="task-picker-value">{selectedRecurrence.label}</span>
                <ChevronDown size={16} />
              </button>
              {openPicker === "recurrence" && (
                <div className="task-picker-panel">
                  {recurrenceOptions.map((option) => {
                    const isActive = form.recurrence === option.id;

                    return (
                      <button
                        className={isActive ? "task-picker-option active" : "task-picker-option"}
                        key={option.id}
                        type="button"
                        onClick={() => chooseOption("recurrence", option.id)}
                      >
                        <Repeat size={15} />
                        <span>{option.label}</span>
                        {isActive && <Check size={15} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

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

          <button className="primary-button wide task-create-button" type="button" onClick={onSubmit}>
            {isEditing ? <Save size={18} /> : <Plus size={18} />}
            {isEditing ? "Guardar cambios" : "Crear tarea"}
          </button>
        </aside>
      </div>
    </section>
  );
}
