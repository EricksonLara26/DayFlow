import { TICKET_PRIORITIES, TICKET_STATUSES } from "../data/tickets";
import { isWithinNextDays } from "./dateUtils";

export const terminalTicketStatuses = [TICKET_STATUSES.COMPLETED, TICKET_STATUSES.DISMISSED];

export function getTicketsByStatus(tickets, status) {
  return tickets.filter((ticket) => ticket.status === status);
}

export function getTicketsByTechnician(tickets, technicianId) {
  return tickets.filter((ticket) => ticket.assignedTo === technicianId);
}

export function getCompletedTicketsByTechnician(tickets, technicianId) {
  return tickets.filter(
    (ticket) => ticket.assignedTo === technicianId && ticket.status === TICKET_STATUSES.COMPLETED,
  );
}

export function getDismissedTicketsByTechnician(tickets, technicianId) {
  return tickets.filter(
    (ticket) => ticket.assignedTo === technicianId && ticket.status === TICKET_STATUSES.DISMISSED,
  );
}

export function getTicketsDueInThreeDays(tickets) {
  return tickets
    .filter((ticket) => !terminalTicketStatuses.includes(ticket.status))
    .filter((ticket) => isWithinNextDays(ticket.dueDate, 3))
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate));
}

export function sortTechniciansByCompletedTickets(technicians) {
  return [...technicians].sort((first, second) => {
    const completedDifference = (second.completedTickets ?? 0) - (first.completedTickets ?? 0);

    if (completedDifference !== 0) {
      return completedDifference;
    }

    return `${first.firstName} ${first.lastName}`.localeCompare(`${second.firstName} ${second.lastName}`);
  });
}

export function getCompletedTickets(tickets) {
  return tickets
    .filter((ticket) => ticket.status === TICKET_STATUSES.COMPLETED)
    .sort((first, second) => (second.completedAt ?? "").localeCompare(first.completedAt ?? ""));
}

export function getTicketVolumeByCategory(tickets) {
  const totals = tickets.reduce((accumulator, ticket) => {
    accumulator[ticket.category] = (accumulator[ticket.category] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label));
}

export function getTicketDemandByDepartment(tickets, users) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const totals = tickets.reduce((accumulator, ticket) => {
    const requester = usersById.get(ticket.createdBy);
    const department = requester?.department?.trim() || "Sin departamento";
    accumulator[department] = (accumulator[department] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(totals)
    .map(([label, value]) => ({ label, value }))
    .sort((first, second) => second.value - first.value || first.label.localeCompare(second.label));
}

export function calculateDashboardStats(tickets) {
  return {
    total: tickets.length,
    open: getTicketsByStatus(tickets, TICKET_STATUSES.OPEN).length,
    inProgress: getTicketsByStatus(tickets, TICKET_STATUSES.IN_PROGRESS).length,
    onHold: getTicketsByStatus(tickets, TICKET_STATUSES.ON_HOLD).length,
    completed: getTicketsByStatus(tickets, TICKET_STATUSES.COMPLETED).length,
    dismissed: getTicketsByStatus(tickets, TICKET_STATUSES.DISMISSED).length,
  };
}

export function getStatusLabel(status) {
  const labels = {
    [TICKET_STATUSES.OPEN]: "Abierto",
    [TICKET_STATUSES.IN_PROGRESS]: "En proceso",
    [TICKET_STATUSES.ON_HOLD]: "En hold",
    [TICKET_STATUSES.COMPLETED]: "Completado",
    [TICKET_STATUSES.DISMISSED]: "Desestimado por area tecnica",
  };

  return labels[status] ?? status;
}

export function getPriorityLabel(priority) {
  const labels = {
    [TICKET_PRIORITIES.LOW]: "Baja",
    [TICKET_PRIORITIES.MEDIUM]: "Media",
    [TICKET_PRIORITIES.HIGH]: "Alta",
    [TICKET_PRIORITIES.CRITICAL]: "Critica",
  };

  return labels[priority] ?? priority;
}

export function getStatusColorClass(status) {
  return `status-${String(status).toLowerCase().replaceAll("_", "-")}`;
}

export function getPriorityColorClass(priority) {
  return `priority-${String(priority).toLowerCase()}`;
}

export function filterTickets(tickets, filters) {
  const query = filters.query.trim().toLowerCase();

  return tickets.filter((ticket) => {
    const matchesStatus = filters.status === "ALL" || ticket.status === filters.status;
    const matchesPriority = filters.priority === "ALL" || ticket.priority === filters.priority;
    const matchesDueSoon = !filters.dueSoon || isWithinNextDays(ticket.dueDate, 3);
    const createdDate = ticket.createdAt.slice(0, 10);
    const matchesDateFrom = !filters.createdFrom || createdDate >= filters.createdFrom;
    const matchesDateTo = !filters.createdTo || createdDate <= filters.createdTo;
    const searchableText = `${ticket.title} ${ticket.createdByName} ${ticket.assignedToName ?? ""}`.toLowerCase();
    const matchesQuery = !query || searchableText.includes(query);

    return (
      matchesStatus &&
      matchesPriority &&
      matchesDueSoon &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesQuery
    );
  });
}
