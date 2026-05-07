import { useMemo, useState } from "react";
import { Bell, Clock, LockKeyhole, Mail, Moon, Phone, Sun, User } from "lucide-react";
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
  currentPassword,
  onPasswordChange,
  timeFormat,
  onTimeFormatChange,
}) {
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordMode, setPasswordMode] = useState("current");
  const [currentPasswordDraft, setCurrentPasswordDraft] = useState("");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [recoveryChannel, setRecoveryChannel] = useState("email");
  const [recoveryStep, setRecoveryStep] = useState("choose");
  const [recoveryTarget, setRecoveryTarget] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCodeDraft, setRecoveryCodeDraft] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordNoticeType, setPasswordNoticeType] = useState("success");
  const [activeSection, setActiveSection] = useState("profile");
  const timeFormatOptions = [
    { id: "automatic", label: "Automatico" },
    { id: "12h", label: "AM/PM" },
    { id: "24h", label: "24 h" },
  ];
  const detectedTimeFormat = detectUserTimeFormat();
  const profileName = profile.username || "Usuario DayFlow";
  const profileEmail = profile.email || "Sin correo registrado";
  const profilePhone = profile.phone?.trim() || "";
  const demoRecoveryCode = "1234";
  const profileInitials = useMemo(() => {
    const parts = profileName
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2);

    return (parts.map((part) => part[0]).join("") || "DF").toUpperCase();
  }, [profileName]);
  const isDarkMode = themeMode === "dark";
  const ThemeModeIcon = isDarkMode ? Moon : Sun;
  const currentTimeLabel =
    timeFormatOptions.find((option) => option.id === timeFormat)?.label ?? "Automatico";
  const settingsSections = [
    { id: "profile", label: "Perfil", value: profileName, icon: User },
    { id: "time", label: "Horario", value: currentTimeLabel, icon: Clock },
    {
      id: "notifications",
      label: "Avisos",
      value: notificationsEnabled ? "Activos" : "Desactivados",
      icon: Bell,
    },
  ];
  const recoveryOptions = [
    {
      id: "email",
      label: "Correo electronico",
      value: profile.email?.trim() || "",
      displayValue: maskEmail(profile.email?.trim() || ""),
      icon: Mail,
    },
    {
      id: "phone",
      label: "Telefono",
      value: profilePhone,
      displayValue: maskPhone(profilePhone),
      icon: Phone,
    },
  ];

  function maskEmail(email) {
    if (!email) {
      return "No registrado";
    }

    const [name, domain] = email.split("@");
    if (!domain) {
      return email;
    }

    const first = name.slice(0, 2);
    return `${first}${"*".repeat(Math.max(name.length - 2, 3))}@${domain}`;
  }

  function maskPhone(phone) {
    if (!phone) {
      return "No registrado";
    }

    const digits = phone.replace(/\D/g, "");
    if (digits.length <= 4) {
      return phone;
    }

    return `*** *** ${digits.slice(-4)}`;
  }

  function openPasswordChange() {
    setPasswordNotice("");
    setPasswordMode("current");
    setCurrentPasswordDraft("");
    setPasswordDraft("");
    setPasswordConfirm("");
    setRecoveryCodeDraft("");
    setRecoveryStep("choose");
    setRecoveryTarget("");
    setVerificationCode("");
    setIsPasswordFormOpen(true);
  }

  function closePasswordChange() {
    setPasswordMode("current");
    setCurrentPasswordDraft("");
    setPasswordDraft("");
    setPasswordConfirm("");
    setRecoveryCodeDraft("");
    setRecoveryStep("choose");
    setRecoveryTarget("");
    setVerificationCode("");
    setIsPasswordFormOpen(false);
  }

  function validateNewPassword() {
    if (passwordDraft.trim().length < 6) {
      setPasswordNoticeType("error");
      setPasswordNotice("La contrasena debe tener al menos 6 caracteres.");
      return false;
    }

    if (passwordDraft !== passwordConfirm) {
      setPasswordNoticeType("error");
      setPasswordNotice("La confirmacion no coincide.");
      return false;
    }

    return true;
  }

  function savePasswordChange(message) {
    onPasswordChange(passwordDraft);
    setPasswordNoticeType("success");
    setPasswordNotice(message);
    closePasswordChange();
  }

  // Validacion local del cambio de contrasena hasta conectar persistencia real.
  function confirmPasswordChange() {
    if (!currentPassword) {
      setPasswordNoticeType("error");
      setPasswordNotice("No hay una contrasena actual registrada en esta sesion. Usa Olvide mi contrasena.");
      return;
    }

    if (!currentPasswordDraft.trim()) {
      setPasswordNoticeType("error");
      setPasswordNotice("Ingresa tu contrasena actual.");
      return;
    }

    if (currentPasswordDraft !== currentPassword) {
      setPasswordNoticeType("error");
      setPasswordNotice("La contrasena actual no coincide.");
      return;
    }

    if (!validateNewPassword()) {
      return;
    }

    savePasswordChange("Contrasena actualizada.");
  }

  function showRecoveryMode() {
    setPasswordMode("recovery");
    setCurrentPasswordDraft("");
    setPasswordDraft("");
    setPasswordConfirm("");
    setRecoveryCodeDraft("");
    setRecoveryStep("choose");
    setRecoveryTarget("");
    setVerificationCode("");
    setPasswordNotice("");
  }

  function sendRecoveryCode(channel) {
    const target = channel === "phone" ? profilePhone : profile.email?.trim() || "";
    const maskedTarget = channel === "phone" ? maskPhone(target) : maskEmail(target);

    if (!target) {
      setPasswordNoticeType("error");
      setPasswordNotice(
        channel === "phone"
          ? "Agrega un numero de telefono a tu perfil para recibir el codigo."
          : "Agrega un correo electronico a tu perfil para recibir el codigo.",
      );
      return;
    }

    setRecoveryChannel(channel);
    setRecoveryTarget(maskedTarget);
    setRecoveryStep("verify");
    setVerificationCode(demoRecoveryCode);
    setRecoveryCodeDraft("");
    setPasswordNoticeType("success");
    setPasswordNotice(`Codigo de 4 digitos enviado a ${maskedTarget}.`);
  }

  function verifyRecoveryCode() {
    if (!verificationCode) {
      setPasswordNoticeType("error");
      setPasswordNotice("Solicita primero un codigo de confirmacion.");
      return;
    }

    if (recoveryCodeDraft.trim() !== verificationCode) {
      setPasswordNoticeType("error");
      setPasswordNotice("El codigo de confirmacion no coincide.");
      return;
    }

    setRecoveryStep("reset");
    setPasswordNoticeType("success");
    setPasswordNotice("Codigo confirmado. Crea una nueva contrasena.");
  }

  function confirmRecoveryPasswordChange() {
    if (recoveryStep !== "reset") {
      setPasswordNoticeType("error");
      setPasswordNotice("Confirma primero el codigo enviado.");
      return;
    }

    if (!validateNewPassword()) {
      return;
    }

    savePasswordChange("Codigo confirmado. Contrasena actualizada.");
  }

  return (
    <section className="settings-page" aria-label="Ajustes">
      <div className="settings-heading settings-heading-split">
        <div>
          <p className="eyebrow">Configuracion</p>
          <h1>Ajustes</h1>
        </div>
        <button
          className="icon-button settings-theme-button"
          type="button"
          aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          title={isDarkMode ? "Modo oscuro" : "Modo claro"}
          onClick={() => onThemeModeChange(isDarkMode ? "light" : "dark")}
        >
          <ThemeModeIcon size={18} />
        </button>
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
                      <div className="password-mode-tabs" role="group" aria-label="Metodo para cambiar contrasena">
                        <button
                          className={passwordMode === "current" ? "active" : ""}
                          type="button"
                          aria-pressed={passwordMode === "current"}
                          onClick={() => {
                            setPasswordMode("current");
                            setPasswordNotice("");
                          }}
                        >
                          Contrasena actual
                        </button>
                        <button
                          className={passwordMode === "recovery" ? "active" : ""}
                          type="button"
                          aria-pressed={passwordMode === "recovery"}
                          onClick={showRecoveryMode}
                        >
                          Olvide mi contrasena
                        </button>
                      </div>

                      {passwordMode === "current" ? (
                        <>
                          <label className="field">
                            Contrasena actual
                            <input
                              type="password"
                              value={currentPasswordDraft}
                              onChange={(event) => setCurrentPasswordDraft(event.target.value)}
                              placeholder="Tu contrasena actual"
                            />
                          </label>
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
                            <button className="text-button" type="button" onClick={showRecoveryMode}>
                              Olvide mi contrasena
                            </button>
                            <button className="text-button" type="button" onClick={closePasswordChange}>
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="recovery-stepper" aria-label="Progreso de recuperacion">
                            <span className={recoveryStep === "choose" ? "active" : ""}>1</span>
                            <span className={recoveryStep === "verify" ? "active" : ""}>2</span>
                            <span className={recoveryStep === "reset" ? "active" : ""}>3</span>
                          </div>

                          {recoveryStep === "choose" && (
                            <div className="recovery-panel">
                              <div className="recovery-copy">
                                <strong>Elige donde recibir el codigo</strong>
                                <span>Usaremos un medio registrado en tu perfil para confirmar que eres tu.</span>
                              </div>
                              <div className="recovery-option-list">
                                {recoveryOptions.map((option) => {
                                  const OptionIcon = option.icon;

                                  return (
                                    <button
                                      className="recovery-option"
                                      type="button"
                                      key={option.id}
                                      disabled={!option.value}
                                      onClick={() => sendRecoveryCode(option.id)}
                                    >
                                      <span className="recovery-option-icon">
                                        <OptionIcon size={18} />
                                      </span>
                                      <span>
                                        <strong>{option.label}</strong>
                                        <small>{option.displayValue}</small>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="password-actions">
                                <button className="text-button" type="button" onClick={closePasswordChange}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}

                          {recoveryStep === "verify" && (
                            <div className="recovery-panel">
                              <div className="recovery-copy">
                                <strong>Ingresa el codigo</strong>
                                <span>Enviamos un codigo de 4 digitos a {recoveryTarget}.</span>
                              </div>
                              <label className="field">
                                Codigo de verificacion
                                <input
                                  className="verification-code-input"
                                  inputMode="numeric"
                                  maxLength={4}
                                  value={recoveryCodeDraft}
                                  onChange={(event) =>
                                    setRecoveryCodeDraft(event.target.value.replace(/\D/g, "").slice(0, 4))
                                  }
                                  placeholder="0000"
                                />
                              </label>
                              <div className="password-actions">
                                <button className="primary-button" type="button" onClick={verifyRecoveryCode}>
                                  Verificar
                                </button>
                                <button className="outline-button" type="button" onClick={() => sendRecoveryCode(recoveryChannel)}>
                                  Reenviar codigo
                                </button>
                                <button
                                  className="text-button"
                                  type="button"
                                  onClick={() => {
                                    setRecoveryStep("choose");
                                    setRecoveryCodeDraft("");
                                    setVerificationCode("");
                                    setPasswordNotice("");
                                  }}
                                >
                                  Cambiar metodo
                                </button>
                              </div>
                            </div>
                          )}

                          {recoveryStep === "reset" && (
                            <div className="recovery-panel">
                              <div className="recovery-copy">
                                <strong>Crea una nueva contrasena</strong>
                                <span>Usa una contrasena diferente y facil de recordar para ti.</span>
                              </div>
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
                                <button className="primary-button" type="button" onClick={confirmRecoveryPasswordChange}>
                                  Guardar contrasena
                                </button>
                                <button className="text-button" type="button" onClick={closePasswordChange}>
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
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
            <div className="notification-setting-row">
              <span className="notification-setting-copy">
                <strong>Recordatorios</strong>
                <small>{notificationsEnabled ? "Activos" : "Desactivados"}</small>
              </span>
              <div className="notification-state-toggle" role="group" aria-label="Estado de notificaciones">
                <button
                  className={notificationsEnabled ? "active" : ""}
                  type="button"
                  aria-pressed={notificationsEnabled}
                  onClick={() => onNotificationsEnabledChange(true)}
                >
                  Activar
                </button>
                <button
                  className={!notificationsEnabled ? "active" : ""}
                  type="button"
                  aria-pressed={!notificationsEnabled}
                  onClick={() => onNotificationsEnabledChange(false)}
                >
                  Desactivar
                </button>
              </div>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
