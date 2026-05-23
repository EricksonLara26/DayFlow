import { CalendarClock, PlusCircle } from "lucide-react";
import Button from "../common/Button";
import { VIEW_IDS } from "../../config/permissions";
import { getRoleLabel } from "../../data/users";

const viewTitles = {
  [VIEW_IDS.ACCESS_DENIED]: {
    eyebrow: "Acceso restringido",
    title: "Permisos insuficientes",
  },
  [VIEW_IDS.AVAILABLE_TICKETS]: {
    eyebrow: "Solicitudes",
    title: "Solicitudes disponibles",
  },
  [VIEW_IDS.DASHBOARD]: {
    eyebrow: "Dashboard operativo",
    title: "Estado operativo",
  },
  [VIEW_IDS.HISTORY]: {
    eyebrow: "Historial",
    title: "Solicitudes cerradas",
  },
  [VIEW_IDS.INFORMATION]: {
    eyebrow: "Panel de información",
    title: "Analítica y operación",
  },
  [VIEW_IDS.MY_TICKETS]: {
    eyebrow: "Mis solicitudes",
    title: "Trabajo asignado",
  },
  [VIEW_IDS.PROFILE]: {
    eyebrow: "Mi perfil",
    title: "Datos y preferencias",
  },
  [VIEW_IDS.RANKING]: {
    eyebrow: "Métricas",
    title: "Ranking de técnicos",
  },
  [VIEW_IDS.REPORTS]: {
    eyebrow: "Informes",
    title: "Exportación administrativa",
  },
  [VIEW_IDS.TICKETS]: {
    eyebrow: "Solicitudes",
    title: "Gestión de tickets",
  },
  [VIEW_IDS.TICKET_DETAIL]: {
    eyebrow: "Detalle",
    title: "Seguimiento de solicitud",
  },
  [VIEW_IDS.CREATE_TICKET]: {
    eyebrow: "Nueva solicitud",
    title: "Crear ticket de soporte",
  },
  [VIEW_IDS.USERS]: {
    eyebrow: "Gestión de usuarios",
    title: "Administración de usuarios",
  },
};

export default function Header({ activeView, canCreateTicket, currentUser, onCreateTicket }) {
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
        {canCreateTicket && activeView !== VIEW_IDS.CREATE_TICKET ? (
          <Button icon={PlusCircle} onClick={onCreateTicket}>
            Crear solicitud
          </Button>
        ) : null}
      </div>
    </header>
  );
}
