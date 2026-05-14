import { useState } from "react";
import { UserPlus } from "lucide-react";
import Button from "../common/Button";

const initialForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  password: "",
  role: "EMPLOYEE",
};

export default function UserForm({ onCreateUser, users }) {
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

    if (!username) {
      setError("El nombre de usuario no debe estar vacio.");
      return;
    }

    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      setError("Ese nombre de usuario ya existe.");
      return;
    }

    if (!form.password.trim()) {
      setError("La contrasena no debe estar vacia.");
      return;
    }

    if (!emailPattern.test(email) || !email.endsWith(".com")) {
      setError("El correo debe tener formato valido y terminar en .com.");
      return;
    }

    onCreateUser({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      username,
      email,
      password: form.password.trim(),
    });
    setForm(initialForm);
    setError("");
  }

  return (
    <form className="form-panel user-form" onSubmit={handleSubmit}>
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
          <span>Contrasena</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
        </label>
        <label className="field">
          <span>Rol</span>
          <select value={form.role} onChange={(event) => updateField("role", event.target.value)}>
            <option value="EMPLOYEE">Empleado</option>
          </select>
        </label>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <div className="form-actions">
        <Button icon={UserPlus} type="submit">
          Crear empleado
        </Button>
      </div>
    </form>
  );
}
