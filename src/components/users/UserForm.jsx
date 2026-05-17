import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import Button from "../common/Button";
import { ROLES, getRoleLabel } from "../../data/users";

const initialForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  role: ROLES.EMPLOYEE,
  jobTitle: "",
  department: "",
};

export default function UserForm({ onCancel, onCreateUser, users }) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = form.email.trim().toLowerCase();
    const username = form.username.trim();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Nombre y apellido son obligatorios.");
      return;
    }

    if (!form.jobTitle.trim() || !form.department.trim()) {
      setError("Cargo y área/departamento son obligatorios.");
      return;
    }

    if (!username) {
      setError("El nombre de usuario no debe estar vacio.");
      return;
    }

    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      setError("Ese nombre de usuario ya existe.");
      return;
    }

    if (!form.password.trim()) {
      setError("La contraseña no debe estar vacía.");
      return;
    }

    if (!emailPattern.test(email) || !email.endsWith(".com")) {
      setError("El correo debe tener formato válido y terminar en .com.");
      return;
    }

    const result = onCreateUser({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username,
      email,
      password: form.password.trim(),
      role: form.role,
      jobTitle: form.jobTitle.trim(),
      department: form.department.trim(),
    });

    if (result?.ok === false) {
      setError(result.message);
      return;
    }

    setForm(initialForm);
    setError("");
  }

  return (
    <form className="form-panel user-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Registro</p>
          <h2 id="new-user-title">Nuevo usuario</h2>
        </div>
      </div>
      <div className="form-grid two-columns">
        <label className="field">
          <span>Nombre</span>
          <input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} />
        </label>
        <label className="field">
          <span>Apellido</span>
          <input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} />
        </label>
        <label className="field">
          <span>Nombre de usuario</span>
          <input value={form.username} onChange={(event) => updateField("username", event.target.value)} />
        </label>
        <label className="field">
          <span>Correo</span>
          <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Rol</span>
          <select value={form.role} onChange={(event) => updateField("role", event.target.value)}>
            <option value={ROLES.EMPLOYEE}>{getRoleLabel(ROLES.EMPLOYEE)}</option>
            <option value={ROLES.TECHNICIAN}>{getRoleLabel(ROLES.TECHNICIAN)}</option>
          </select>
        </label>
        <label className="field">
          <span>Cargo</span>
          <input value={form.jobTitle} onChange={(event) => updateField("jobTitle", event.target.value)} />
        </label>
        <label className="field span-2">
          <span>Área/departamento</span>
          <input value={form.department} onChange={(event) => updateField("department", event.target.value)} />
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        {onCancel ? (
          <Button icon={X} variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
        <Button icon={UserPlus} type="submit">
          Crear usuario
        </Button>
      </div>
    </form>
  );
}
