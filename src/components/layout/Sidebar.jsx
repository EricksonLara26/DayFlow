import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  FileDown,
  History,
  Info,
  Inbox,
  LogOut,
  PlusCircle,
  UserCircle,
  Users,
} from "lucide-react";
import { VIEW_IDS, getNavigationItems } from "../../config/permissions";
import { isTechnicianUser } from "../../data/users";

const iconsByView = {
  [VIEW_IDS.AVAILABLE_TICKETS]: Inbox,
  [VIEW_IDS.DASHBOARD]: BarChart3,
  [VIEW_IDS.HISTORY]: History,
  [VIEW_IDS.INFORMATION]: Info,
  [VIEW_IDS.MY_TICKETS]: ClipboardCheck,
  [VIEW_IDS.RANKING]: BarChart3,
  [VIEW_IDS.REPORTS]: FileDown,
  [VIEW_IDS.TICKETS]: ClipboardList,
  [VIEW_IDS.CREATE_TICKET]: PlusCircle,
  [VIEW_IDS.USERS]: Users,
};

function NavigationButton({ activeView, item, onNavigate }) {
  const Icon = iconsByView[item.id] ?? ClipboardList;

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
  const profileDescription = isTechnicianUser(currentUser) ? "Métricas y preferencias" : "Datos y preferencias";

  return (
    <button
      aria-label="Abrir mi perfil"
      className={`nav-profile-button profile-access-button ${isCompact ? "icon-only" : ""} ${
        activeView === VIEW_IDS.PROFILE ? "active" : ""
      }`}
      title="Mi perfil"
      type="button"
      onClick={() => onNavigate(VIEW_IDS.PROFILE)}
    >
      <span className="profile-access-icon">
        <UserCircle size={22} aria-hidden="true" />
      </span>
      {!isCompact ? (
        <span className="profile-access-copy">
          <strong>Mi perfil</strong>
          <small>{profileDescription}</small>
        </span>
      ) : null}
    </button>
  );
}

export default function Sidebar({ activeView, currentUser, navigationMode, onNavigate, onLogout }) {
  const items = getNavigationItems(currentUser);

  if (navigationMode === "top") {
    return (
      <header className="top-navigation" aria-label="Navegación principal">
        <BrandBlock />
        <nav className="sidebar-nav top-nav">
          {items.map((item) => (
            <NavigationButton activeView={activeView} item={item} key={item.id} onNavigate={onNavigate} />
          ))}
        </nav>
        <div className="top-nav-actions">
          <ProfileButton activeView={activeView} currentUser={currentUser} isCompact onNavigate={onNavigate} />
          <button
            aria-label="Cerrar sesión"
            className="sidebar-link logout-link top-icon-button"
            title="Cerrar sesión"
            type="button"
            onClick={onLogout}
          >
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>
    );
  }

  return (
    <aside
      className={`sidebar ${navigationMode === "compact" ? "compact-sidebar" : ""}`}
      aria-label="Navegación principal"
    >
      <BrandBlock />

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavigationButton activeView={activeView} item={item} key={item.id} onNavigate={onNavigate} />
        ))}
      </nav>

      <ProfileButton
        activeView={activeView}
        currentUser={currentUser}
        isCompact={navigationMode === "compact"}
        onNavigate={onNavigate}
      />

      <button
        aria-label="Cerrar sesión"
        className="sidebar-link logout-link"
        title="Cerrar sesión"
        type="button"
        onClick={onLogout}
      >
        <LogOut size={18} aria-hidden="true" />
        <span>Cerrar sesión</span>
      </button>
    </aside>
  );
}
