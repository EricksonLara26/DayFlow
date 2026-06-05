import { useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";
import Button from "../../components/common/Button";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import SuccessMessage from "../../components/common/SuccessMessage";
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
  onRetry,
  onTakeTicket,
  tickets,
  users,
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const filteredTickets = useMemo(() => filterTickets(tickets, filters), [filters, tickets]);
  const isEmployeeScope = scope === "employee";
  const copy = {
    employee: {
      eyebrow: "Mis solicitudes",
      title: "Tickets creados por ti",
    },
    technician: {
      eyebrow: "Vista tecnica",
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
      eyebrow: "Historial tecnico",
      title: "Solicitudes cerradas por ti",
    },
    administrator: {
      eyebrow: "Gestion administrativa",
      title: "Todas las solicitudes del sistema",
    },
  }[scope] ?? {
    eyebrow: "Solicitudes",
    title: "Tickets de soporte",
  };
  const createButton =
    isEmployeeScope && onCreateTicket ? (
      <Button icon={PlusCircle} onClick={onCreateTicket}>
        Crear solicitud
      </Button>
    ) : null;
  const emptyState = tickets.length
    ? {
        title: "No hay resultados con esos filtros",
        message: "Ajusta la busqueda o cambia los filtros para ver otras solicitudes.",
      }
    : {
        title: isEmployeeScope ? "Todavia no tienes solicitudes" : "No hay solicitudes disponibles",
        message: isEmployeeScope
          ? "Cuando crees una solicitud aparecera aqui con su estado, prioridad y tecnico asignado."
          : "Cuando existan tickets para esta vista apareceran en esta lista.",
        action: createButton,
      };

  async function handleTakeTicket(ticketId) {
    if (!onTakeTicket) {
      return { ok: false };
    }

    setActionError("");
    setActionMessage("");

    try {
      const result = await onTakeTicket(ticketId);

      if (result?.ok === false) {
        setActionError(result.message ?? "No se pudo tomar el ticket.");
        return result;
      }

      setActionMessage(result?.message ?? "Ticket tomado correctamente.");
      return result;
    } catch {
      setActionError("No se pudo tomar el ticket.");
      return { ok: false };
    }
  }

  if (isLoading) {
    return (
      <div className="page-stack tickets-page">
        <LoadingState title="Cargando solicitudes" message="Estamos preparando la informacion de tus tickets." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack tickets-page">
        <ErrorState title="No se pudieron cargar las solicitudes" message={error} onRetry={onRetry} />
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
      <SuccessMessage>{actionMessage}</SuccessMessage>
      {actionError ? <p className="form-error">{actionError}</p> : null}
      <TicketTable
        canTakeTicket={canTakeTicket}
        emptyState={emptyState}
        mode={isEmployeeScope ? "employee" : scope === "administrator" ? "administrator" : "standard"}
        onOpenTicket={onOpenTicket}
        onTakeTicket={handleTakeTicket}
        tickets={filteredTickets}
        users={users}
      />
    </div>
  );
}
