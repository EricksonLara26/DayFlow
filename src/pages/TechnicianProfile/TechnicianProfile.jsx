import { Activity, CheckCircle2, ShieldCheck, UserCircle, XCircle } from "lucide-react";
import StatCard from "../../components/dashboard/StatCard";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/common/Button";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import { getRoleLabel, isTechnicianUser } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";
import {
  getCompletedTicketsByTechnician,
  getDismissedTicketsByTechnician,
  getTicketsByTechnician,
} from "../../utils/ticketUtils";
import { SettingsContent } from "../Settings/Settings";
import "./TechnicianProfile.css";

function TicketHistoryList({ emptyTitle, onOpenTicket, tickets }) {
  if (!tickets.length) {
    return <EmptyState title={emptyTitle} message="Cuando cierres solicitudes se mostrarán en esta lista." />;
  }

  return (
    <div className="profile-ticket-list">
      {tickets.map((ticket) => (
        <article className="profile-ticket-item" key={ticket.id}>
          <div>
            <strong>{ticket.title}</strong>
            <span>#{ticket.id} - {formatDateTime(ticket.completedAt)}</span>
          </div>
          <TicketPriorityBadge priority={ticket.priority} />
          <Button variant="ghost" onClick={() => onOpenTicket(ticket.id)}>
            Ver
          </Button>
        </article>
      ))}
    </div>
  );
}

function AccountDetails({ currentUser }) {
  const details = [
    { label: "Usuario", value: currentUser.username },
    { label: "Correo", value: currentUser.email },
    { label: "Rol", value: getRoleLabel(currentUser.role) },
    { label: "Cargo", value: currentUser.jobTitle || "Cargo no definido" },
    { label: "Departamento", value: currentUser.department || "Área no definida" },
  ];

  return (
    <section className="panel profile-data-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Datos personales</p>
          <h2>Información de cuenta</h2>
        </div>
        <UserCircle size={20} aria-hidden="true" />
      </div>
      <div className="profile-data-grid">
        {details.map((item) => (
          <div className="profile-data-item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivityPanel({ personalHistory }) {
  return (
    <section className="panel profile-activity-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Actividad</p>
          <h2>Ultimos movimientos</h2>
        </div>
        <span>{personalHistory.length}</span>
      </div>
      {personalHistory.length ? (
        <div className="timeline-list">
          {personalHistory.map((item) => (
            <article className="timeline-item" key={`${item.ticketId}-${item.id}-${item.createdAt}`}>
              <span className="timeline-dot" />
              <div>
                <strong>{item.action}</strong>
                <span>#{item.ticketId} - {item.ticketTitle}</span>
                <time>{formatDateTime(item.createdAt)}</time>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Sin historial personal" message="Tus acciones quedarán registradas aquí." />
      )}
    </section>
  );
}

export default function TechnicianProfile({
  currentUser,
  onChangePassword,
  onOpenTicket,
  onUpdatePreferences,
  preferences,
  tickets,
}) {
  const isTechnician = isTechnicianUser(currentUser);
  const assignedTickets = getTicketsByTechnician(tickets, currentUser.id);
  const completedTickets = getCompletedTicketsByTechnician(tickets, currentUser.id);
  const dismissedTickets = getDismissedTicketsByTechnician(tickets, currentUser.id);
  const managedTickets = completedTickets.length + dismissedTickets.length;
  const activeTickets = assignedTickets.length - managedTickets;
  const completionRate = managedTickets ? Math.round((completedTickets.length / managedTickets) * 100) : 0;
  const personalHistory = tickets
    .flatMap((ticket) => ticket.history.map((item) => ({ ...item, ticketId: ticket.id, ticketTitle: ticket.title })))
    .filter((item) => item.userId === currentUser.id)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 8);

  return (
    <div className="page-stack profile-page">
      <section className="profile-hero panel">
        <div className="profile-hero-button" aria-hidden="true">
          <UserCircle size={44} aria-hidden="true" />
        </div>
        <div className="profile-identity">
          <p className="eyebrow">Mi perfil</p>
          <h2>{currentUser.firstName} {currentUser.lastName}</h2>
          <span>{currentUser.email}</span>
          <div className="profile-meta">
            <b>{getRoleLabel(currentUser.role)}</b>
            <b>{currentUser.jobTitle || "Cargo no definido"}</b>
            <b>{currentUser.department || "Área no definida"}</b>
          </div>
        </div>
      </section>

      <div className="profile-grid profile-focus-grid">
        <AccountDetails currentUser={currentUser} />
        <ActivityPanel personalHistory={personalHistory} />
      </div>

      <section className="profile-preferences-heading">
        <div>
          <p className="eyebrow">Personalizacion</p>
          <h2>Preferencias de cuenta</h2>
        </div>
        <strong>{preferences.darkMode ? "Modo oscuro" : "Modo claro"}</strong>
      </section>

      <div className="profile-settings-grid">
        <SettingsContent
          onChangePassword={onChangePassword}
          onUpdatePreferences={onUpdatePreferences}
          preferences={preferences}
        />
      </div>

      {isTechnician ? (
        <>
          <section className="stats-grid profile-stats">
            <StatCard icon={CheckCircle2} label="Solicitudes completadas" tone="green" value={completedTickets.length} />
            <StatCard icon={XCircle} label="Desestimadas" tone="dark" value={dismissedTickets.length} />
            <StatCard icon={ShieldCheck} label="Total gestionado" tone="blue" value={managedTickets} />
          </section>

          <section className="panel performance-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Rendimiento</p>
                <h2>Metricas personales</h2>
              </div>
              <Activity size={20} aria-hidden="true" />
            </div>
            <div className="performance-grid">
              <div>
                <span>Asignados historicos</span>
                <strong>{assignedTickets.length}</strong>
              </div>
              <div>
                <span>Activos asignados</span>
                <strong>{activeTickets}</strong>
              </div>
              <div>
                <span>Efectividad de cierre</span>
                <strong>{completionRate}%</strong>
              </div>
            </div>
          </section>

          <div className="profile-grid">
            <section className="panel">
              <div className="section-heading">
                <h2>Solicitudes completadas</h2>
                <span>{completedTickets.length}</span>
              </div>
              <TicketHistoryList emptyTitle="Sin solicitudes completadas" onOpenTicket={onOpenTicket} tickets={completedTickets} />
            </section>

            <section className="panel">
              <div className="section-heading">
                <h2>Solicitudes desestimadas</h2>
                <span>{dismissedTickets.length}</span>
              </div>
              <TicketHistoryList emptyTitle="Sin solicitudes desestimadas" onOpenTicket={onOpenTicket} tickets={dismissedTickets} />
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
