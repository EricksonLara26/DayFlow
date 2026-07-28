import { VIEW_IDS } from "../config/permissions";
import { ROLES } from "../config/roles";
import { TICKET_STATUSES } from "../data/tickets";
import { filterTickets, terminalTicketStatuses } from "../utils/ticketUtils";
import { apiRequest } from "./apiClient";
import {
  getActiveCategories,
  getCategoriesSnapshot,
} from "./categoryService";
import {
  ticketAttachmentBackendToFrontend,
  ticketAttachmentToFormData,
  ticketBackendToFrontend,
  ticketCommentBackendToFrontend,
  ticketFrontendToBackend,
  ticketHistoryBackendToFrontend,
} from "./mappers";

let cachedTickets = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(id) {
  return Number(id);
}

function getListItems(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.results) ? payload.results : [];
}

function normalizeTicket(ticket) {
  if (!ticket || typeof ticket !== "object") {
    return null;
  }

  const mapped = ticketBackendToFrontend(ticket);
  return {
    ...mapped,
    id: normalizeId(mapped.id),
    createdBy: normalizeId(mapped.createdBy),
    assignedTo:
      mapped.assignedTo === null || mapped.assignedTo === undefined
        ? null
        : normalizeId(mapped.assignedTo),
  };
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value ?? {}, key);
}

function mergeTicket(existing, incoming, source = incoming) {
  if (!existing) {
    return incoming;
  }

  return {
    ...existing,
    ...incoming,
    attachments:
      hasOwn(source, "attachments")
        ? incoming.attachments
        : existing.attachments ?? [],
    comments:
      hasOwn(source, "comments")
        ? incoming.comments
        : existing.comments ?? [],
    history:
      hasOwn(source, "history") || hasOwn(source, "historyEntries")
        ? incoming.history
        : existing.history ?? [],
  };
}

function upsertCachedTicket(ticket, source = ticket) {
  const normalized = normalizeTicket(ticket);
  if (!normalized) {
    return null;
  }

  const existing = cachedTickets.find(
    (current) => current.id === normalized.id,
  );
  const merged = mergeTicket(existing, normalized, source);
  cachedTickets = existing
    ? cachedTickets.map((current) =>
        current.id === merged.id ? merged : current,
      )
    : [merged, ...cachedTickets];
  return merged;
}

function replaceTicketList(tickets) {
  const nextTickets = tickets
    .map((ticket) => {
      const normalized = normalizeTicket(ticket);
      if (!normalized) {
        return null;
      }
      const existing = cachedTickets.find(
        (current) => current.id === normalized.id,
      );
      return mergeTicket(existing, normalized, ticket);
    })
    .filter(Boolean);

  cachedTickets = nextTickets;
  return getTicketsSnapshot();
}

function applyTicketFilters(tickets, filters = {}) {
  let result = tickets;

  if (filters.user && filters.view) {
    result = getTicketsForView(result, filters.user, filters.view);
  } else if (filters.user && filters.dashboard === true) {
    result = getDashboardTicketsForUser(result, filters.user);
  }

  const hasListFilters = [
    "query",
    "status",
    "priority",
    "createdFrom",
    "createdTo",
    "dueSoon",
  ].some((key) => filters[key] !== undefined);

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

function mapViewToApiScope(user, view) {
  if (user?.role !== ROLES.TECHNICIAN) {
    return undefined;
  }
  if (view === VIEW_IDS.AVAILABLE_TICKETS) {
    return "available";
  }
  if (view === VIEW_IDS.MY_TICKETS) {
    return "mine";
  }
  if (view === VIEW_IDS.HISTORY) {
    return "history";
  }
  return "all";
}

async function getCategoryLookup() {
  const cachedCategories = getCategoriesSnapshot({ active: true });
  if (cachedCategories.length) {
    return cachedCategories;
  }

  const response = await getActiveCategories();
  return response.ok ? response.data : [];
}

function mapActionResponse(response, fallbackMessage) {
  if (!response.ok) {
    return response;
  }

  const ticket = upsertCachedTicket(response.data);
  return {
    ...response,
    data: clone(ticket),
    message: response.message || fallbackMessage,
  };
}

export function clearTicketsCache() {
  cachedTickets = [];
}

export function getTicketsSnapshot(filters = {}) {
  return clone(applyTicketFilters(cachedTickets, filters));
}

export function getTicketSnapshotById(id) {
  const ticket = cachedTickets.find(
    (current) => current.id === normalizeId(id),
  );
  return ticket ? clone(ticket) : null;
}

export async function getTickets(filters = {}) {
  const response = await apiRequest("tickets/", {
    query: {
      query: filters.query,
      status: filters.status,
      priority: filters.priority,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
      dueSoon: filters.dueSoon,
      scope:
        filters.scope ??
        mapViewToApiScope(filters.user, filters.view),
      page: filters.page,
      pageSize: filters.pageSize ?? 100,
    },
  });

  if (!response.ok) {
    return response;
  }

  const tickets = replaceTicketList(getListItems(response.data));
  return {
    ...response,
    data: clone(applyTicketFilters(tickets, filters)),
    pagination: {
      count: response.data?.count ?? tickets.length,
      next: response.data?.next ?? null,
      previous: response.data?.previous ?? null,
    },
  };
}

export async function getTicketHistory(id) {
  const response = await apiRequest(
    `tickets/${normalizeId(id)}/history/`,
  );
  if (!response.ok) {
    return response;
  }

  const history = getListItems(response.data).map(
    ticketHistoryBackendToFrontend,
  );
  return { ...response, data: history };
}

export async function getTicketById(id) {
  const ticketId = normalizeId(id);
  const response = await apiRequest(`tickets/${ticketId}/`, {
    mapResponse: ticketBackendToFrontend,
  });

  if (!response.ok) {
    return response;
  }

  const historyResponse = await getTicketHistory(ticketId);
  if (!historyResponse.ok) {
    return historyResponse;
  }

  const source = {
    ...response.data,
    history: historyResponse.data,
  };
  const ticket = upsertCachedTicket(source, source);
  return { ...response, data: clone(ticket) };
}

export async function createTicket(payload) {
  const categories = await getCategoryLookup();
  const body = ticketFrontendToBackend(payload, { categories });
  const response = await apiRequest("tickets/", {
    body,
    mapRequest: false,
    mapResponse: ticketBackendToFrontend,
    method: "POST",
  });

  if (!response.ok) {
    return response;
  }

  let ticket = upsertCachedTicket(response.data, response.data);
  const evidence =
    payload.evidence &&
    typeof payload.evidence === "object" &&
    "file" in payload.evidence
      ? payload.evidence.file
      : payload.evidence;

  if (
    evidence &&
    ((typeof File !== "undefined" && evidence instanceof File) ||
      (typeof Blob !== "undefined" && evidence instanceof Blob))
  ) {
    const attachmentResponse = await uploadTicketAttachment(
      ticket.id,
      evidence,
      payload.evidence?.description,
    );
    if (!attachmentResponse.ok) {
      return {
        ...response,
        data: clone(ticket),
        message:
          "Ticket creado, pero no se pudo adjuntar la evidencia: " +
          attachmentResponse.message,
        warning: attachmentResponse.error,
      };
    }

    ticket = upsertCachedTicket(
      {
        ...ticket,
        attachments: [
          ...(ticket.attachments ?? []),
          attachmentResponse.data,
        ],
      },
      { attachments: true },
    );
  }

  return {
    ...response,
    data: clone(ticket),
    message: response.message || "Ticket creado correctamente.",
  };
}

export async function updateTicket(id, payload) {
  const categories = await getCategoryLookup();
  const response = await apiRequest(
    `tickets/${normalizeId(id)}/`,
    {
      body: ticketFrontendToBackend(payload, { categories }),
      mapRequest: false,
      mapResponse: ticketBackendToFrontend,
      method: "PATCH",
    },
  );
  return mapActionResponse(
    response,
    "Ticket actualizado correctamente.",
  );
}

export async function assignTicket(ticketId) {
  const response = await apiRequest(
    `tickets/${normalizeId(ticketId)}/take/`,
    {
      mapResponse: ticketBackendToFrontend,
      method: "POST",
    },
  );
  return mapActionResponse(
    response,
    "Ticket asignado correctamente.",
  );
}

export async function changeTicketStatus(
  ticketId,
  status,
  comment,
) {
  const response = await apiRequest(
    `tickets/${normalizeId(ticketId)}/status/`,
    {
      body: { status },
      mapResponse: ticketBackendToFrontend,
      method: "POST",
    },
  );
  const result = mapActionResponse(
    response,
    "Estado actualizado correctamente.",
  );

  if (result.ok && comment?.trim()) {
    const commentResult = await addTicketComment(
      ticketId,
      comment,
    );
    if (!commentResult.ok) {
      return commentResult;
    }
  }

  return result;
}

export async function addTicketComment(ticketId, message) {
  const response = await apiRequest(
    `tickets/${normalizeId(ticketId)}/comments/`,
    {
      body: { message },
      mapResponse: ticketCommentBackendToFrontend,
      method: "POST",
    },
  );
  if (!response.ok) {
    return response;
  }

  const id = normalizeId(ticketId);
  const existing = cachedTickets.find((ticket) => ticket.id === id);
  if (existing) {
    upsertCachedTicket(
      {
        ...existing,
        comments: [...(existing.comments ?? []), response.data],
      },
      { comments: true },
    );
  }

  return {
    ...response,
    message: response.message || "Comentario agregado correctamente.",
  };
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

  return apiRequest(
    `tickets/${normalizeId(ticketId)}/attachments/`,
    {
      body: formData,
      mapResponse: ticketAttachmentBackendToFrontend,
      method: "POST",
    },
  );
}

export function downloadTicketAttachment(ticketId, attachmentId) {
  return apiRequest(
    `tickets/${normalizeId(ticketId)}/attachments/${normalizeId(
      attachmentId,
    )}/download/`,
    {
      responseType: "blob",
    },
  );
}

export function closeTicket(ticketId, payload = {}) {
  const nextStatus =
    payload.status ?? TICKET_STATUSES.COMPLETED;
  return changeTicketStatus(
    ticketId,
    nextStatus,
    payload.comment,
  );
}

function isOpenUnassigned(ticket) {
  return (
    ticket.status === TICKET_STATUSES.OPEN &&
    !ticket.assignedTo
  );
}

function isAssignedTo(ticket, user) {
  return ticket.assignedTo === user?.id;
}

export function getVisibleTicketsForUser(tickets, user) {
  if (!user) {
    return [];
  }

  if (
    user.role === ROLES.ADMINISTRATOR ||
    user.role === ROLES.TECHNICIAN
  ) {
    return tickets;
  }

  return tickets.filter(
    (ticket) => ticket.createdBy === user.id,
  );
}

export function getDashboardTicketsForUser(tickets, user) {
  if (!user) {
    return [];
  }

  if (user.role === ROLES.ADMINISTRATOR) {
    return tickets;
  }

  if (user.role === ROLES.TECHNICIAN) {
    return tickets.filter(
      (ticket) =>
        isOpenUnassigned(ticket) || isAssignedTo(ticket, user),
    );
  }

  return tickets.filter(
    (ticket) => ticket.createdBy === user.id,
  );
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
      (ticket) =>
        isAssignedTo(ticket, user) &&
        !terminalTicketStatuses.includes(ticket.status),
    );
  }

  if (view === VIEW_IDS.HISTORY) {
    return tickets.filter(
      (ticket) =>
        isAssignedTo(ticket, user) &&
        terminalTicketStatuses.includes(ticket.status),
    );
  }

  if (
    view === VIEW_IDS.TICKETS &&
    user.role === ROLES.ADMINISTRATOR
  ) {
    return tickets;
  }

  if (
    view === VIEW_IDS.TICKETS &&
    user.role === ROLES.EMPLOYEE
  ) {
    return tickets.filter(
      (ticket) => ticket.createdBy === user.id,
    );
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
