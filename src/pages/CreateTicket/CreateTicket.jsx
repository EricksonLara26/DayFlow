import AccessDeniedState from "../../components/common/AccessDeniedState";
import TicketForm from "../../components/tickets/TicketForm";
import "./CreateTicket.css";

export default function CreateTicket({ currentUser, onCreateTicket }) {
  if (!currentUser || !onCreateTicket) {
    return (
      <div className="page-stack create-ticket-page">
        <AccessDeniedState
          message="Necesitas una sesion activa con permiso para crear solicitudes."
          title="No puedes crear solicitudes desde esta cuenta."
        />
      </div>
    );
  }

  const requesters = [currentUser];

  return (
    <div className="page-stack create-ticket-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Formulario</p>
          <h2>Nueva solicitud de soporte</h2>
        </div>
        <span className="muted-note">El ticket nacerá abierto y verás su detalle como confirmación de envío.</span>
      </section>
      <TicketForm currentUser={currentUser} onSubmit={onCreateTicket} requesters={requesters} />
    </div>
  );
}
