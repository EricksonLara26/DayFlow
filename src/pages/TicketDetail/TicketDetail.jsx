import EmptyState from "../../components/common/EmptyState";
import TicketDetailComponent from "../../components/tickets/TicketDetail";
import "./TicketDetail.css";

export default function TicketDetailPage({
  canCommentTicket,
  canManageTicket,
  canTakeTicket,
  flashMessage,
  onAddComment,
  onBack,
  onChangeStatus,
  onTakeTicket,
  ticket,
  users = [],
}) {
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
