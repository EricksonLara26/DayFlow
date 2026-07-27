import { VIEW_IDS } from "../config/permissions";
import { ROLES } from "../config/roles";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "../data/tickets";
import { getUserFullName } from "../data/users";
import { initialTickets } from "../mocks";
import { getTodayKey, parseDateKey } from "../utils/dateUtils";
import { filterTickets, getStatusLabel, terminalTicketStatuses } from "../utils/ticketUtils";
import { apiRequest } from "./apiClient";
import {
  ticketAttachmentBackendToFrontend,
  ticketAttachmentToFormData,
} from "./mappers";
import { getUserSnapshotById } from "./userService";

const TICKETS_STORAGE_KEY = "dayflow-tickets";

let mockTickets = readStoredTickets() ?? clone(initialTickets);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStoredTickets() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawTickets = window.localStorage.getItem(TICKETS_STORAGE_KEY);
    const parsedTickets = rawTickets ? JSON.parse(rawTickets) : null;

    return Array.isArray(parsedTickets) ? parsedTickets : null;
  } catch {
    return null;
  }
}

function syncTicketsFromStorage() {
  if (!canUseLocalStorage()) {
    return;
  }

  mockTickets = readStoredTickets() ?? clone(initialTickets);
}

function persistTickets() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(TICKETS_STORAGE_KEY, JSON.stringify(mockTickets));
  } catch {
    // El panel sigue operando en memoria si el navegador bloquea localStorage.
  }
}

function replaceTickets(nextTickets) {
  mockTickets = nextTickets;
  persistTickets();
}

function ok(data, extra = {}) {
  return Promise.resolve({ ok: true, data, ...extra });
}

function fail(message, status = 400) {
  return Promise.resolve({ ok: false, status, message, error: { message, status } });
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeId(id) {
  return Number(id);
}

function getNextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function createHistoryItem(ticket, action, user, createdAt = nowIso()) {
  return {
    id: getNextId(ticket.history ?? []),
    action,
    userId: user.id,
    userName: getUserFullName(user),
    createdAt,
  };
}

function createCommentItem(ticket, message, user, createdAt = nowIso()) {
  return {
    id: getNextId(ticket.comments ?? []),
    authorId: user.id,
    authorName: getUserFullName(user),
    role: user.role,
    message,
    createdAt,
  };
}

function normalizeEvidence(evidence, timestamp = nowIso()) {
  const name = evidence?.name?.trim();

  if (!name) {
    return null;
  }

  return {
    name,
    size: Number(evidence.size) || 0,
    type: evidence.type?.trim() || "Archivo",
    uploadedAt: evidence.uploadedAt ?? timestamp,
  };
}

function findTicketIndex(ticketId) {
  const normalizedId = normalizeId(ticketId);
  return mockTickets.findIndex((ticket) => ticket.id === normalizedId);
}

function getTicketSnapshotByIndex(index) {
  return index >= 0 ? clone(mockTickets[index]) : null;
}

function applyTicketFilters(tickets, filters = {}) {
  let result = tickets;

  if (filters.user && filters.view) {
    result = getTicketsForView(result, filters.user, filters.view);
  } else if (filters.user && filters.dashboard === true) {
    result = getDashboardTicketsForUser(result, filters.user);
  }

  const hasListFilters = ["query", "status", "priority", "createdFrom", "createdTo", "dueSoon"].some(
    (key) => filters[key] !== undefined,
  );

  return hasListFilters
    ? filterTickets(result, {
        query: filters.query ?? "",
        status: filters.status ?? "ALL",
        priority: filters.priority ?? "ALL",
        createdFrom: filters.createdFrom ?? "",
        createdTo: filters.createdTo ?? "",
        dueSoon: Boolean(filters.dueSoon),
      })
    : result;
}

export function getTicketsSnapshot(filters = {}) {
  syncTicketsFromStorage();
  return clone(applyTicketFilters(mockTickets, filters));
}

export function getTicketSnapshotById(id) {
  syncTicketsFromStorage();
  const ticket = mockTickets.find((currentTicket) => currentTicket.id === normalizeId(id));
  return ticket ? clone(ticket) : null;
}

export function getTickets(filters = {}) {
  return ok(getTicketsSnapshot(filters));
}

export function getTicketById(id) {
  const ticket = getTicketSnapshotById(id);

  if (!ticket) {
    return fail("Ticket no encontrado.", 404);
  }

  return ok(ticket);
}

export function createTicket(payload) {
  syncTicketsFromStorage();
  const requester = payload.requester ?? getUserSnapshotById(payload.createdBy);
  const title = payload.title?.trim();
  const description = payload.description?.trim();
  const category = payload.category?.trim();
  const priority = payload.priority?.trim();
  const department = payload.department?.trim() || requester?.department?.trim();
  const dueDate = payload.dueDate?.trim() ?? "";

  if (!requester) {
    return fail("Solicitante no encontrado.", 404);
  }

  if (!title || !description) {
    return fail("Título y descripción son obligatorios.");
  }

  if (!category) {
    return fail("La categoría es obligatoria.");
  }

  if (!Object.values(TICKET_PRIORITIES).includes(priority)) {
    return fail("La prioridad es obligatoria.");
  }

  if (!department) {
    return fail("El departamento es obligatorio.");
  }

  if (dueDate && !parseDateKey(dueDate)) {
    return fail("Selecciona una fecha límite válida.");
  }

  if (dueDate && dueDate < getTodayKey()) {
    return fail("La fecha límite no puede ser anterior a hoy.");
  }

  const timestamp = nowIso();
  const requesterName = getUserFullName(requester);
  const evidence = normalizeEvidence(payload.evidence, timestamp);
  const nextTicket = {
    id: getNextId(mockTickets),
    title,
    description,
    category,
    status: TICKET_STATUSES.OPEN,
    priority,
    department,
    createdBy: requester.id,
    createdByName: requesterName,
    assignedTo: null,
    assignedToName: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    dueDate,
    evidence,
    closedAt: null,
    comments: [],
    history: [
      {
        id: 1,
        action: `Ticket creado por ${requesterName}`,
        userId: requester.id,
        userName: requesterName,
        createdAt: timestamp,
      },
    ],
  };

  replaceTickets([nextTicket, ...mockTickets]);

  return ok(clone(nextTicket), { message: "Ticket creado correctamente.", status: 201 });
}

export function updateTicket(id, payload) {
  syncTicketsFromStorage();
  const ticketIndex = findTicketIndex(id);

  if (ticketIndex === -1) {
    return fail("Ticket no encontrado.", 404);
  }

  replaceTickets(
    mockTickets.map((ticket, index) =>
      index === ticketIndex
        ? {
            ...ticket,
            ...payload,
            id: ticket.id,
            updatedAt: payload.updatedAt ?? nowIso(),
          }
        : ticket,
    ),
  );

  return ok(getTicketSnapshotByIndex(ticketIndex), { message: "Ticket actualizado correctamente." });
}

export function assignTicket(ticketId, technicianId) {
  syncTicketsFromStorage();
  const ticketIndex = findTicketIndex(ticketId);
  const technician = getUserSnapshotById(technicianId);

  if (ticketIndex === -1) {
    return fail("Ticket no encontrado.", 404);
  }

  if (!technician) {
    return fail("Tecnico no encontrado.", 404);
  }

  const timestamp = nowIso();
  const ticket = mockTickets[ticketIndex];
  const technicianName = getUserFullName(technician);
  const nextHistoryId = getNextId(ticket.history ?? []);

  replaceTickets(
    mockTickets.map((currentTicket, index) => {
      if (index !== ticketIndex) {
        return currentTicket;
      }

      return {
        ...currentTicket,
        assignedTo: technician.id,
        assignedToName: technicianName,
        status: TICKET_STATUSES.IN_PROGRESS,
        takenAt: currentTicket.takenAt ?? timestamp,
        updatedAt: timestamp,
        history: [
          ...(currentTicket.history ?? []),
          {
            id: nextHistoryId,
            action: `Ticket tomado por ${technicianName}`,
            userId: technician.id,
            userName: technicianName,
            createdAt: timestamp,
          },
          {
            id: nextHistoryId + 1,
            action: "Estado cambiado a En proceso",
            userId: technician.id,
            userName: technicianName,
            createdAt: timestamp,
          },
        ],
      };
    }),
  );

  return ok(getTicketSnapshotByIndex(ticketIndex), { message: "Ticket asignado correctamente." });
}

export function changeTicketStatus(ticketId, status, comment, actor) {
  syncTicketsFromStorage();
  const ticketIndex = findTicketIndex(ticketId);

  if (ticketIndex === -1) {
    return fail("Ticket no encontrado.", 404);
  }

  if (!Object.values(TICKET_STATUSES).includes(status)) {
    return fail("Estado de ticket invalido.");
  }

  const ticket = mockTickets[ticketIndex];
  const actingUser = actor ?? getUserSnapshotById(ticket.assignedTo);

  if (!actingUser) {
    return fail("Usuario responsable no encontrado.", 404);
  }

  const timestamp = nowIso();
  const shouldClose = status === TICKET_STATUSES.COMPLETED || status === TICKET_STATUSES.DISMISSED;
  const assignedTo = ticket.assignedTo ?? actingUser.id;
  const assignedToName = ticket.assignedToName ?? getUserFullName(actingUser);
  const action =
    status === TICKET_STATUSES.COMPLETED
      ? "Ticket completado"
      : status === TICKET_STATUSES.DISMISSED
        ? "Ticket desestimado por area tecnica"
        : `Estado cambiado a ${getStatusLabel(status)}`;

  replaceTickets(
    mockTickets.map((currentTicket, index) => {
      if (index !== ticketIndex) {
        return currentTicket;
      }

      const nextComments = comment
        ? [...(currentTicket.comments ?? []), createCommentItem(currentTicket, comment, actingUser, timestamp)]
        : currentTicket.comments;

      return {
        ...currentTicket,
        assignedTo,
        assignedToName,
        status,
        takenAt: currentTicket.takenAt ?? (!currentTicket.assignedTo ? timestamp : currentTicket.takenAt),
        updatedAt: timestamp,
        closedAt: shouldClose ? timestamp : currentTicket.closedAt,
        comments: nextComments,
        history: [...(currentTicket.history ?? []), createHistoryItem(currentTicket, action, actingUser, timestamp)],
      };
    }),
  );

  return ok(getTicketSnapshotByIndex(ticketIndex), { message: "Estado actualizado correctamente." });
}

export function addTicketComment(ticketId, message, actor) {
  syncTicketsFromStorage();
  const ticketIndex = findTicketIndex(ticketId);

  if (ticketIndex === -1) {
    return fail("Ticket no encontrado.", 404);
  }

  if (!actor) {
    return fail("Usuario responsable no encontrado.", 404);
  }

  const timestamp = nowIso();

  replaceTickets(
    mockTickets.map((currentTicket, index) => {
      if (index !== ticketIndex) {
        return currentTicket;
      }

      return {
        ...currentTicket,
        comments: [
          ...(currentTicket.comments ?? []),
          createCommentItem(currentTicket, message, actor, timestamp),
        ],
        history: [
          ...(currentTicket.history ?? []),
          createHistoryItem(
            currentTicket,
            `Comentario agregado por ${getUserFullName(actor)}`,
            actor,
            timestamp,
          ),
        ],
        updatedAt: timestamp,
      };
    }),
  );

  return ok(getTicketSnapshotByIndex(ticketIndex), { message: "Comentario agregado correctamente." });
}

export function uploadTicketAttachment(
  ticketId,
  fileOrPayload,
  description,
) {
  const formData = ticketAttachmentToFormData(
    fileOrPayload,
    description,
  );

  return apiRequest(`tickets/${Number(ticketId)}/attachments/`, {
    body: formData,
    mapResponse: ticketAttachmentBackendToFrontend,
    method: "POST",
  });
}

export function closeTicket(ticketId, payload = {}) {
  const nextStatus = payload.status ?? TICKET_STATUSES.COMPLETED;
  return changeTicketStatus(ticketId, nextStatus, payload.comment, payload.actor);
}

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
