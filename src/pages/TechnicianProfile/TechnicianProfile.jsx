import { Activity, CheckCircle2, ShieldCheck, SlidersHorizontal, UserCircle, XCircle } from "lucide-react";
import StatCard from "../../components/dashboard/StatCard";
import EmptyState from "../../components/common/EmptyState";
import Button from "../../components/common/Button";
import TicketPriorityBadge from "../../components/tickets/TicketPriorityBadge";
import { getRoleLabel } from "../../data/users";
import { formatDateTime } from "../../utils/dateUtils";
import {
  getCompletedTicketsByTechnician,
  getDismissedTicketsByTechnician,
  getTicketsByTechnician,
} from "../../utils/ticketUtils";
import "./TechnicianProfile.css";

function TicketHistoryList({ emptyTitle, onOpenTicket, tickets }) {
  if (!tickets.length) {
    return <EmptyState title={emptyTitle} message="Cuando cierres solicitudes se mostraran en esta lista." />;
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

export default function TechnicianProfile({ currentUser, onOpenSettings, onOpenTicket, tickets }) {
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
        <button
          aria-label="Abrir personalizacion del menu"
          className="profile-hero-button"
          title="Personalizar menu"
          type="button"
          onClick={onOpenSettings}
        >
          <UserCircle size={44} aria-hidden="true" />
        </button>
        <div className="profile-identity">
          <p className="eyebrow">Perfil operativo</p>
          <h2>{currentUser.firstName} {currentUser.lastName}</h2>
          <span>{currentUser.email}</span>
          <div className="profile-meta">
            <b>{getRoleLabel(currentUser.role)}</b>
            <b>{currentUser.jobTitle || "Cargo no definido"}</b>
            <b>{currentUser.department || "Area no definida"}</b>
          </div>
        </div>
        <Button icon={SlidersHorizontal} variant="ghost" onClick={onOpenSettings}>
          Personalizar menu
        </Button>
      </section>

      <section className="stats-grid profile-stats">
        <StatCard icon={CheckCircle2} label="Solicitudes completadas" tone="green" value={completedTickets.length} />
        <StatCard icon={XCircle} label="Desestimadas" tone="dark" value={dismissedTickets.length} />
        <StatCard icon={ShieldCheck} label="Total gestionado" tone="blue" value={managedTickets} />
      </section>

      <div className="profile-grid profile-focus-grid">
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
            <EmptyState title="Sin historial personal" message="Tus acciones quedaran registradas aqui." />
          )}
        </section>
      </div>

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
    </div>
  );
}
