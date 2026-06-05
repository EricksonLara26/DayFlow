import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import TicketDetailComponent from "../../components/tickets/TicketDetail";
import "./TicketDetail.css";

export default function TicketDetailPage({
  canCommentTicket,
  canManageTicket,
  canTakeTicket,
  error = "",
  flashMessage,
  isLoading = false,
  onAddComment,
  onBack,
  onChangeStatus,
  onRetry,
  onTakeTicket,
  ticket,
  users = [],
}) {
  if (isLoading && !ticket) {
    return <LoadingState title="Cargando ticket" message="Estamos preparando el detalle de la solicitud." />;
  }

  if (error && !ticket) {
    return <ErrorState title="No se pudo cargar el ticket" message={error} onRetry={onRetry} />;
  }

  if (!ticket) {
    return <EmptyState title="Ticket no encontrado" message="Vuelve a la lista para seleccionar otra solicitud." />;
  }

  return (
    <TicketDetailComponent
      canComment={canCommentTicket(ticket)}
      canManage={canManageTicket(ticket)}
      canTake={canTakeTicket(ticket)}
      flashMessage={flashMessage}
      onAddComment={(message) => onAddComment(ticket.id, message)}
      onBack={onBack}
      onChangeStatus={onChangeStatus}
      onTakeTicket={onTakeTicket}
      ticket={ticket}
      users={users}
    />
  );
}
