import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import LoadingButton from "../../components/common/LoadingButton";
import "./Login.css";

export default function Login({ message, onLogin }) {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const identifier = form.identifier.trim();
    const password = form.password.trim();

    if (!identifier || !password) {
      setError("Completa usuario y contraseña.");
      return;
    }

    setError("");
    setIsLoading(true);

    window.setTimeout(() => {
      const result = onLogin({ identifier, password });
      setIsLoading(false);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      setError("");
    }, 300);
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
                aria-label="Usuario, correo o nombre"
                disabled={isLoading}
                placeholder="Usuario, correo o nombre"
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
                aria-label="Contraseña"
                disabled={isLoading}
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                autoComplete="current-password"
              />
            </div>
          </label>

          {message ? <p className="form-success">{message}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}

          <LoadingButton className="wide" loading={isLoading} type="submit">
            Iniciar sesión
          </LoadingButton>
        </form>
      </section>
    </main>
  );
}
