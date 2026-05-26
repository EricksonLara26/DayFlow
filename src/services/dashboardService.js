import { isTechnicianUser } from "../data/users";
import {
  calculateDashboardStats,
  getTechnicianCompletionStats,
  getTicketDemandByDepartment,
  getTicketsDueInThreeDays,
  getTicketsExcludingDismissed,
  getTicketVolumeByCategory,
} from "../utils/ticketUtils";
import { getTicketsSnapshot, getDashboardTicketsForUser } from "./ticketService";
import { getUsersSnapshot } from "./userService";

function ok(data, extra = {}) {
  return Promise.resolve({ ok: true, data, ...extra });
}

function getDashboardScopedTickets(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();

  if (filters.user) {
    return getDashboardTicketsForUser(tickets, filters.user);
  }

  return tickets;
}

export function getSummarySnapshot(filters = {}) {
  return calculateDashboardStats(getDashboardScopedTickets(filters));
}

export function getSummary(filters = {}) {
  return ok(getSummarySnapshot(filters));
}

export function getTechnicianRankingSnapshot(filters = {}) {
  const users = filters.users ?? getUsersSnapshot();
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const technicians = users.filter((user) => isTechnicianUser(user) && user.active !== false);

  return getTechnicianCompletionStats(technicians, tickets);
}

export function getTechnicianRanking(filters = {}) {
  return ok(getTechnicianRankingSnapshot(filters));
}

export function getTicketsByCategorySnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  return getTicketVolumeByCategory(getTicketsExcludingDismissed(tickets));
}

export function getTicketsByCategory(filters = {}) {
  return ok(getTicketsByCategorySnapshot(filters));
}

export function getDemandByDepartmentSnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const users = filters.users ?? getUsersSnapshot();

  return getTicketDemandByDepartment(getTicketsExcludingDismissed(tickets), users);
}

export function getDemandByDepartment(filters = {}) {
  return ok(getDemandByDepartmentSnapshot(filters));
}

export function getDueTicketsSnapshot(filters = {}) {
  return getTicketsDueInThreeDays(getDashboardScopedTickets(filters));
}

export function getDueTickets(filters = {}) {
  return ok(getDueTicketsSnapshot(filters));
}
