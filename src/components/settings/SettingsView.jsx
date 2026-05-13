import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clock,
  Database,
  Download,
  FileText,
  LockKeyhole,
  Mail,
  Moon,
  Phone,
  Send,
  Sun,
  Table,
  Upload,
  User,
  X,
} from "lucide-react";
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
  onPasswordChange,
  timeFormat,
  onTimeFormatChange,
  tasksCount,
  areasCount,
  onExportData,
  onImportData,
  dataNotice,
}) {
  const importInputRef = useRef(null);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState("create");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationCodeDraft, setVerificationCodeDraft] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordNoticeType, setPasswordNoticeType] = useState("success");
  const timeFormatOptions = [
    { id: "automatic", label: "Automatico" },
    { id: "12h", label: "AM/PM" },
    { id: "24h", label: "24 h" },
  ];
  const detectedTimeFormat = detectUserTimeFormat();
  const profileName = profile.username || "Usuario DayFlow";
  const profileEmail = profile.email || "Sin correo registrado";
  const profilePhone = profile.phone?.trim() || "";
  const maskedProfileEmail = maskEmail(profile.email?.trim() || "");
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

  function resetPasswordFlow() {
    setPasswordStep("create");
    setPasswordDraft("");
    setPasswordConfirm("");
    setVerificationCodeDraft("");
    setVerificationCode("");
  }

  function openPasswordChange() {
    resetPasswordFlow();
    setPasswordNotice("");
    setIsPasswordFormOpen(true);
  }

  function closePasswordChange() {
    resetPasswordFlow();
    setPasswordNotice("");
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

  function sendPasswordCode() {
    const targetEmail = profile.email?.trim() || "";

    if (!targetEmail) {
      setPasswordNoticeType("error");
      setPasswordNotice("Agrega un correo electronico a tu perfil para recibir el codigo.");
      return;
    }

    if (!validateNewPassword()) {
      return;
    }

    setVerificationCode(demoRecoveryCode);
    setVerificationCodeDraft("");
    setPasswordStep("verify");
    setPasswordNoticeType("success");
    setPasswordNotice(`Codigo enviado a ${maskEmail(targetEmail)}. Codigo demo: ${demoRecoveryCode}.`);
  }

  function resendPasswordCode() {
    const targetEmail = profile.email?.trim() || "";

    if (!targetEmail) {
      setPasswordNoticeType("error");
      setPasswordNotice("Agrega un correo electronico a tu perfil para recibir el codigo.");
      return;
    }

    setVerificationCode(demoRecoveryCode);
    setVerificationCodeDraft("");
    setPasswordNoticeType("success");
    setPasswordNotice(`Codigo reenviado a ${maskEmail(targetEmail)}. Codigo demo: ${demoRecoveryCode}.`);
  }

  function confirmPasswordCode() {
    if (!verificationCode) {
      setPasswordNoticeType("error");
      setPasswordNotice("Solicita primero un codigo de confirmacion.");
      return;
    }

    if (verificationCodeDraft.trim() !== verificationCode) {
      setPasswordNoticeType("error");
      setPasswordNotice("El codigo de confirmacion no coincide.");
      return;
    }

    onPasswordChange(passwordDraft);
    resetPasswordFlow();
    setIsPasswordFormOpen(false);
    setPasswordNoticeType("success");
    setPasswordNotice("Codigo confirmado. Contrasena actualizada.");
  }

  function handleImportChange(event) {
    const [file] = event.target.files;

    if (file) {
      onImportData(file);
    }

    event.target.value = "";
  }

  useEffect(() => {
    if (!isPasswordFormOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        closePasswordChange();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPasswordFormOpen]);

  return (
    <section className="settings-page" aria-label="Ajustes">
      <div className="settings-workspace">
        <article className="panel settings-panel settings-single-panel" aria-label="Ajustes generales">
          <header className="settings-single-header">
            <span className="profile-avatar-large settings-compact-avatar">{profileInitials}</span>
            <div className="settings-single-title">
              <p className="eyebrow">Configuracion</p>
              <h1>Ajustes</h1>
              <span>
                <Mail size={15} />
                {profileEmail}
              </span>
            </div>
            <div className="settings-single-actions">
              <button
                className="icon-button settings-theme-button"
                type="button"
                aria-label={isDarkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                title={isDarkMode ? "Modo oscuro" : "Modo claro"}
                onClick={() => onThemeModeChange(isDarkMode ? "light" : "dark")}
              >
                <ThemeModeIcon size={18} />
              </button>
              <span className="session-status settings-session-pill">
                <LockKeyhole size={14} />
                Sesion activa
              </span>
            </div>
          </header>

          <div className="settings-single-body">
            <div className="settings-single-block settings-profile-block">
              <div className="settings-block-title">
                <span className="settings-block-icon">
                  <User size={17} />
                </span>
                <div>
                  <h2>Perfil</h2>
                  <p>Datos de acceso y contacto.</p>
                </div>
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

            <div className="settings-single-block settings-security-block">
              <div className="settings-block-title">
                <span className="settings-block-icon">
                  <LockKeyhole size={17} />
                </span>
                <div>
                  <h2>Seguridad</h2>
                  <p>Acceso con correo y contrasena.</p>
                </div>
              </div>

              <div className="settings-meta-inline">
                <span>
                  <small>Correo</small>
                  <strong>{profileEmail}</strong>
                </span>
                <span>
                  <small>Telefono</small>
                  <strong>{profilePhone || "Pendiente"}</strong>
                </span>
              </div>

              <div className="password-change-box profile-password-box">
                <div className="password-change-header">
                  <div>
                    <h3>Contrasena</h3>
                    <span>Actualiza tu clave con confirmacion por correo.</span>
                  </div>
                  <button className="outline-button" type="button" onClick={openPasswordChange}>
                    <LockKeyhole size={17} />
                    Cambiar
                  </button>
                </div>
              </div>

              {passwordNotice && (
                <p className={`password-notice ${passwordNoticeType}`} aria-live="polite">
                  {passwordNotice}
                </p>
              )}
            </div>

            <div className="settings-single-block settings-preferences-block">
              <div className="settings-block-title">
                <span className="settings-block-icon">
                  <Clock size={17} />
                </span>
                <div>
                  <h2>Preferencias</h2>
                  <p>Tema, hora y recordatorios.</p>
                </div>
              </div>

              <div className="settings-control-row">
                <span className="notification-setting-copy">
                  <strong>Tema</strong>
                  <small>{isDarkMode ? "Oscuro" : "Claro"}</small>
                </span>
                <button
                  className="outline-button settings-theme-inline-button"
                  type="button"
                  onClick={() => onThemeModeChange(isDarkMode ? "light" : "dark")}
                >
                  <ThemeModeIcon size={17} />
                  {isDarkMode ? "Oscuro" : "Claro"}
                </button>
              </div>

              <div className="settings-control-row">
                <span className="notification-setting-copy">
                  <strong>Formato de hora</strong>
                  <small>
                    {currentTimeLabel} - Deteccion: {detectedTimeFormat === "12h" ? "AM/PM" : "24 horas"}
                  </small>
                </span>
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
              </div>

              <div className="settings-control-row">
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
            </div>

            <div className="settings-single-block settings-data-block">
              <div className="settings-block-title">
                <span className="settings-block-icon">
                  <Database size={17} />
                </span>
                <div>
                  <h2>Datos</h2>
                  <p>Respaldo e importacion.</p>
                </div>
              </div>

              <div className="settings-data-inline">
                <div className="data-table-wrap">
                  <table className="data-export-table">
                    <caption className="visually-hidden">Informacion de exportacion de datos</caption>
                    <thead>
                      <tr>
                        <th>Formato</th>
                        <th>Contenido</th>
                        <th>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <span className="data-format-cell">
                            <FileText size={17} />
                            Word
                          </span>
                        </td>
                        <td>
                          <strong>{tasksCount} tareas</strong>
                          <small>{areasCount} bloques</small>
                        </td>
                        <td>
                          <button className="outline-button data-table-action" type="button" onClick={() => onExportData("word")}>
                            <Download size={15} />
                            Exportar
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="data-format-cell">
                            <Table size={17} />
                            CSV
                          </span>
                        </td>
                        <td>
                          <strong>{tasksCount} tareas</strong>
                          <small>{areasCount} bloques</small>
                        </td>
                        <td>
                          <button className="outline-button data-table-action" type="button" onClick={() => onExportData("csv")}>
                            <Download size={15} />
                            Exportar
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span className="data-format-cell">
                            <Upload size={17} />
                            Importar
                          </span>
                        </td>
                        <td>
                          <strong>JSON / CSV</strong>
                          <small>Archivo externo</small>
                        </td>
                        <td>
                          <button
                            className="primary-button data-table-action"
                            type="button"
                            onClick={() => importInputRef.current?.click()}
                          >
                            <Upload size={17} />
                            Importar
                          </button>
                          <input
                            ref={importInputRef}
                            className="visually-hidden"
                            type="file"
                            accept=".json,.csv,application/json,text/csv"
                            onChange={handleImportChange}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {dataNotice && (
                <p
                  className={`password-notice ${
                    dataNotice.toLowerCase().includes("no se") || dataNotice.toLowerCase().includes("vacio")
                      ? "error"
                      : "success"
                  }`}
                >
                  {dataNotice}
                </p>
              )}
            </div>
          </div>
        </article>
      </div>

      {isPasswordFormOpen && (
        <div
          className="password-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
          onClick={closePasswordChange}
        >
          <section className="panel password-modal-panel" onClick={(event) => event.stopPropagation()}>
            <header className="password-modal-hero">
              <span className="password-modal-icon">
                {passwordStep === "verify" ? <Mail size={20} /> : <LockKeyhole size={20} />}
              </span>
              <div className="password-modal-title">
                <p className="eyebrow">Cambio de contrasena</p>
                <h2 id="password-modal-title">
                  {passwordStep === "verify" ? "Confirma tu correo" : "Nueva contrasena"}
                </h2>
                <span>
                  {passwordStep === "verify"
                    ? `Coloca el codigo enviado a ${maskedProfileEmail}.`
                    : "Define tu nueva clave y luego valida el cambio por correo."}
                </span>
              </div>
              <button className="icon-button" type="button" aria-label="Cerrar" title="Cerrar" onClick={closePasswordChange}>
                <X size={18} />
              </button>
            </header>

            <div className="password-modal-body">
              <div className="password-modal-stepper" aria-label="Progreso del cambio de contrasena">
                <span className={passwordStep === "create" ? "active" : "complete"}>
                  <strong>1</strong>
                  <small>Nueva clave</small>
                </span>
                <span className={passwordStep === "verify" ? "active" : ""}>
                  <strong>2</strong>
                  <small>Codigo</small>
                </span>
              </div>

              {passwordStep === "create" && (
                <div className="password-modal-section">
                  <label className="field">
                    Nueva contrasena
                    <div className="input-with-icon">
                      <LockKeyhole size={17} />
                      <input
                        autoFocus
                        type="password"
                        value={passwordDraft}
                        onChange={(event) => setPasswordDraft(event.target.value)}
                        placeholder="Nueva contrasena"
                      />
                    </div>
                  </label>
                  <label className="field">
                    Confirmar contrasena
                    <div className="input-with-icon">
                      <LockKeyhole size={17} />
                      <input
                        type="password"
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                        placeholder="Confirmar contrasena"
                      />
                    </div>
                  </label>
                  <div className="password-modal-footer">
                    <button className="outline-button" type="button" onClick={closePasswordChange}>
                      Cancelar
                    </button>
                    <button className="primary-button" type="button" onClick={sendPasswordCode}>
                      <Send size={17} />
                      Confirmar
                    </button>
                  </div>
                </div>
              )}

              {passwordStep === "verify" && (
                <div className="password-modal-section">
                  <div className="password-email-card">
                    <span className="password-email-icon">
                      <Mail size={18} />
                    </span>
                    <span>
                      <strong>{maskedProfileEmail}</strong>
                      <small>Codigo de 4 digitos</small>
                    </span>
                  </div>
                  <label className="field">
                    Codigo de verificacion
                    <input
                      autoFocus
                      className="verification-code-input"
                      inputMode="numeric"
                      maxLength={4}
                      value={verificationCodeDraft}
                      onChange={(event) =>
                        setVerificationCodeDraft(event.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="0000"
                    />
                  </label>
                  <div className="password-modal-footer">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => {
                        setPasswordStep("create");
                        setVerificationCodeDraft("");
                        setVerificationCode("");
                        setPasswordNotice("");
                      }}
                    >
                      Atras
                    </button>
                    <button className="outline-button" type="button" onClick={resendPasswordCode}>
                      Reenviar codigo
                    </button>
                    <button className="primary-button" type="button" onClick={confirmPasswordCode}>
                      Confirmar cambio
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
          </section>
        </div>
      )}
    </section>
  );
}
