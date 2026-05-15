import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import Button from "../../components/common/Button";
import "./Login.css";

export default function Login({ onLogin }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    userType: "ADMIN",
  });
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const result = onLogin(form);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setError("");
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <img src="/dayflow-mark.png" alt="" />
          <div>
            <strong>DayFlow</strong>
            <span>Gestion interna de soporte</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">Acceso seguro</p>
          <h1>Accede al panel de soporte tecnico</h1>
          <p className="login-copy">
            Ingresa con tus credenciales corporativas para gestionar solicitudes y seguimiento operativo.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nombre de usuario</span>
            <div className="input-icon">
              <UserRound size={17} aria-hidden="true" />
              <input
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="field">
            <span>Contrasena</span>
            <div className="input-icon">
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          <label className="field">
            <span>Tipo de usuario</span>
            <select value={form.userType} onChange={(event) => updateField("userType", event.target.value)}>
              <option value="ADMIN">Admin/Tecnico</option>
              <option value="EMPLOYEE">Empleado</option>
            </select>
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <Button className="wide" type="submit">
            Iniciar sesion
          </Button>
        </form>
      </section>
    </main>
  );
}
