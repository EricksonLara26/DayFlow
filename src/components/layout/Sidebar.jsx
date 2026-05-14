import {
  BarChart3,
  ClipboardList,
  LogOut,
  Users,
} from "lucide-react";
import { getRoleLabel, isTechnicianUser } from "../../data/users";

const adminItems = [
  { id: "dashboard", label: "Inicio", icon: BarChart3 },
  { id: "tickets", label: "Solicitudes", icon: ClipboardList },
  { id: "users", label: "Gestión de Usuarios", icon: Users },
];

const employeeItems = [
  { id: "tickets", label: "Mis solicitudes", icon: ClipboardList },
];

export default function Sidebar({ activeView, currentUser, onNavigate, onLogout }) {
  const isTechnician = isTechnicianUser(currentUser);
  const items = isTechnician ? adminItems : employeeItems;
  const profileContent = (
    <>
      <div className="avatar">{currentUser.firstName.slice(0, 1)}{currentUser.lastName.slice(0, 1)}</div>
      <div>
        <strong>{currentUser.firstName} {currentUser.lastName}</strong>
        <span>{getRoleLabel(currentUser.role)}</span>
      </div>
    </>
  );

  return (
    <aside className="sidebar" aria-label="Navegacion principal">
      <div className="brand-block">
        <img src="/dayflow-mark.png" alt="" className="brand-mark" />
        <div>
          <strong>DayFlow</strong>
          <span>Soporte interno</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              className={`sidebar-link ${activeView === item.id ? "active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {isTechnician ? (
        <button
          className={`sidebar-profile sidebar-profile-button ${activeView === "profile" ? "active" : ""}`}
          type="button"
          onClick={() => onNavigate("profile")}
        >
          {profileContent}
        </button>
      ) : (
        <div className="sidebar-profile">{profileContent}</div>
      )}

      <button className="sidebar-link logout-link" type="button" onClick={onLogout}>
        <LogOut size={18} aria-hidden="true" />
        <span>Cerrar sesion</span>
      </button>
    </aside>
  );
}
