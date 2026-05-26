import { ArrowLeft, CheckCircle2, CirclePause, ClipboardCheck, PlayCircle, XCircle } from "lucide-react";
import { useState } from "react";
import Button from "../common/Button";
import LoadingButton from "../common/LoadingButton";
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
  const [loadingAction, setLoadingAction] = useState("");
  const isTerminal = terminalTicketStatuses.includes(ticket.status);
  const takenAt = getTicketTakenAt(ticket);

  function runTicketAction(action, callback) {
    setLoadingAction(action);
    window.setTimeout(() => {
      Promise.resolve(callback()).finally(() => setLoadingAction(""));
    }, 300);
  }

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
                <dt>Categoría</dt>
                <dd>{ticket.category}</dd>
              </div>
              <div>
                <dt>Solicitante</dt>
                <dd>{ticket.createdByName}</dd>
              </div>
              <div>
                <dt>Técnico asignado</dt>
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
                <dt>Fecha límite</dt>
                <dd>{formatDate(ticket.dueDate)}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{formatDateTime(ticket.updatedAt)}</dd>
              </div>
              <div>
                <dt>Cierre</dt>
                <dd>{ticket.closedAt ? formatDateTime(ticket.closedAt) : "Pendiente"}</dd>
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
              <LoadingButton
                className="wide"
                icon={ClipboardCheck}
                loading={loadingAction === "take"}
                onClick={() => runTicketAction("take", () => onTakeTicket(ticket.id))}
              >
                Tomar ticket
              </LoadingButton>
            ) : null}
            {canManage && !isTerminal ? (
              <div className="action-stack">
                <LoadingButton
                  icon={PlayCircle}
                  loading={loadingAction === TICKET_STATUSES.IN_PROGRESS}
                  variant="soft"
                  onClick={() =>
                    runTicketAction(TICKET_STATUSES.IN_PROGRESS, () =>
                      onChangeStatus(ticket.id, TICKET_STATUSES.IN_PROGRESS),
                    )
                  }
                >
                  Cambiar a En proceso
                </LoadingButton>
                <LoadingButton
                  icon={CirclePause}
                  loading={loadingAction === TICKET_STATUSES.ON_HOLD}
                  variant="warning"
                  onClick={() =>
                    runTicketAction(TICKET_STATUSES.ON_HOLD, () => onChangeStatus(ticket.id, TICKET_STATUSES.ON_HOLD))
                  }
                >
                  Cambiar a En hold
                </LoadingButton>
                <LoadingButton
                  icon={CheckCircle2}
                  loading={loadingAction === TICKET_STATUSES.COMPLETED}
                  variant="success"
                  onClick={() =>
                    runTicketAction(TICKET_STATUSES.COMPLETED, () =>
                      onChangeStatus(ticket.id, TICKET_STATUSES.COMPLETED),
                    )
                  }
                >
                  Marcar como completado
                </LoadingButton>
                <LoadingButton
                  icon={XCircle}
                  loading={loadingAction === TICKET_STATUSES.DISMISSED}
                  variant="dark"
                  onClick={() =>
                    runTicketAction(TICKET_STATUSES.DISMISSED, () =>
                      onChangeStatus(ticket.id, TICKET_STATUSES.DISMISSED),
                    )
                  }
                >
                  Desestimar por área técnica
                </LoadingButton>
              </div>
            ) : null}
            {!canTake && (!canManage || isTerminal) ? (
              <p className="muted-note">
                {isTerminal
                  ? "Este ticket ya está cerrado y queda disponible solo para consulta y comentarios."
                  : "Las acciones técnicas no están disponibles para este usuario o asignación."}
              </p>
            ) : null}
          </section>

          <TicketTimeline history={ticket.history} />
        </aside>
      </div>
    </div>
  );
}
