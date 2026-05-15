import { useMemo, useState } from "react";
import TicketFilters from "../../components/tickets/TicketFilters";
import TicketTable from "../../components/tickets/TicketTable";
import { filterTickets } from "../../utils/ticketUtils";
import "./Tickets.css";

const defaultFilters = {
  query: "",
  status: "ALL",
  priority: "ALL",
  createdFrom: "",
  createdTo: "",
  dueSoon: false,
};

export default function Tickets({
  canTakeTicket,
  scope = "employee",
  onOpenTicket,
  onTakeTicket,
  tickets,
  users,
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [filters, tickets]);
  const copy = {
    employee: {
      eyebrow: "Mis solicitudes",
      title: "Tickets creados por ti",
    },
    technician: {
      eyebrow: "Vista tecnica",
      title: "Solicitudes disponibles y asignadas a ti",
    },
    supervisor: {
      eyebrow: "Gestor supervisor",
      title: "Todas las solicitudes del sistema",
    },
  }[scope];

  return (
    <div className="page-stack tickets-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
        </div>
        <strong>{filteredTickets.length} resultado(s)</strong>
      </section>

      <TicketFilters filters={filters} onChange={setFilters} />
      <TicketTable
        canTakeTicket={canTakeTicket}
        mode={scope === "supervisor" ? "supervisor" : "standard"}
        onOpenTicket={onOpenTicket}
        onTakeTicket={onTakeTicket}
        tickets={filteredTickets}
        users={users}
      />
    </div>
  );
}
