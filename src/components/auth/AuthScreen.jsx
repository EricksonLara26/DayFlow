import { useState } from "react";
import { ChevronRight, LockKeyhole, Mail, Phone, User, UserPlus } from "lucide-react";

// Pantalla de acceso local. Por ahora simula login/registro y entrega los datos a App.
export default function AuthScreen({ onLogin }) {
  const [authMode, setAuthMode] = useState("login");
  const [loginForm, setLoginForm] = useState({
    username: "Erickson",
    password: "",
  });
  const [signupForm, setSignupForm] = useState({
    email: "ericksonburgos26@gmail.com",
    username: "Erickson",
    password: "",
    phone: "",
  });

  function updateLoginField(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateSignupField(field, value) {
    setSignupForm((current) => ({ ...current, [field]: value }));
  }

  function continueWithLogin() {
    const username = loginForm.username.trim() || "Usuario DayFlow";
    onLogin({
      name: username,
      username,
      email: username.includes("@") ? username : "",
      password: loginForm.password,
    });
  }

  function continueWithEmail() {
    const email = loginForm.username.includes("@")
      ? loginForm.username.trim()
      : "ericksonburgos26@gmail.com";
    const username = email.split("@")[0] || "Usuario DayFlow";

    onLogin({
      name: username,
      username,
      email,
      password: loginForm.password,
    });
  }

  function createAccount() {
    const email = signupForm.email.trim();
    const username = signupForm.username.trim() || email.split("@")[0] || "Nuevo usuario";

    onLogin({
      name: username,
      username,
      email,
      password: signupForm.password,
      phone: signupForm.phone.trim(),
    });
  }

  return (
    <main className="auth-page">
      <section className="auth-layout" aria-label="Acceso a DayFlow">
        <section className="auth-panel" aria-label="Formulario de acceso">
          <div className="auth-brand" aria-label="DayFlow">
            <img className="auth-logo" src="/dayflow-mark.png" alt="" />
            <strong>
              <span className="brand-name-dark">Day</span>
              <span className="brand-name-blue">Flow</span>
            </strong>
          </div>

          {authMode === "login" ? (
            <>
              <div className="auth-panel-header">
                <p className="eyebrow">Bienvenido</p>
                <h2>Inicia sesion</h2>
              </div>

              <label className="field">
                Usuario
                <div className="input-with-icon">
                  <User size={17} />
                  <input
                    value={loginForm.username}
                    onChange={(event) => updateLoginField("username", event.target.value)}
                    placeholder="Tu usuario"
                  />
                </div>
              </label>
              <label className="field">
                Contrasena
                <div className="input-with-icon">
                  <LockKeyhole size={17} />
                  <input
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => updateLoginField("password", event.target.value)}
                    placeholder="Tu contrasena"
                  />
                </div>
              </label>

              <button className="primary-button wide" onClick={continueWithLogin}>
                <ChevronRight size={18} />
                Entrar a DayFlow
              </button>

              <button className="email-button" onClick={continueWithEmail}>
                <Mail size={18} />
                Continuar con correo electronico
              </button>

              <div className="auth-divider">Nuevo en DayFlow</div>

              <button className="outline-button wide" onClick={() => setAuthMode("signup")}>
                <UserPlus size={18} />
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              <div className="auth-panel-header">
                <p className="eyebrow">Nueva cuenta</p>
                <h2>Crea tu acceso</h2>
              </div>

              <label className="field">
                Correo electronico
                <div className="input-with-icon">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={signupForm.email}
                    onChange={(event) => updateSignupField("email", event.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </label>
              <label className="field">
                Nombre de usuario
                <div className="input-with-icon">
                  <User size={17} />
                  <input
                    value={signupForm.username}
                    onChange={(event) => updateSignupField("username", event.target.value)}
                    placeholder="Tu usuario"
                  />
                </div>
              </label>
              <label className="field">
                Crear contrasena
                <div className="input-with-icon">
                  <LockKeyhole size={17} />
                  <input
                    type="password"
                    value={signupForm.password}
                    onChange={(event) => updateSignupField("password", event.target.value)}
                    placeholder="Crea una contrasena"
                  />
                </div>
              </label>
              <label className="field">
                Numero de telefono
                <div className="input-with-icon">
                  <Phone size={17} />
                  <input
                    type="tel"
                    value={signupForm.phone}
                    onChange={(event) => updateSignupField("phone", event.target.value)}
                    placeholder="+1 829 000 0000"
                  />
                </div>
              </label>

              <button className="primary-button wide" onClick={createAccount}>
                <UserPlus size={18} />
                Crear cuenta
              </button>
              <button className="text-button wide" onClick={() => setAuthMode("login")}>
                Ya tengo cuenta
              </button>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
