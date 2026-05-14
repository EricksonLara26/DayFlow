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
  currentUser,
  isTechnician,
  onOpenTicket,
  onTakeTicket,
  tickets,
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const scopedTickets = useMemo(
    () => (isTechnician ? tickets : tickets.filter((ticket) => ticket.createdBy === currentUser.id)),
    [currentUser.id, isTechnician, tickets],
  );
  const filteredTickets = useMemo(() => filterTickets(scopedTickets, filters), [filters, scopedTickets]);

  return (
    <div className="page-stack tickets-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">{isTechnician ? "Vista tecnica" : "Mis solicitudes"}</p>
          <h2>{isTechnician ? "Todas las solicitudes de soporte" : "Tickets creados por ti"}</h2>
        </div>
        <strong>{filteredTickets.length} resultado(s)</strong>
      </section>

      <TicketFilters filters={filters} onChange={setFilters} />
      <TicketTable
        canTakeTicket={canTakeTicket}
        onOpenTicket={onOpenTicket}
        onTakeTicket={onTakeTicket}
        tickets={filteredTickets}
      />
    </div>
  );
}
