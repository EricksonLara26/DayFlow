import { Check, KeyRound, LayoutDashboard, Moon, PanelLeft, PanelLeftDashed, PanelTop } from "lucide-react";
import { useState } from "react";
import Button from "../../components/common/Button";
import "./Settings.css";

const navigationOptions = [
  {
    id: "sidebar",
    label: "Barra lateral",
    icon: PanelLeft,
  },
  {
    id: "top",
    label: "Barra superior",
    icon: PanelTop,
  },
  {
    id: "compact",
    label: "Sidebar compacto",
    icon: PanelLeftDashed,
  },
];

export default function Settings({ onChangePassword, onUpdatePreferences, preferences }) {
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updatePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();
    const result = onChangePassword(passwordForm);

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
    setMessage("Contrasena actualizada correctamente.");
  }

  return (
    <div className="page-stack settings-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Personalizacion del sistema</p>
          <h2>Configuracion visual y seguridad</h2>
        </div>
        <strong>{preferences.darkMode ? "Modo oscuro" : "Modo claro"}</strong>
      </section>

      <section className="panel settings-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Navegacion</p>
            <h2>Posicion del menu</h2>
          </div>
          <LayoutDashboard size={20} aria-hidden="true" />
        </div>
        <div className="segmented-options">
          {navigationOptions.map((option) => {
            const Icon = option.icon;
            const isActive = preferences.navigationMode === option.id;

            return (
              <button
                className={`segmented-option ${isActive ? "active" : ""}`}
                key={option.id}
                type="button"
                onClick={() => onUpdatePreferences({ navigationMode: option.id })}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{option.label}</span>
                {isActive ? <Check size={16} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      </section>

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
            <small>Aplica colores de alto contraste en paneles, tablas, formularios y navegacion.</small>
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
            <h2>Cambio de contrasena</h2>
          </div>
          <KeyRound size={20} aria-hidden="true" />
        </div>
        <form className="password-form" onSubmit={handlePasswordSubmit}>
          <label className="field">
            <span>Contrasena actual</span>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => updatePasswordField("currentPassword", event.target.value)}
            />
          </label>
          <div className="form-grid two-columns">
            <label className="field">
              <span>Nueva contrasena</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => updatePasswordField("newPassword", event.target.value)}
              />
            </label>
            <label className="field">
              <span>Confirmar contrasena</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => updatePasswordField("confirmPassword", event.target.value)}
              />
            </label>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {message ? <p className="form-success">{message}</p> : null}
          <div className="form-actions">
            <Button icon={KeyRound} type="submit">
              Actualizar contrasena
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
