import { useMemo, useState } from "react";
import { Bell, Clock, LockKeyhole, Mail, Phone, Settings, User } from "lucide-react";
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
  const [activeSection, setActiveSection] = useState("profile");
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
  const profileName = profile.username || "Usuario DayFlow";
  const profileEmail = profile.email || "Sin correo registrado";
  const profileInitials = useMemo(() => {
    const parts = profileName
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2);

    return (parts.map((part) => part[0]).join("") || "DF").toUpperCase();
  }, [profileName]);
  const currentThemeLabel =
    themeOptions.find((option) => option.id === themeMode)?.label ?? "Claro";
  const currentTimeLabel =
    timeFormatOptions.find((option) => option.id === timeFormat)?.label ?? "Automatico";
  const settingsSections = [
    { id: "profile", label: "Perfil", value: profileName, icon: User },
    { id: "appearance", label: "Apariencia", value: currentThemeLabel, icon: Settings },
    { id: "time", label: "Horario", value: currentTimeLabel, icon: Clock },
    {
      id: "notifications",
      label: "Avisos",
      value: notificationsEnabled ? "Activos" : "Pausados",
      icon: Bell,
    },
  ];

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
      <div className="settings-heading settings-heading-split">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h1>Ajustes</h1>
        </div>
        <div className="settings-user-chip" aria-label="Cuenta actual">
          <span className="settings-user-avatar">{profileInitials}</span>
          <span>
            <strong>{profileName}</strong>
            <small>{profileEmail}</small>
          </span>
        </div>
      </div>

      <nav className="settings-section-bar" aria-label="Secciones de configuracion">
        {settingsSections.map((section) => {
          const SectionIcon = section.icon;

          return (
            <button
              className={activeSection === section.id ? "settings-section-tab active" : "settings-section-tab"}
              type="button"
              key={section.id}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="settings-tab-icon">
                <SectionIcon size={18} />
              </span>
              <span>
                <strong>{section.label}</strong>
                <small>{section.value}</small>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="settings-workspace">
        {activeSection === "profile" && (
          <article className="panel settings-panel profile-login-panel" aria-label="Perfil de usuario">
            <div className="profile-login-hero">
              <img className="profile-login-logo" src="/dayflow-mark.png" alt="" />
              <span className="profile-avatar-large">{profileInitials}</span>
              <div className="profile-login-copy">
                <p className="eyebrow">Cuenta DayFlow</p>
                <h2>{profileName}</h2>
                <span>
                  <Mail size={16} />
                  {profileEmail}
                </span>
              </div>
              <span className="session-status">
                <LockKeyhole size={15} />
                Sesion activa
              </span>
            </div>

            <div className="profile-login-grid">
              <div className="profile-editor-column">
                <div className="settings-editor-title">
                  <div>
                    <p className="eyebrow">Usuario</p>
                    <h2>Perfil de acceso</h2>
                  </div>
                  <User size={20} />
                </div>

                <div className="settings-form profile-form-grid">
                  <label className="field">
                    Nombre de usuario
                    <div className="input-with-icon">
                      <User size={17} />
                      <input
                        value={profile.username}
                        onChange={(event) => onProfileChange("username", event.target.value)}
                        placeholder="Usuario DayFlow"
                      />
                    </div>
                  </label>
                  <label className="field">
                    Correo electronico
                    <div className="input-with-icon">
                      <Mail size={17} />
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(event) => onProfileChange("email", event.target.value)}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </label>
                  <label className="field">
                    Numero de celular
                    <div className="input-with-icon">
                      <Phone size={17} />
                      <input
                        type="tel"
                        value={profile.phone}
                        onChange={(event) => onProfileChange("phone", event.target.value)}
                        placeholder="+1 829 000 0000"
                      />
                    </div>
                  </label>
                </div>

                <div className="settings-actions-row">
                  <button className="primary-button" type="button" onClick={onSaveProfile}>
                    Guardar perfil
                  </button>
                </div>
              </div>

              <div className="profile-security-column">
                <div className="profile-login-meta">
                  <div>
                    <span>Metodo de acceso</span>
                    <strong>Correo y contrasena</strong>
                  </div>
                  <div>
                    <span>Correo principal</span>
                    <strong>{profileEmail}</strong>
                  </div>
                  <div>
                    <span>Telefono</span>
                    <strong>{profile.phone || "Pendiente"}</strong>
                  </div>
                </div>

                <div className="password-change-box profile-password-box">
                  <div className="password-change-header">
                    <div>
                      <p className="eyebrow">Seguridad</p>
                      <h3>Contrasena</h3>
                      <span>Acceso protegido para tu cuenta.</span>
                    </div>
                    <button className="outline-button" type="button" onClick={openPasswordChange}>
                      <LockKeyhole size={17} />
                      Cambiar
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
                          Confirmar
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
              </div>
            </div>
          </article>
        )}

        {activeSection === "appearance" && (
          <article className="panel settings-panel settings-editor-panel" aria-label="Apariencia">
            <div className="settings-editor-title">
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
                  type="button"
                  key={option.id}
                  onClick={() => onThemeModeChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </article>
        )}

        {activeSection === "time" && (
          <article className="panel settings-panel settings-editor-panel" aria-label="Formato de hora">
            <div className="settings-editor-title">
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
                  type="button"
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
        )}

        {activeSection === "notifications" && (
          <article className="panel settings-panel settings-editor-panel" aria-label="Notificaciones">
            <div className="settings-editor-title">
              <div>
                <p className="eyebrow">Recordatorios</p>
                <h2>Notificaciones</h2>
              </div>
              <Bell size={20} />
            </div>
            <label className="toggle-row settings-toggle settings-switch-row">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(event) => onNotificationsEnabledChange(event.target.checked)}
              />
              <span>
                <strong>Recordatorios</strong>
                <small>{notificationsEnabled ? "Activos" : "Pausados"}</small>
              </span>
            </label>
          </article>
        )}
      </div>
    </section>
  );
}
