import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import Button from "../../components/common/Button";
import EmptyState from "../../components/common/EmptyState";
import LoadingSpinner from "../../components/common/LoadingSpinner";
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
  error = "",
  isLoading = false,
  scope = "employee",
  onCreateTicket,
  onOpenTicket,
  onTakeTicket,
  tickets,
  users,
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [filters, tickets]);
  const isEmployeeScope = scope === "employee";
  const copy = {
    employee: {
      eyebrow: "Mis solicitudes",
      title: "Tickets creados por ti",
    },
    technician: {
      eyebrow: "Vista técnica",
      title: "Todas las solicitudes de soporte",
    },
    "technician-available": {
      eyebrow: "Solicitudes disponibles",
      title: "Tickets abiertos sin asignar",
    },
    "technician-mine": {
      eyebrow: "Mis solicitudes",
      title: "Tickets activos asignados a ti",
    },
    "technician-history": {
      eyebrow: "Historial técnico",
      title: "Solicitudes cerradas por ti",
    },
    administrator: {
      eyebrow: "Gestión administrativa",
      title: "Todas las solicitudes del sistema",
    },
  }[scope] ?? {
    eyebrow: "Solicitudes",
    title: "Tickets de soporte",
  };
  const createButton =
    isEmployeeScope && onCreateTicket ? (
      <Button icon={PlusCircle} onClick={onCreateTicket}>
        Nueva solicitud
      </Button>
    ) : null;
  const emptyState = tickets.length
    ? {
        title: "No hay resultados con esos filtros",
        message: "Ajusta la búsqueda o cambia los filtros para ver otras solicitudes.",
        action: createButton,
      }
    : {
        title: isEmployeeScope ? "Todavía no tienes solicitudes" : "No hay solicitudes disponibles",
        message: isEmployeeScope
          ? "Cuando crees una solicitud aparecerá aquí con su estado, prioridad y técnico asignado."
          : "Cuando existan tickets para esta vista aparecerán en esta lista.",
        action: createButton,
      };

  if (isLoading) {
    return (
      <div className="page-stack tickets-page">
        <EmptyState title="Cargando solicitudes" message="Estamos preparando la información de tus tickets.">
          <LoadingSpinner size="md" />
        </EmptyState>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack tickets-page">
        <EmptyState title="No se pudieron cargar las solicitudes" message={error}>
          {createButton}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="page-stack tickets-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
        </div>
        <div className="tickets-intro-actions">
          <strong>{filteredTickets.length} resultado(s)</strong>
          {createButton}
        </div>
      </section>

      <TicketFilters filters={filters} onChange={setFilters} />
      <TicketTable
        canTakeTicket={canTakeTicket}
        emptyState={emptyState}
        mode={isEmployeeScope ? "employee" : scope === "administrator" ? "administrator" : "standard"}
        onOpenTicket={onOpenTicket}
        onTakeTicket={onTakeTicket}
        tickets={filteredTickets}
        users={users}
      />
    </div>
  );
}
