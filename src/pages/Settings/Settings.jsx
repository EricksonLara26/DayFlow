import { KeyRound, Moon } from "lucide-react";
import { useState } from "react";
import LoadingButton from "../../components/common/LoadingButton";
import "./Settings.css";

export function SettingsContent({ onChangePassword, onUpdatePreferences, preferences }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    const currentForm = passwordForm;
    setError("");
    setMessage("");
    setIsLoading(true);

    window.setTimeout(() => {
      const result = onChangePassword(currentForm);
      setIsLoading(false);

      if (!result.ok) {
        setError(result.message);
        setMessage("");
        return;
      }

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setError("");
      setMessage("Contraseña actualizada correctamente.");
    }, 300);
  }

  return (
    <div className="settings-content-grid">
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

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Seguridad</p>
            <h2>Cambio de contraseña</h2>
          </div>
          <KeyRound size={20} aria-hidden="true" />
        </div>
        <form className="password-form" onSubmit={handlePasswordSubmit}>
          <label className="field">
            <span>Contraseña actual</span>
            <input
              disabled={isLoading}
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
            />
          </label>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Nueva contraseña</span>
              <input
                disabled={isLoading}
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField("newPassword", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Confirmar contraseña</span>
              <input
                disabled={isLoading}
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
              />
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

export default function Settings({ onChangePassword, onUpdatePreferences, preferences }) {
  return (
    <div className="page-stack settings-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Personalización del sistema</p>
          <h2>Configuración visual y seguridad</h2>
        </div>
        <strong>{preferences.darkMode ? "Modo oscuro" : "Modo claro"}</strong>
      </section>

      <SettingsContent
        onChangePassword={onChangePassword}
        onUpdatePreferences={onUpdatePreferences}
        preferences={preferences}
      />
    </div>
  );
}
