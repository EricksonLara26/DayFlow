import { useMemo, useState } from "react";
import { UserPlus, X } from "lucide-react";
import Button from "../common/Button";
import LoadingButton from "../common/LoadingButton";
import { ROLES, getRoleLabel } from "../../data/users";
import { useDepartmentOptions } from "../../hooks/useCatalogOptions";
import {
  FORM_MIN_LENGTHS,
  allowedValueError,
  cleanField,
  emailError,
  getApiErrorMessage,
  getApiFieldErrors,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";

const allowedRoles = [ROLES.EMPLOYEE, ROLES.TECHNICIAN];

const initialForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  role: ROLES.EMPLOYEE,
  position: "",
  department: "",
};

export default function UserForm({ onCancel, onCreateUser, users }) {
  const { names: departmentNames } = useDepartmentOptions();
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const usernames = useMemo(() => users.map((user) => user.username.toLowerCase()), [users]);
  const emails = useMemo(() => users.map((user) => user.email.toLowerCase()), [users]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setError("");
    setSuccess("");
  }

  function validateForm() {
    const values = {
      firstName: cleanField(form.firstName),
      lastName: cleanField(form.lastName),
      username: cleanField(form.username),
      email: cleanField(form.email).toLowerCase(),
      password: cleanField(form.password),
      role: form.role,
      position: cleanField(form.position),
      department: cleanField(form.department),
    };
    const nextErrors = {};

    [
      ["firstName", values.firstName, "El nombre", FORM_MIN_LENGTHS.name],
      ["lastName", values.lastName, "El apellido", FORM_MIN_LENGTHS.name],
      ["username", values.username, "El nombre de usuario", FORM_MIN_LENGTHS.username],
      ["password", values.password, "La contraseña", FORM_MIN_LENGTHS.password, true],
      ["position", values.position, "El cargo", FORM_MIN_LENGTHS.position],
    ].forEach(([field, value, label, minLength, feminine]) => {
      const required = requiredError(value, label, { feminine: Boolean(feminine) });
      const min = required ? "" : minLengthError(value, label, minLength);
      const fieldError = required || min;

      if (fieldError) {
        nextErrors[field] = fieldError;
      }
    });

    const emailValidation = emailError(values.email);

    if (emailValidation) {
      nextErrors.email = emailValidation;
    }

    const roleValidation = allowedValueError(values.role, allowedRoles, "El rol");

    if (roleValidation) {
      nextErrors.role = roleValidation;
    }

    const departmentRequired = requiredError(values.department, "El departamento");
    const departmentValidation = departmentRequired || allowedValueError(values.department, departmentNames, "El departamento");

    if (departmentValidation) {
      nextErrors.department = departmentValidation;
    }

    if (!nextErrors.username && usernames.includes(values.username.toLowerCase())) {
      nextErrors.username = "Ese nombre de usuario ya existe.";
    }

    if (!nextErrors.email && emails.includes(values.email.toLowerCase())) {
      nextErrors.email = "Ese correo ya está en uso.";
    }

    return { errors: nextErrors, values };
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const { errors, values } = validateForm();

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados antes de crear el usuario.");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setFieldErrors({});
    setIsLoading(true);

    window.setTimeout(() => {
      Promise.resolve(onCreateUser(values))
        .then((result) => {
          setIsLoading(false);

          if (result?.ok === false) {
            setFieldErrors(getApiFieldErrors(result));
            setError(getApiErrorMessage(result, "No se pudo crear el usuario."));
            return;
          }

          setForm(initialForm);
          setError("");
          setSuccess(result?.message ?? "Usuario creado correctamente.");
        })
        .catch(() => {
          setIsLoading(false);
          setError("No se pudo crear el usuario.");
        });
    }, 300);
  }

  return (
    <form className="form-panel user-form" noValidate onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Registro</p>
          <h2 id="new-user-title">Nuevo usuario</h2>
        </div>
      </div>
      <div className="form-grid two-columns">
        <label className="field">
          <span>Nombre</span>
          <input
            aria-invalid={Boolean(fieldErrors.firstName)}
            disabled={isLoading}
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
          />
          {fieldErrors.firstName ? <p className="field-error">{fieldErrors.firstName}</p> : null}
        </label>
        <label className="field">
          <span>Apellido</span>
          <input
            aria-invalid={Boolean(fieldErrors.lastName)}
            disabled={isLoading}
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
          />
          {fieldErrors.lastName ? <p className="field-error">{fieldErrors.lastName}</p> : null}
        </label>
        <label className="field">
          <span>Nombre de usuario</span>
          <input
            aria-invalid={Boolean(fieldErrors.username)}
            disabled={isLoading}
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
          />
          {fieldErrors.username ? <p className="field-error">{fieldErrors.username}</p> : null}
        </label>
        <label className="field">
          <span>Correo</span>
          <input
            aria-invalid={Boolean(fieldErrors.email)}
            disabled={isLoading}
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
          {fieldErrors.email ? <p className="field-error">{fieldErrors.email}</p> : null}
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            aria-invalid={Boolean(fieldErrors.password)}
            disabled={isLoading}
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
          {fieldErrors.password ? <p className="field-error">{fieldErrors.password}</p> : null}
        </label>
        <label className="field">
          <span>Rol</span>
          <select
            aria-invalid={Boolean(fieldErrors.role)}
            disabled={isLoading}
            value={form.role}
            onChange={(event) => updateField("role", event.target.value)}
          >
            <option value={ROLES.EMPLOYEE}>{getRoleLabel(ROLES.EMPLOYEE)}</option>
            <option value={ROLES.TECHNICIAN}>{getRoleLabel(ROLES.TECHNICIAN)}</option>
          </select>
          {fieldErrors.role ? <p className="field-error">{fieldErrors.role}</p> : null}
        </label>
        <label className="field">
          <span>Cargo</span>
          <input
            aria-invalid={Boolean(fieldErrors.position)}
            disabled={isLoading}
            value={form.position}
            onChange={(event) => updateField("position", event.target.value)}
          />
          {fieldErrors.position ? <p className="field-error">{fieldErrors.position}</p> : null}
        </label>
        <label className="field span-2">
          <span>Área/departamento</span>
          <select
            aria-invalid={Boolean(fieldErrors.department)}
            disabled={isLoading}
            value={form.department}
            onChange={(event) => updateField("department", event.target.value)}
          >
            <option value="">Selecciona un departamento</option>
            {departmentNames.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          {fieldErrors.department ? <p className="field-error">{fieldErrors.department}</p> : null}
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      <div className="form-actions">
        {onCancel ? (
          <Button disabled={isLoading} icon={X} variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <LoadingButton icon={UserPlus} loading={isLoading} type="submit">
          Crear usuario
        </LoadingButton>
      </div>
    </form>
  );
}
