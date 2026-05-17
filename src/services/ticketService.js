import { VIEW_IDS } from "../config/permissions";
import { ROLES } from "../config/roles";
import { TICKET_STATUSES } from "../data/tickets";
import { terminalTicketStatuses } from "../utils/ticketUtils";

function isOpenUnassigned(ticket) {
  return ticket.status === TICKET_STATUSES.OPEN && !ticket.assignedTo;
}

function isAssignedTo(ticket, user) {
  return ticket.assignedTo === user?.id;
}

export function getVisibleTicketsForUser(tickets, user) {
  if (!user) {
    return [];
  }

  if (user.role === ROLES.ADMINISTRATOR || user.role === ROLES.TECHNICIAN) {
    return tickets;
  }

  return tickets.filter((ticket) => ticket.createdBy === user.id);
}

export function getDashboardTicketsForUser(tickets, user) {
  if (!user) {
    return [];
  }

  if (user.role === ROLES.ADMINISTRATOR) {
    return tickets;
  }

  if (user.role === ROLES.TECHNICIAN) {
    return tickets.filter((ticket) => isOpenUnassigned(ticket) || isAssignedTo(ticket, user));
  }

  return tickets.filter((ticket) => ticket.createdBy === user.id);
}

export function getTicketsForView(tickets, user, view) {
  if (!user) {
    return [];
  }

  if (view === VIEW_IDS.AVAILABLE_TICKETS) {
    return tickets.filter(isOpenUnassigned);
  }

  if (view === VIEW_IDS.MY_TICKETS) {
    return tickets.filter(
      (ticket) => isAssignedTo(ticket, user) && !terminalTicketStatuses.includes(ticket.status),
    );
  }

  if (view === VIEW_IDS.HISTORY) {
    return tickets.filter(
      (ticket) => isAssignedTo(ticket, user) && terminalTicketStatuses.includes(ticket.status),
    );
  }

  if (view === VIEW_IDS.TICKETS && user.role === ROLES.ADMINISTRATOR) {
    return tickets;
  }

  if (view === VIEW_IDS.TICKETS && user.role === ROLES.EMPLOYEE) {
    return tickets.filter((ticket) => ticket.createdBy === user.id);
  }

  return getVisibleTicketsForUser(tickets, user);
}

export function getTicketScopeForView(user, view) {
  if (user?.role === ROLES.ADMINISTRATOR) {
    return "administrator";
  }

  if (view === VIEW_IDS.AVAILABLE_TICKETS) {
    return "technician-available";
  }

  if (view === VIEW_IDS.MY_TICKETS) {
    return "technician-mine";
  }

  if (view === VIEW_IDS.HISTORY) {
    return "technician-history";
  }

  if (user?.role === ROLES.TECHNICIAN) {
    return "technician";
  }

  return "employee";
}
