import TicketForm from "../../components/tickets/TicketForm";
import "./CreateTicket.css";

export default function CreateTicket({ currentUser, onCreateTicket }) {
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
