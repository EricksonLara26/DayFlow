import { useMemo, useRef, useState } from "react";
import { PlusCircle } from "lucide-react";
import LoadingButton from "../common/LoadingButton";
import { TICKET_PRIORITIES } from "../../data/tickets";
import {
  useCategoryOptions,
  useDepartmentOptions,
} from "../../hooks/useCatalogOptions";
import { getPriorityLabel } from "../../utils/ticketUtils";
import { getTodayKey, parseDateKey } from "../../utils/dateUtils";
import {
  FORM_MIN_LENGTHS,
  allowedValueError,
  cleanField,
  getApiErrorMessage,
  getApiFieldErrors,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";

function getInitialForm(currentUser) {
  return {
    title: "",
    description: "",
    category: "",
    priority: "",
    department: currentUser?.department?.trim() ?? "",
    hasDueDate: false,
    dueDate: "",
    evidence: null,
    requesterId: String(currentUser.id),
  };
}

function formatFileSize(size) {
  if (!size) {
    return "tamaño no disponible";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TicketForm({ currentUser, onCreateTicket, onSubmit, requesters, users = [] }) {
  const { names: categories } = useCategoryOptions();
  const { names: departmentNames } = useDepartmentOptions();
  const departments = useMemo(() => {
    const currentDepartment = currentUser?.department?.trim();

    if (currentDepartment && !departmentNames.includes(currentDepartment)) {
      return [currentDepartment, ...departmentNames];
    }

    return departmentNames;
  }, [currentUser?.department, departmentNames]);
  const evidenceInputRef = useRef(null);
  const [form, setForm] = useState(() => getInitialForm(currentUser));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const requesterOptions = useMemo(() => {
    const availableRequesters = requesters?.length ? requesters : users;
    return availableRequesters?.length ? availableRequesters : [currentUser];
  }, [currentUser, requesters, users]);
  const submitTicket = onSubmit ?? onCreateTicket;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];

      if (field === "hasDueDate" || field === "dueDate") {
        delete nextErrors.dueDate;
      }

      return nextErrors;
    });
    setError("");
    setSuccess("");
  }

  function handleEvidenceChange(event) {
    const file = event.target.files?.[0];

    updateField("evidence", file ?? null);
  }

  function clearEvidence() {
    updateField("evidence", null);

    if (evidenceInputRef.current) {
      evidenceInputRef.current.value = "";
    }
  }

  function validateForm() {
    const nextErrors = {};
    const title = cleanField(form.title);
    const description = cleanField(form.description);
    const category = cleanField(form.category);
    const priority = cleanField(form.priority);
    const department = cleanField(form.department);
    const dueDate = form.hasDueDate ? cleanField(form.dueDate) : "";
    const titleRequired = requiredError(title, "El título");
    const descriptionRequired = requiredError(description, "La descripción", { feminine: true });
    const categoryRequired = requiredError(category, "La categoría", { feminine: true });
    const priorityRequired = requiredError(priority, "La prioridad", { feminine: true });
    const departmentRequired = requiredError(department, "El departamento");

    if (titleRequired) {
      nextErrors.title = titleRequired;
    } else {
      const titleMin = minLengthError(title, "El título", FORM_MIN_LENGTHS.title);

      if (titleMin) {
        nextErrors.title = titleMin;
      }
    }

    if (descriptionRequired) {
      nextErrors.description = descriptionRequired;
    } else {
      const descriptionMin = minLengthError(description, "La descripción", FORM_MIN_LENGTHS.description);

      if (descriptionMin) {
        nextErrors.description = descriptionMin;
      }
    }

    if (categoryRequired) {
      nextErrors.category = categoryRequired;
    } else {
      const categoryError = allowedValueError(category, categories, "La categoría", { feminine: true });

      if (categoryError) {
        nextErrors.category = categoryError;
      }
    }

    if (priorityRequired) {
      nextErrors.priority = priorityRequired;
    } else {
      const priorityError = allowedValueError(priority, Object.values(TICKET_PRIORITIES), "La prioridad", {
        feminine: true,
      });

      if (priorityError) {
        nextErrors.priority = priorityError;
      }
    }

    if (departmentRequired) {
      nextErrors.department = departmentRequired;
    } else {
      const departmentError = allowedValueError(department, departments, "El departamento");

      if (departmentError) {
        nextErrors.department = departmentError;
      }
    }

    if (form.hasDueDate && !parseDateKey(dueDate)) {
      nextErrors.dueDate = "Selecciona una fecha límite válida.";
    }

    if (form.hasDueDate && parseDateKey(dueDate) && dueDate < getTodayKey()) {
      nextErrors.dueDate = "La fecha límite no puede ser anterior a hoy.";
    }

    return {
      errors: nextErrors,
      values: {
        ...form,
        title,
        description,
        category,
        priority,
        department,
        dueDate,
      },
    };
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const { errors, values } = validateForm();

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados antes de enviar.");
      setSuccess("");
      return;
    }

    if (!submitTicket) {
      setError("No se pudo preparar el envío de la solicitud.");
      return;
    }

    const requester = requesterOptions.find((user) => String(user.id) === String(values.requesterId)) ?? currentUser;

    setError("");
    setSuccess("");
    setIsLoading(true);

    window.setTimeout(() => {
      Promise.resolve(
        submitTicket({
          ...values,
          requester,
        }),
      )
        .then((result) => {
          setIsLoading(false);

          if (result?.ok === false) {
            setFieldErrors(getApiFieldErrors(result));
            setError(getApiErrorMessage(result, "No se pudo guardar la solicitud."));
            return;
          }

          setForm(getInitialForm(currentUser));
          setFieldErrors({});
          setError("");
          setSuccess(result?.message ?? "Solicitud enviada correctamente.");

          if (evidenceInputRef.current) {
            evidenceInputRef.current.value = "";
          }
        })
        .catch(() => {
          setIsLoading(false);
          setError("No se pudo guardar la solicitud.");
        });
    }, 300);
  }

  return (
    <form className="form-panel ticket-form" noValidate onSubmit={handleSubmit}>
      <div className="form-grid two-columns">
        <label className="field span-2">
          <span>Título</span>
          <input
            aria-invalid={Boolean(fieldErrors.title)}
            disabled={isLoading}
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            placeholder="Título de la solicitud"
          />
          {fieldErrors.title ? <p className="field-error">{fieldErrors.title}</p> : null}
        </label>

        <label className="field span-2">
          <span>Descripción</span>
          <textarea
            aria-invalid={Boolean(fieldErrors.description)}
            disabled={isLoading}
            rows="6"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Describe el problema, impacto, fechas mencionadas y cualquier contexto útil"
          />
          {fieldErrors.description ? <p className="field-error">{fieldErrors.description}</p> : null}
        </label>

        <label className="field">
          <span>Categoría</span>
          <select
            aria-invalid={Boolean(fieldErrors.category)}
            disabled={isLoading}
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
          >
            <option value="">Selecciona una categoría</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {fieldErrors.category ? <p className="field-error">{fieldErrors.category}</p> : null}
        </label>

        <label className="field">
          <span>Prioridad</span>
          <select
            aria-invalid={Boolean(fieldErrors.priority)}
            disabled={isLoading}
            value={form.priority}
            onChange={(event) => updateField("priority", event.target.value)}
          >
            <option value="">Selecciona una prioridad</option>
            {Object.values(TICKET_PRIORITIES).map((priority) => (
              <option key={priority} value={priority}>
                {getPriorityLabel(priority)}
              </option>
            ))}
          </select>
          {fieldErrors.priority ? <p className="field-error">{fieldErrors.priority}</p> : null}
        </label>

        <label className="field">
          <span>Departamento</span>
          <select
            aria-invalid={Boolean(fieldErrors.department)}
            disabled={isLoading}
            value={form.department}
            onChange={(event) => updateField("department", event.target.value)}
          >
            <option value="">Selecciona un departamento</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          {fieldErrors.department ? <p className="field-error">{fieldErrors.department}</p> : null}
        </label>

        <div className="field">
          <span>Fecha límite</span>
          <label className="checkbox-field due-date-checkbox">
            <input
              disabled={isLoading}
              type="checkbox"
              checked={form.hasDueDate}
              onChange={(event) => updateField("hasDueDate", event.target.checked)}
            />
            <span>Agregar fecha límite</span>
          </label>
          <input
            aria-label="Fecha límite"
            aria-invalid={Boolean(fieldErrors.dueDate)}
            disabled={isLoading || !form.hasDueDate}
            min={getTodayKey()}
            type="date"
            value={form.dueDate}
            onChange={(event) => updateField("dueDate", event.target.value)}
          />
          <p className="field-hint">Úsala solo si la solicitud tiene una fecha comprometida.</p>
          {fieldErrors.dueDate ? <p className="field-error">{fieldErrors.dueDate}</p> : null}
        </div>

        <label className="field">
          <span>Evidencia o adjunto</span>
          <input ref={evidenceInputRef} disabled={isLoading} type="file" onChange={handleEvidenceChange} />
          {form.evidence ? (
            <p className="field-hint">
              Adjunto seleccionado: {form.evidence.name} ({formatFileSize(form.evidence.size)}).{" "}
              <button className="inline-text-button" type="button" onClick={clearEvidence}>
                Quitar
              </button>
            </p>
          ) : (
            <p className="field-hint">Opcional. Se guardará la referencia del archivo hasta conectar el backend.</p>
          )}
        </label>

        <label className="field span-2">
          <span>Solicitante</span>
          <select
            disabled={isLoading || requesterOptions.length === 1}
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
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <div className="form-actions">
        <LoadingButton icon={PlusCircle} loading={isLoading} type="submit">
          Enviar solicitud
        </LoadingButton>
      </div>
    </form>
  );
}
