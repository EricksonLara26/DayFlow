import { ArrowLeft, CheckCircle2, CirclePause, ClipboardCheck, PlayCircle, XCircle } from "lucide-react";
import Button from "../common/Button";
import { TICKET_STATUSES } from "../../data/tickets";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import { getStatusLabel, getTicketTakenAt, terminalTicketStatuses } from "../../utils/ticketUtils";
import TicketComments from "./TicketComments";
import TicketPriorityBadge from "./TicketPriorityBadge";
import TicketStatusBadge from "./TicketStatusBadge";
import TicketTimeline from "./TicketTimeline";

export default function TicketDetail({
  canComment,
  canManage,
  canTake,
  onAddComment,
  onBack,
  onChangeStatus,
  onTakeTicket,
  ticket,
}) {
  const isTerminal = terminalTicketStatuses.includes(ticket.status);
  const takenAt = getTicketTakenAt(ticket);

  return (
    <div className="ticket-detail-page">
      <Button icon={ArrowLeft} variant="ghost" onClick={onBack}>
        Volver
      </Button>

      <section className="detail-hero">
        <div>
          <p className="eyebrow">Ticket #{ticket.id}</p>
          <h2>{ticket.title}</h2>
          <p>{ticket.description}</p>
        </div>
        <div className="detail-badges">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
        </div>
      </section>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-section">
            <div className="section-heading">
              <h2>Datos de la solicitud</h2>
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Categoria</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div>
                <dt>Solicitante</dt>
                <dd>{ticket.createdByName}</dd>
              </div>
              <div>
                <dt>Tecnico asignado</dt>
                <dd>{ticket.assignedToName ?? "Sin asignar"}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{getStatusLabel(ticket.status)}</dd>
              </div>
              <div>
                <dt>Creado</dt>
                <dd>{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div>
                <dt>Tomado</dt>
                <dd>{takenAt ? formatDateTime(takenAt) : "Sin tomar"}</dd>
              </div>
              <div>
                <dt>Fecha limite</dt>
                <dd>{formatDate(ticket.dueDate)}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{formatDateTime(ticket.updatedAt)}</dd>
              </div>
              <div>
                <dt>Cierre</dt>
                <dd>{ticket.completedAt ? formatDateTime(ticket.completedAt) : "Pendiente"}</dd>
              </div>
            </dl>
          </section>

          <TicketComments canComment={canComment} comments={ticket.comments} onAddComment={onAddComment} />
        </div>

        <aside className="detail-side">
          <section className="detail-section">
            <div className="section-heading">
              <h2>Acciones</h2>
            </div>
            {canTake ? (
              <Button icon={ClipboardCheck} className="wide" onClick={() => onTakeTicket(ticket.id)}>
                Tomar ticket
              </Button>
            ) : null}
            {canManage && !isTerminal ? (
              <div className="action-stack">
                <Button
                  icon={PlayCircle}
                  variant="soft"
                  onClick={() => onChangeStatus(ticket.id, TICKET_STATUSES.IN_PROGRESS)}
                >
                  Cambiar a En proceso
                </Button>
                <Button
                  icon={CirclePause}
                  variant="warning"
                  onClick={() => onChangeStatus(ticket.id, TICKET_STATUSES.ON_HOLD)}
                >
                  Cambiar a En hold
                </Button>
                <Button
                  icon={CheckCircle2}
                  variant="success"
                  onClick={() => onChangeStatus(ticket.id, TICKET_STATUSES.COMPLETED)}
                >
                  Marcar como completado
                </Button>
                <Button
                  icon={XCircle}
                  variant="dark"
                  onClick={() => onChangeStatus(ticket.id, TICKET_STATUSES.DISMISSED)}
                >
                  Desestimar por area tecnica
                </Button>
              </div>
            ) : null}
            {!canTake && (!canManage || isTerminal) ? (
              <p className="muted-note">
                {isTerminal
                  ? "Este ticket ya esta cerrado y queda disponible solo para consulta y comentarios."
                  : "Las acciones tecnicas no estan disponibles para este usuario o asignacion."}
              </p>
            ) : null}
          </section>

          <TicketTimeline history={ticket.history} />
        </aside>
      </div>
    </div>
  );
}
