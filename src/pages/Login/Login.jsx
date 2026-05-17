import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import Button from "../../components/common/Button";
import "./Login.css";

export default function Login({ message, onLogin }) {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
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
            <span>Gestión interna de soporte</span>
          </div>
        </div>

        <div>
          <p className="eyebrow">Acceso seguro</p>
          <h1>Accede a DayFlow</h1>
          <p className="login-copy">
            Ingresa con tus credenciales corporativas. El sistema identificará tu rol automáticamente.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Usuario, correo o nombre de usuario</span>
            <div className="input-icon">
              <UserRound size={17} aria-hidden="true" />
              <input
                value={form.identifier}
                onChange={(event) => updateField("identifier", event.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="field">
            <span>Contraseña</span>
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

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <Button className="wide" type="submit">
            Iniciar sesión
          </Button>
        </form>
      </section>
    </main>
  );
}
