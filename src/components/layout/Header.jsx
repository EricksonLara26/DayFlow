import { CalendarClock, PlusCircle } from "lucide-react";
import Button from "../common/Button";
import { getRoleLabel } from "../../data/users";

const viewTitles = {
  dashboard: {
    eyebrow: "Dashboard administrativo",
    title: "Desempeno del equipo tecnico",
  },
  tickets: {
    eyebrow: "Solicitudes",
    title: "Gestion de tickets",
  },
  "ticket-detail": {
    eyebrow: "Detalle",
    title: "Seguimiento de solicitud",
  },
  "create-ticket": {
    eyebrow: "Nueva solicitud",
    title: "Crear ticket de soporte",
  },
  profile: {
    eyebrow: "Perfil del tecnico",
    title: "Metricas y rendimiento",
  },
  users: {
    eyebrow: "Gestión de Usuarios",
    title: "Administracion de empleados",
  },
};

export default function Header({ activeView, currentUser, onCreateTicket }) {
  const title = viewTitles[activeView] ?? viewTitles.dashboard;

  return (
    <header className="top-header">
      <div>
        <p className="eyebrow">{title.eyebrow}</p>
        <h1>{title.title}</h1>
      </div>
      <div className="header-actions">
        <span className="session-pill">
          <CalendarClock size={16} aria-hidden="true" />
          {getRoleLabel(currentUser.role)}
        </span>
        {activeView !== "create-ticket" ? (
          <Button icon={PlusCircle} onClick={onCreateTicket}>
            Crear solicitud
          </Button>
        ) : null}
      </div>
    </header>
  );
}
