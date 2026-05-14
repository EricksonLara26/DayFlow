import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import Button from "../common/Button";
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from "../../data/tickets";
import { getPriorityLabel } from "../../utils/ticketUtils";

function getInitialForm(currentUser) {
  return {
    title: "",
    description: "",
    category: TICKET_CATEGORIES[0],
    priority: TICKET_PRIORITIES.MEDIUM,
    requesterId: String(currentUser.id),
    dueDate: "",
  };
}

export default function TicketForm({ currentUser, requesters, onSubmit }) {
  const [form, setForm] = useState(() => getInitialForm(currentUser));
  const [error, setError] = useState("");
  const requesterOptions = useMemo(() => requesters.length ? requesters : [currentUser], [currentUser, requesters]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const title = form.title.trim();
    const description = form.description.trim();

    if (!title || !description || !form.dueDate) {
      setError("Completa titulo, descripcion y fecha limite.");
      return;
    }

    const requester = requesterOptions.find((user) => String(user.id) === String(form.requesterId)) ?? currentUser;

    onSubmit({
      ...form,
      title,
      description,
      requester,
    });
    setForm(getInitialForm(currentUser));
    setError("");
  }

  return (
    <form className="form-panel ticket-form" onSubmit={handleSubmit}>
      <div className="form-grid two-columns">
        <label className="field span-2">
          <span>Titulo</span>
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Ej. No puedo acceder al correo"
          />
        </label>

        <label className="field span-2">
          <span>Descripcion</span>
          <textarea
            rows="6"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe el problema, impacto y cualquier contexto util"
          />
        </label>

        <label className="field">
          <span>Categoria</span>
          <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Prioridad</span>
          <select value={form.priority} onChange={(event) => updateField("priority", event.target.value)}>
            {Object.values(TICKET_PRIORITIES).map((priority) => (
              <option key={priority} value={priority}>
                {getPriorityLabel(priority)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Solicitante</span>
          <select
            disabled={requesterOptions.length === 1}
            value={form.requesterId}
            onChange={(event) => updateField("requesterId", event.target.value)}
          >
            {requesterOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Fecha limite</span>
          <input
            type="date"
            value={form.dueDate}
            onChange={(event) => updateField("dueDate", event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <Button icon={PlusCircle} type="submit">
          Guardar solicitud
        </Button>
      </div>
    </form>
  );
}
