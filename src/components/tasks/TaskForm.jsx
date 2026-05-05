import { Plus } from "lucide-react";
import DescriptionEditor from "./DescriptionEditor";

// Modal/formulario para crear una tarea nueva dentro de un bloque existente.
export default function TaskForm({ areas, form, onChange, onSubmit, onClose }) {
  return (
    <section className="panel task-form-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Nueva tarea</p>
          <h2>Crear dentro de un bloque</h2>
        </div>
        <button className="text-button" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <div className="task-form">
        <label className="field">
          Título
          <input
            value={form.title}
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Ej. Entregar práctica"
          />
        </label>
        <div className="field description-field">
          <span>Detalles de la tarea</span>
          <DescriptionEditor
            value={form.description}
            onChange={(nextDescription) => onChange("description", nextDescription)}
          />
        </div>
        <div className="form-grid">
          <label className="field">
            Bloque
            <select value={form.areaId} onChange={(event) => onChange("areaId", event.target.value)}>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Fecha
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => onChange("dueDate", event.target.value)}
            />
          </label>
          <label className="field">
            Inicio
            <input
              type="time"
              value={form.startTime}
              onChange={(event) => onChange("startTime", event.target.value)}
            />
          </label>
          <label className="field">
            Fin
            <input
              type="time"
              value={form.endTime}
              onChange={(event) => onChange("endTime", event.target.value)}
            />
          </label>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={form.gmailReminder}
            onChange={(event) => onChange("gmailReminder", event.target.checked)}
          />
          Enviar aviso por Gmail antes de vencer
        </label>
        <button className="primary-button wide" onClick={onSubmit}>
          <Plus size={18} />
          Crear tarea
        </button>
      </div>
    </section>
  );
}
