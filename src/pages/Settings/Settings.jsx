import { KeyRound, Moon } from "lucide-react";
import { useState } from "react";
import LoadingButton from "../../components/common/LoadingButton";
import {
  FORM_MIN_LENGTHS,
  cleanField,
  confirmationError,
  getApiErrorMessage,
  getApiFieldErrors,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";
import "./Settings.css";

export function SettingsContent({
  onChangePassword,
  onUpdatePreferences,
  preferences,
  requirePasswordChange = false,
}) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setError("");
    setMessage("");
  }

  function validatePasswordForm() {
    const values = {
      currentPassword: cleanField(passwordForm.currentPassword),
      newPassword: cleanField(passwordForm.newPassword),
      confirmPassword: cleanField(passwordForm.confirmPassword),
    };
    const nextErrors = {};
    const currentRequired = requiredError(values.currentPassword, "La contraseña actual", { feminine: true });
    const newRequired = requiredError(values.newPassword, "La nueva contraseña", { feminine: true });
    const confirmRequired = requiredError(values.confirmPassword, "La confirmación", { feminine: true });

    if (currentRequired) {
      nextErrors.currentPassword = currentRequired;
    }

    if (newRequired) {
      nextErrors.newPassword = newRequired;
    } else {
      const min = minLengthError(values.newPassword, "La nueva contraseña", FORM_MIN_LENGTHS.password);

      if (min) {
        nextErrors.newPassword = min;
      }
    }

    if (values.newPassword && values.currentPassword && values.newPassword === values.currentPassword) {
      nextErrors.newPassword = "La nueva contraseña debe ser diferente a la actual o temporal.";
    }

    if (confirmRequired) {
      nextErrors.confirmPassword = confirmRequired;
    } else if (!nextErrors.newPassword) {
      const confirmation = confirmationError(values.newPassword, values.confirmPassword);

      if (confirmation) {
        nextErrors.confirmPassword = confirmation;
      }
    }

    return { errors: nextErrors, values };
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const { errors, values } = validatePasswordForm();

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados antes de actualizar.");
      setMessage("");
      return;
    }

    setError("");
    setMessage("");
    setFieldErrors({});
    setIsLoading(true);

    window.setTimeout(() => {
      Promise.resolve(onChangePassword(values)).then((result) => {
        setIsLoading(false);

      if (result?.ok !== true) {
        setFieldErrors(getApiFieldErrors(result));
        setError(getApiErrorMessage(result, "No se pudo actualizar la contraseña."));
        setMessage("");
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setFieldErrors({});
      setError("");
      setMessage("Contraseña actualizada correctamente.");
      }).catch(() => {
        setIsLoading(false);
        setError("No se pudo actualizar la contraseña.");
        setMessage("");
      });
    }, 300);
  }

  return (
    <div className={`settings-content-grid ${requirePasswordChange ? "password-required" : ""}`.trim()}>
      {!requirePasswordChange ? (
        <section className="panel settings-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Apariencia</p>
              <h2>Modo oscuro</h2>
            </div>
            <Moon size={20} aria-hidden="true" />
          </div>
          <label className="toggle-row">
            <span>
              <strong>Activar modo oscuro</strong>
              <small>Aplica colores de alto contraste en paneles, tablas, formularios y navegación.</small>
            </span>
            <input
              checked={preferences.darkMode}
              type="checkbox"
              onChange={(event) => onUpdatePreferences({ darkMode: event.target.checked })}
            />
          </label>
        </section>
      ) : null}

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2>{requirePasswordChange ? "Crea una nueva contraseña" : "Cambio de contraseña"}</h2>
          </div>
          <KeyRound size={20} aria-hidden="true" />
        </div>
        {requirePasswordChange ? (
          <p className="password-required-alert">Debes cambiar tu contraseña para continuar.</p>
        ) : null}
        <form className="password-form" noValidate onSubmit={handlePasswordSubmit}>
          <label className="field">
            <span>Contraseña actual</span>
            <input
              aria-invalid={Boolean(fieldErrors.currentPassword)}
              disabled={isLoading}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
            />
            {fieldErrors.currentPassword ? <p className="field-error">{fieldErrors.currentPassword}</p> : null}
          </label>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Nueva contraseña</span>
              <input
                aria-invalid={Boolean(fieldErrors.newPassword)}
                disabled={isLoading}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField("newPassword", event.target.value)}
              />
              {fieldErrors.newPassword ? <p className="field-error">{fieldErrors.newPassword}</p> : null}
            </label>
            <label className="field">
              <span>Confirmar contraseña</span>
              <input
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                disabled={isLoading}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
              />
              {fieldErrors.confirmPassword ? <p className="field-error">{fieldErrors.confirmPassword}</p> : null}
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}
          <div className="form-actions">
            <LoadingButton icon={KeyRound} loading={isLoading} type="submit">
              Actualizar contraseña
            </LoadingButton>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Settings({
  onChangePassword,
  onUpdatePreferences,
  preferences,
  requirePasswordChange = false,
}) {
  return (
    <div className="page-stack settings-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">{requirePasswordChange ? "Acceso temporal" : "Personalización del sistema"}</p>
          <h2>{requirePasswordChange ? "Actualiza tu contraseña" : "Configuración visual y seguridad"}</h2>
        </div>
        <strong>{requirePasswordChange ? "Requerido" : preferences.darkMode ? "Modo oscuro" : "Modo claro"}</strong>
      </section>

      <SettingsContent
        requirePasswordChange={requirePasswordChange}
        onChangePassword={onChangePassword}
        onUpdatePreferences={onUpdatePreferences}
        preferences={preferences}
      />
    </div>
  );
}
