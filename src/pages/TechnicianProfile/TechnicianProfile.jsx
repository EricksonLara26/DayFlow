import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
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

export default function TechnicianProfile({ currentUser, onOpenTicket, tickets }) {
  const assignedTickets = getTicketsByTechnician(tickets, currentUser.id);
  const completedTickets = getCompletedTicketsByTechnician(tickets, currentUser.id);
  const dismissedTickets = getDismissedTicketsByTechnician(tickets, currentUser.id);
  const managedTickets = completedTickets.length + dismissedTickets.length;
  const activeTickets = assignedTickets.length - managedTickets;
  const completionRate = managedTickets ? Math.round((completedTickets.length / managedTickets) * 100) : 0;
  const personalHistory = tickets
    .flatMap((ticket) => ticket.history.map((item) => ({ ...item, ticketId: ticket.id, ticketTitle: ticket.title })))
    .filter((item) => item.userId === currentUser.id)
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));

  return (
    <div className="page-stack profile-page">
      <section className="profile-hero panel">
        <div className="profile-avatar-large">
          {currentUser.firstName.slice(0, 1)}{currentUser.lastName.slice(0, 1)}
        </div>
        <div>
          <p className="eyebrow">Perfil del tecnico</p>
          <h2>{currentUser.firstName} {currentUser.lastName}</h2>
          <span>{getRoleLabel(currentUser.role)} - {currentUser.email}</span>
        </div>
      </section>

      <section className="panel profile-section-title">
        <div>
          <p className="eyebrow">Metricas</p>
          <h2>Resumen personal de gestion</h2>
        </div>
      </section>

      <section className="stats-grid profile-stats">
        <StatCard icon={CheckCircle2} label="Tickets completados" tone="green" value={currentUser.completedTickets ?? 0} />
        <StatCard icon={XCircle} label="Tickets desestimados" tone="dark" value={currentUser.dismissedTickets ?? 0} />
        <StatCard
          icon={ShieldCheck}
          label="Total gestionado"
          tone="blue"
          value={(currentUser.completedTickets ?? 0) + (currentUser.dismissedTickets ?? 0)}
        />
      </section>

      <section className="panel performance-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Rendimiento</p>
            <h2>Actividad operativa del tecnico</h2>
          </div>
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
            <h2>Tickets completados</h2>
            <span>{completedTickets.length}</span>
          </div>
          <TicketHistoryList emptyTitle="Sin tickets completados" onOpenTicket={onOpenTicket} tickets={completedTickets} />
        </section>

        <section className="panel">
          <div className="section-heading">
            <h2>Tickets desestimados</h2>
            <span>{dismissedTickets.length}</span>
          </div>
          <TicketHistoryList emptyTitle="Sin tickets desestimados" onOpenTicket={onOpenTicket} tickets={dismissedTickets} />
        </section>
      </div>

      <section className="panel">
        <div className="section-heading">
          <h2>Historial de actividad</h2>
          <span>{personalHistory.length}</span>
        </div>
        {personalHistory.length ? (
          <div className="timeline-list compact-timeline">
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
  );
}
