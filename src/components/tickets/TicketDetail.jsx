import { ArrowLeft, CheckCircle2, CirclePause, ClipboardCheck, Paperclip, PlayCircle, XCircle } from "lucide-react";
import { useState } from "react";
import Button from "../common/Button";
import LoadingButton from "../common/LoadingButton";
import SuccessMessage from "../common/SuccessMessage";
import { TICKET_STATUSES } from "../../data/tickets";
import { formatDate, formatDateTime } from "../../utils/dateUtils";
import {
  getStatusLabel,
  getTicketDepartment,
  getTicketTakenAt,
  terminalTicketStatuses,
} from "../../utils/ticketUtils";
import TicketComments from "./TicketComments";
import TicketPriorityBadge from "./TicketPriorityBadge";
import TicketStatusBadge from "./TicketStatusBadge";
import TicketTimeline from "./TicketTimeline";

export default function TicketDetail({
  canComment,
  canManage,
  canTake,
  flashMessage,
  onAddComment,
  onBack,
  onChangeStatus,
  onTakeTicket,
  ticket,
  users = [],
}) {
  const [loadingAction, setLoadingAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const isTerminal = terminalTicketStatuses.includes(ticket.status);
  const takenAt = getTicketTakenAt(ticket);
  const department = getTicketDepartment(ticket, users);
  const evidence = ticket.evidence ?? ticket.attachment ?? null;
  const canShowTechnicalActions = canTake || (canManage && !isTerminal);

  function runTicketAction(action, callback) {
    setActionError("");
    setActionMessage("");
    setLoadingAction(action);
    window.setTimeout(() => {
      Promise.resolve(callback())
        .then((result) => {
          if (result?.ok === false) {
            setActionError(result.message ?? "No se pudo completar la accion.");
            return;
          }

          setActionMessage(result?.message ?? "Accion completada correctamente.");
        })
        .catch(() => setActionError("No se pudo completar la accion."))
        .finally(() => setLoadingAction(""));
    }, 300);
  }

  return (
    <div className="ticket-detail-page">
      <Button className="ticket-detail-back" icon={ArrowLeft} variant="ghost" onClick={onBack}>
        Volver
      </Button>

      <SuccessMessage className="detail-flash">{flashMessage}</SuccessMessage>
      <SuccessMessage className="detail-flash">{actionMessage}</SuccessMessage>
      {actionError ? <p className="form-error detail-flash">{actionError}</p> : null}

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
                <dt>Departamento</dt>
                <dd>{department}</dd>
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
                <dt>Evidencia</dt>
                <dd>
                  {evidence?.name ? (
                    <span className="evidence-label">
                      <Paperclip size={15} aria-hidden="true" />
                      {evidence.name}
                    </span>
                  ) : (
                    "Sin evidencia adjunta"
                  )}
                </dd>
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
          {canShowTechnicalActions ? (
            <section className="detail-section">
              <div className="section-heading">
                <h2>Acciones técnicas</h2>
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
            </section>
          ) : (
            <section className="detail-section">
              <div className="section-heading">
                <h2>Seguimiento</h2>
              </div>
              <dl className="detail-grid detail-grid-single">
                <div>
                  <dt>Estado actual</dt>
                  <dd>{getStatusLabel(ticket.status)}</dd>
                </div>
                <div>
                  <dt>Técnico asignado</dt>
                  <dd>{ticket.assignedToName ?? "Sin asignar"}</dd>
                </div>
              </dl>
              <p className="muted-note">
                {canComment
                  ? "Puedes agregar comentarios para dejar contexto adicional sobre esta solicitud."
                  : "Esta solicitud está disponible solo para consulta."}
              </p>
            </section>
          )}

          <TicketTimeline history={ticket.history} />
        </aside>
      </div>
    </div>
  );
}
