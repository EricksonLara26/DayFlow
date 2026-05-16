import TicketForm from "../../components/tickets/TicketForm";
import { ROLES, isTechnicianUser } from "../../data/users";
import "./CreateTicket.css";

export default function CreateTicket({ currentUser, onCreateTicket, users }) {
  const requesters = isTechnicianUser(currentUser)
    ? users.filter((user) => user.role === ROLES.EMPLOYEE)
    : [currentUser];

  return (
    <div className="page-stack create-ticket-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Formulario</p>
          <h2>Nueva solicitud de soporte</h2>
        </div>
        <span className="muted-note">El ticket nacera abierto y sin tecnico asignado.</span>
      </section>
      <TicketForm currentUser={currentUser} onSubmit={onCreateTicket} requesters={requesters} />
    </div>
  );
}
