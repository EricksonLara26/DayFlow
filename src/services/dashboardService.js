import { TICKET_STATUSES } from "../data/tickets";
import { getUserFullName, isTechnicianUser } from "../data/users";
import { getTodayKey } from "../utils/dateUtils";
import { getTicketsDueInThreeDays, terminalTicketStatuses } from "../utils/ticketUtils";
import { getCategoriesSnapshot } from "./categoryService";
import { getDepartmentsSnapshot } from "./departmentService";
import { getTicketsSnapshot, getDashboardTicketsForUser } from "./ticketService";
import { getUsersSnapshot } from "./userService";

const emptySummary = {
  totalTickets: 0,
  openTickets: 0,
  inProgressTickets: 0,
  onHoldTickets: 0,
  completedTickets: 0,
  dismissedTickets: 0,
  overdueTickets: 0,
};

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
  return getDashboardSummary(getDashboardScopedTickets(filters));
}

export function getSummary(filters = {}) {
  return ok(getSummarySnapshot(filters));
}

function isOverdueTicket(ticket, todayKey = getTodayKey()) {
  return Boolean(
    ticket.dueDate &&
      ticket.dueDate < todayKey &&
      !terminalTicketStatuses.includes(ticket.status),
  );
}

export function getDashboardSummary(tickets = []) {
  return tickets.reduce(
    (summary, ticket) => {
      summary.totalTickets += 1;

      if (ticket.status === TICKET_STATUSES.OPEN) {
        summary.openTickets += 1;
      }

      if (ticket.status === TICKET_STATUSES.IN_PROGRESS) {
        summary.inProgressTickets += 1;
      }

      if (ticket.status === TICKET_STATUSES.ON_HOLD) {
        summary.onHoldTickets += 1;
      }

      if (ticket.status === TICKET_STATUSES.COMPLETED) {
        summary.completedTickets += 1;
      }

      if (ticket.status === TICKET_STATUSES.DISMISSED) {
        summary.dismissedTickets += 1;
      }

      if (isOverdueTicket(ticket)) {
        summary.overdueTickets += 1;
      }

      return summary;
    },
    { ...emptySummary },
  );
}

function getResolutionTimeMinutes(ticket) {
  if (!ticket.createdAt || !ticket.closedAt) {
    return null;
  }

  const createdAt = new Date(ticket.createdAt);
  const closedAt = new Date(ticket.closedAt);

  if (Number.isNaN(createdAt.getTime()) || Number.isNaN(closedAt.getTime())) {
    return null;
  }

  return Math.max(0, Math.round((closedAt.getTime() - createdAt.getTime()) / 60000));
}

function getAverageResolutionTime(tickets) {
  const resolutionTimes = tickets
    .map(getResolutionTimeMinutes)
    .filter((minutes) => minutes !== null);

  if (!resolutionTimes.length) {
    return null;
  }

  const totalMinutes = resolutionTimes.reduce((total, minutes) => total + minutes, 0);
  return Math.round(totalMinutes / resolutionTimes.length);
}

export function getTechnicianRankingSnapshot(filters = {}) {
  const users = filters.users ?? getUsersSnapshot();
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const technicians = users.filter((user) => isTechnicianUser(user) && user.active !== false);

  return getTechnicianRankingData(technicians, tickets);
}

export function getTechnicianRanking(filters = {}) {
  return ok(getTechnicianRankingSnapshot(filters));
}

export function getTechnicianRankingData(technicians = [], tickets = []) {
  const completedTickets = tickets.filter((ticket) => ticket.status === TICKET_STATUSES.COMPLETED);

  return technicians
    .map((technician) => {
      const technicianTickets = completedTickets.filter((ticket) => ticket.assignedTo === technician.id);

      return {
        technicianId: technician.id,
        technicianName: getUserFullName(technician),
        completedTickets: technicianTickets.length,
        averageResolutionTime: getAverageResolutionTime(technicianTickets),
      };
    })
    .sort(
      (first, second) =>
        second.completedTickets - first.completedTickets ||
        first.technicianName.localeCompare(second.technicianName),
    );
}

function getLookupByName(items = []) {
  return new Map(items.map((item) => [item.name, item]));
}

export function getTicketsByCategorySnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const categories = filters.categories ?? getCategoriesSnapshot();

  return getTicketsByCategoryData(tickets, categories);
}

export function getTicketsByCategory(filters = {}) {
  return ok(getTicketsByCategorySnapshot(filters));
}

export function getTicketsByCategoryData(tickets = [], categories = []) {
  const categoriesByName = getLookupByName(categories);
  const totals = tickets.reduce((accumulator, ticket) => {
    if (ticket.status === TICKET_STATUSES.DISMISSED) {
      return accumulator;
    }

    const categoryName = ticket.category?.trim() || "Sin categoria";
    const category = categoriesByName.get(categoryName);
    const categoryId = category?.id ?? null;
    const current = accumulator.get(categoryName) ?? { categoryId, categoryName, total: 0 };

    accumulator.set(categoryName, {
      ...current,
      total: current.total + 1,
    });

    return accumulator;
  }, new Map());

  return [...totals.values()].sort(
    (first, second) => second.total - first.total || first.categoryName.localeCompare(second.categoryName),
  );
}

export function getDemandByDepartmentSnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  const users = filters.users ?? getUsersSnapshot();
  const departments = filters.departments ?? getDepartmentsSnapshot();

  return getDemandByDepartmentData(tickets, users, departments);
}

export function getDemandByDepartment(filters = {}) {
  return ok(getDemandByDepartmentSnapshot(filters));
}

export function getDemandByDepartmentData(tickets = [], users = [], departments = []) {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const departmentsByName = getLookupByName(departments);
  const totals = tickets.reduce((accumulator, ticket) => {
    if (ticket.status === TICKET_STATUSES.DISMISSED) {
      return accumulator;
    }

    const requester = usersById.get(ticket.createdBy);
    const departmentName = ticket.department?.trim() || requester?.department?.trim() || "Sin departamento";
    const department = departmentsByName.get(departmentName);
    const departmentId = department?.id ?? null;
    const current = accumulator.get(departmentName) ?? { departmentId, departmentName, total: 0 };

    accumulator.set(departmentName, {
      ...current,
      total: current.total + 1,
    });

    return accumulator;
  }, new Map());

  return [...totals.values()].sort(
    (first, second) => second.total - first.total || first.departmentName.localeCompare(second.departmentName),
  );
}

function toDueTicketContract(ticket) {
  return {
    ticketId: ticket.id,
    title: ticket.title,
    dueDate: ticket.dueDate,
    status: ticket.status,
    priority: ticket.priority,
  };
}

export function getDueTicketsSnapshot(filters = {}) {
  return getTicketsDueInThreeDays(getDashboardScopedTickets(filters)).map(toDueTicketContract);
}

export function getDueTickets(filters = {}) {
  return ok(getDueTicketsSnapshot(filters));
}

export function getHistoricalSnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  return getHistoricalData(tickets);
}

export function getHistorical(filters = {}) {
  return ok(getHistoricalSnapshot(filters));
}

export function getActivityHistorySnapshot(filters = {}) {
  const tickets = filters.tickets ?? getTicketsSnapshot();
  return getActivityHistoryData(tickets);
}

export function getActivityHistory(filters = {}) {
  return ok(getActivityHistorySnapshot(filters));
}

export function getActivityHistoryData(tickets = []) {
  return tickets
    .flatMap((ticket) =>
      (ticket.history ?? []).map((item) => ({
        ...item,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
      })),
    )
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function getPeriodFromDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getHistoricalData(tickets = []) {
  const totals = tickets.reduce((accumulator, ticket) => {
    const createdPeriod = getPeriodFromDate(ticket.createdAt);

    if (createdPeriod) {
      const current = accumulator.get(createdPeriod) ?? {
        period: createdPeriod,
        created: 0,
        completed: 0,
        dismissed: 0,
      };

      accumulator.set(createdPeriod, {
        ...current,
        created: current.created + 1,
      });
    }

    if (terminalTicketStatuses.includes(ticket.status)) {
      const closedPeriod = getPeriodFromDate(ticket.closedAt ?? ticket.updatedAt);

      if (closedPeriod) {
        const current = accumulator.get(closedPeriod) ?? {
          period: closedPeriod,
          created: 0,
          completed: 0,
          dismissed: 0,
        };

        accumulator.set(closedPeriod, {
          ...current,
          completed: current.completed + (ticket.status === TICKET_STATUSES.COMPLETED ? 1 : 0),
          dismissed: current.dismissed + (ticket.status === TICKET_STATUSES.DISMISSED ? 1 : 0),
        });
      }
    }

    return accumulator;
  }, new Map());

  return [...totals.values()].sort((first, second) => first.period.localeCompare(second.period));
}
