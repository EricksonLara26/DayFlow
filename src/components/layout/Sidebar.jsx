import {
  BarChart3,
  ChevronRight,
  ClipboardList,
  Info,
  LogOut,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";
import { getRoleLabel, isTechnicianUser } from "../../data/users";

const adminItems = [
  { id: "dashboard", label: "Inicio", icon: BarChart3 },
  { id: "tickets", label: "Solicitudes", icon: ClipboardList },
  { id: "information", label: "Panel de informacion", icon: Info },
  { id: "users", label: "Gestion de usuarios", icon: Users },
  { id: "settings", label: "Personalizacion", icon: Settings },
];

const employeeItems = [
  { id: "tickets", label: "Mis solicitudes", icon: ClipboardList },
  { id: "settings", label: "Personalizacion", icon: Settings },
];

function NavigationButton({ activeView, item, onNavigate }) {
  const Icon = item.icon;

  return (
    <button
      aria-label={item.label}
      className={`sidebar-link ${activeView === item.id ? "active" : ""}`}
      title={item.label}
      type="button"
      onClick={() => onNavigate(item.id)}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  );
}

function BrandBlock() {
  return (
    <div className="brand-block">
      <img src="/dayflow-mark.png" alt="" className="brand-mark" />
      <div>
        <strong>DayFlow</strong>
        <span>Soporte interno</span>
      </div>
    </div>
  );
}

function ProfileButton({ activeView, currentUser, isCompact = false, onNavigate }) {
  return (
    <button
      aria-label="Abrir perfil y metricas"
      className={`nav-profile-button profile-access-button ${isCompact ? "icon-only" : ""} ${
        activeView === "profile" ? "active" : ""
      }`}
      title="Mi perfil y metricas"
      type="button"
      onClick={() => onNavigate("profile")}
    >
      <span className="profile-access-icon">
        <UserCircle size={22} aria-hidden="true" />
      </span>
      {!isCompact ? (
        <span className="profile-access-copy">
          <strong>Mi perfil</strong>
          <small>{currentUser.firstName} {currentUser.lastName} - Metricas</small>
        </span>
      ) : null}
      {!isCompact ? <ChevronRight className="profile-access-chevron" size={18} aria-hidden="true" /> : null}
    </button>
  );
}

export default function Sidebar({ activeView, currentUser, navigationMode, onNavigate, onLogout }) {
  const isTechnician = isTechnicianUser(currentUser);
  const items = isTechnician ? adminItems : employeeItems;

  if (navigationMode === "top") {
    return (
      <header className="top-navigation" aria-label="Navegacion principal">
        <BrandBlock />
        <nav className="sidebar-nav top-nav">
          {items.map((item) => (
            <NavigationButton activeView={activeView} item={item} key={item.id} onNavigate={onNavigate} />
          ))}
        </nav>
        <div className="top-nav-actions">
          {isTechnician ? (
            <ProfileButton activeView={activeView} currentUser={currentUser} onNavigate={onNavigate} />
          ) : (
            <div className="nav-profile-static icon-only">
              <span className="profile-access-icon">
                <UserCircle size={22} aria-hidden="true" />
              </span>
            </div>
          )}
          <button aria-label="Cerrar sesion" className="sidebar-link logout-link" type="button" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <aside
      className={`sidebar ${navigationMode === "compact" ? "compact-sidebar" : ""}`}
      aria-label="Navegacion principal"
    >
      <BrandBlock />

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavigationButton activeView={activeView} item={item} key={item.id} onNavigate={onNavigate} />
        ))}
      </nav>

      {isTechnician ? (
        <ProfileButton
          activeView={activeView}
          currentUser={currentUser}
          isCompact={navigationMode === "compact"}
          onNavigate={onNavigate}
        />
      ) : (
        <div className={`nav-profile-static ${navigationMode === "compact" ? "icon-only" : ""}`}>
          <span className="profile-access-icon">
            <UserCircle size={22} aria-hidden="true" />
          </span>
          {navigationMode !== "compact" ? (
            <span>
              <strong>{currentUser.firstName} {currentUser.lastName}</strong>
              <small>{currentUser.jobTitle || getRoleLabel(currentUser.role)}</small>
            </span>
          ) : null}
        </div>
      )}

      <button
        aria-label="Cerrar sesion"
        className="sidebar-link logout-link"
        title="Cerrar sesion"
        type="button"
        onClick={onLogout}
      >
        <LogOut size={18} aria-hidden="true" />
        <span>Cerrar sesion</span>
      </button>
    </aside>
  );
}
