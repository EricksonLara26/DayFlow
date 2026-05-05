import { useState } from "react";
import { Bell, Clock, LockKeyhole, Settings, User } from "lucide-react";
import { detectUserTimeFormat } from "../../utils/timeUtils";

// Pantalla de ajustes: tema, formato de hora, recordatorios y datos del perfil.
export default function SettingsView({
  themeMode,
  onThemeModeChange,
  profile,
  onProfileChange,
  onSaveProfile,
  notificationsEnabled,
  onNotificationsEnabledChange,
  timeFormat,
  onTimeFormatChange,
}) {
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordNoticeType, setPasswordNoticeType] = useState("success");
  const themeOptions = [
    { id: "light", label: "Claro" },
    { id: "dark", label: "Oscuro" },
  ];
  const timeFormatOptions = [
    { id: "automatic", label: "Automatico" },
    { id: "12h", label: "AM/PM" },
    { id: "24h", label: "24 h" },
  ];
  const detectedTimeFormat = detectUserTimeFormat();

  function openPasswordChange() {
    setPasswordNotice("");
    setPasswordDraft("");
    setPasswordConfirm("");
    setIsPasswordFormOpen(true);
  }

  function closePasswordChange() {
    setPasswordDraft("");
    setPasswordConfirm("");
    setIsPasswordFormOpen(false);
  }

  // Validacion local del cambio de contrasena hasta conectar persistencia real.
  function confirmPasswordChange() {
    if (passwordDraft.trim().length < 6) {
      setPasswordNoticeType("error");
      setPasswordNotice("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (passwordDraft !== passwordConfirm) {
      setPasswordNoticeType("error");
      setPasswordNotice("La confirmacion no coincide.");
      return;
    }

    setPasswordNoticeType("success");
    setPasswordNotice("Contrasena actualizada.");
    closePasswordChange();
  }

  return (
    <section className="settings-page" aria-label="Ajustes">
      <div className="settings-heading">
        <p className="eyebrow">Configuracion</p>
        <h1>Ajustes</h1>
      </div>

      <div className="settings-layout">
        <div className="settings-side">
          <article className="panel settings-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Tema</p>
                <h2>Apariencia</h2>
              </div>
              <Settings size={20} />
            </div>
            <div className="segmented settings-segmented">
              {themeOptions.map((option) => (
                <button
                  className={themeMode === option.id ? "active" : ""}
                  key={option.id}
                  onClick={() => onThemeModeChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>

          <article className="panel settings-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Horario</p>
                <h2>Formato de hora</h2>
              </div>
              <Clock size={20} />
            </div>
            <div className="segmented settings-segmented">
              {timeFormatOptions.map((option) => (
                <button
                  className={timeFormat === option.id ? "active" : ""}
                  key={option.id}
                  onClick={() => onTimeFormatChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="settings-hint">
              Deteccion actual: {detectedTimeFormat === "12h" ? "AM/PM" : "24 horas"}.
            </p>
          </article>

          <article className="panel settings-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Recordatorios</p>
                <h2>Notificaciones</h2>
              </div>
              <Bell size={20} />
            </div>
            <label className="toggle-row settings-toggle">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(event) => onNotificationsEnabledChange(event.target.checked)}
              />
              Activar notificaciones de recordatorios
            </label>
          </article>
        </div>

        <article className="panel settings-panel profile-settings">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Usuario</p>
              <h2>Editar perfil</h2>
            </div>
            <User size={20} />
          </div>

          <div className="account-summary">
            <span className="account-icon">
              <User size={21} />
            </span>
            <div>
              <strong>{profile.username || "Usuario DayFlow"}</strong>
              <span>{profile.email || "Sin correo registrado"}</span>
            </div>
          </div>

          <div className="settings-form">
            <div className="profile-locked-field">
              <span>Nombre de usuario</span>
              <strong>{profile.username || "Usuario DayFlow"}</strong>
            </div>
            <label className="field">
              Correo electronico
              <input
                type="email"
                value={profile.email}
                onChange={(event) => onProfileChange("email", event.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </label>
            <label className="field">
              Numero de celular
              <input
                type="tel"
                value={profile.phone}
                onChange={(event) => onProfileChange("phone", event.target.value)}
                placeholder="+1 829 000 0000"
              />
            </label>
          </div>

          <div className="settings-actions-row">
            <button className="primary-button" type="button" onClick={onSaveProfile}>
              Guardar cambios
            </button>
          </div>

          <div className="password-change-box">
            <div className="password-change-header">
              <div>
                <p className="eyebrow">Seguridad</p>
                <h3>Contrasena</h3>
                <span>Actualiza tu acceso con una confirmacion.</span>
              </div>
              <button className="outline-button" type="button" onClick={openPasswordChange}>
                <LockKeyhole size={17} />
                Cambiar contrasena
              </button>
            </div>

            {isPasswordFormOpen && (
              <div className="password-form">
                <label className="field">
                  Nueva contrasena
                  <input
                    type="password"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                    placeholder="Nueva contrasena"
                  />
                </label>
                <label className="field">
                  Confirmar contrasena
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(event) => setPasswordConfirm(event.target.value)}
                    placeholder="Confirmar contrasena"
                  />
                </label>
                <div className="password-actions">
                  <button className="primary-button" type="button" onClick={confirmPasswordChange}>
                    Confirmar cambio
                  </button>
                  <button className="text-button" type="button" onClick={closePasswordChange}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {passwordNotice && (
              <p className={`password-notice ${passwordNoticeType}`} aria-live="polite">
                {passwordNotice}
              </p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}
