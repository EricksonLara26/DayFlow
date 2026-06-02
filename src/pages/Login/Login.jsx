import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import LoadingButton from "../../components/common/LoadingButton";
import {
  FORM_MIN_LENGTHS,
  cleanField,
  getApiErrorMessage,
  getApiFieldErrors,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";
import "./Login.css";

export default function Login({ message, onLogin }) {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setError("");
  }

  function validateForm() {
    const identifier = cleanField(form.identifier);
    const password = cleanField(form.password);
    const nextErrors = {};

    const identifierRequired = requiredError(identifier, "El usuario, correo o nombre");
    const passwordRequired = requiredError(password, "La contraseña", { feminine: true });

    if (identifierRequired) {
      nextErrors.identifier = identifierRequired;
    } else {
      const identifierMin = minLengthError(identifier, "El usuario, correo o nombre", FORM_MIN_LENGTHS.identifier);

      if (identifierMin) {
        nextErrors.identifier = identifierMin;
      }
    }

    if (passwordRequired) {
      nextErrors.password = passwordRequired;
    } else {
      const passwordMin = minLengthError(password, "La contraseña", FORM_MIN_LENGTHS.password);

      if (passwordMin) {
        nextErrors.password = passwordMin;
      }
    }

    return {
      errors: nextErrors,
      values: {
        identifier,
        password,
      },
    };
  }

  function handleSubmit(event) {
    event.preventDefault();
    const { errors, values } = validateForm();

    if (isLoading) {
      return;
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados antes de iniciar sesión.");
      return;
    }

    setError("");
    setFieldErrors({});
    setIsLoading(true);

    window.setTimeout(() => {
      Promise.resolve(onLogin(values))
        .then((result) => {
          setIsLoading(false);

          if (result?.ok !== true) {
            setFieldErrors(getApiFieldErrors(result));
            setError(getApiErrorMessage(result, "No se pudo iniciar sesión."));
            return;
          }

          setError("");
        })
        .catch(() => {
          setIsLoading(false);
          setError("No se pudo iniciar sesión.");
        });
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
            <div className={`input-icon ${fieldErrors.identifier ? "field-invalid" : ""}`.trim()}>
              <UserRound size={17} aria-hidden="true" />
              <input
                aria-label="Usuario, correo o nombre"
                aria-invalid={Boolean(fieldErrors.identifier)}
                disabled={isLoading}
                placeholder="Usuario, correo o nombre"
                value={form.identifier}
                onChange={(event) => updateField("identifier", event.target.value)}
                autoComplete="username"
              />
            </div>
            {fieldErrors.identifier ? <p className="field-error">{fieldErrors.identifier}</p> : null}
          </label>

          <label className="field">
            <span>Contraseña</span>
            <div className={`input-icon ${fieldErrors.password ? "field-invalid" : ""}`.trim()}>
              <LockKeyhole size={17} aria-hidden="true" />
              <input
                aria-label="Contraseña"
                aria-invalid={Boolean(fieldErrors.password)}
                disabled={isLoading}
                placeholder="Contraseña"
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                autoComplete="current-password"
              />
            </div>
            {fieldErrors.password ? <p className="field-error">{fieldErrors.password}</p> : null}
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
