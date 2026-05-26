import { createContext, useCallback, useMemo, useState } from "react";
import { TICKET_STATUSES } from "../data/tickets";
import {
  getDueTicketsSnapshot,
  getSummarySnapshot,
  getTechnicianRankingSnapshot,
} from "../services/dashboardService";
import {
  addTicketComment as addTicketCommentRequest,
  assignTicket as assignTicketRequest,
  changeTicketStatus as changeTicketStatusRequest,
  createTicket as createTicketRequest,
  getDashboardTicketsForUser,
  getTicketScopeForView,
  getTickets as fetchTickets,
  getTicketsForView,
  getTicketsSnapshot,
} from "../services/ticketService";
import { parseDateKey } from "../utils/dateUtils";
import { terminalTicketStatuses } from "../utils/ticketUtils";
import { useAuth } from "../hooks/useAuth";
import { useUsers } from "../hooks/useUsers";

export const TicketsContext = createContext(null);

export function TicketsProvider({ children }) {
  const { canCreateTicket, currentUser, isAdministrator, isTechnician } = useAuth();
  const { users } = useUsers();
  const [tickets, setTickets] = useState(() => getTicketsSnapshot());

  const refreshTickets = useCallback(async () => {
    const response = await fetchTickets();

    if (response.ok) {
      setTickets(response.data);
    }

    return response;
  }, []);

  const dashboardTickets = useMemo(
    () => getDashboardTicketsForUser(tickets, currentUser),
    [currentUser, tickets],
  );

  const dashboardSummary = useMemo(
    () => (currentUser ? getSummarySnapshot({ tickets, user: currentUser }) : null),
    [currentUser, tickets],
  );

  const dashboardDueTickets = useMemo(
    () => (currentUser ? getDueTicketsSnapshot({ tickets, user: currentUser }) : []),
    [currentUser, tickets],
  );

  const technicianRanking = useMemo(
    () => getTechnicianRankingSnapshot({ tickets, users }),
    [tickets, users],
  );

  const getTicketById = useCallback(
    (ticketId) => tickets.find((ticket) => ticket.id === Number(ticketId)) ?? null,
    [tickets],
  );

  const getVisibleTicketsForView = useCallback(
    (view) => getTicketsForView(tickets, currentUser, view),
    [currentUser, tickets],
  );

  const getScopeForView = useCallback(
    (view) => getTicketScopeForView(currentUser, view),
    [currentUser],
  );

  const canViewTicket = useCallback(
    (ticket) => {
      if (!currentUser || !ticket) {
        return false;
      }

      if (isAdministrator || isTechnician) {
        return true;
      }

      return ticket.createdBy === currentUser.id;
    },
    [currentUser, isAdministrator, isTechnician],
  );

  const canTakeTicket = useCallback(
    (ticket) =>
      Boolean(
        isTechnician &&
          canViewTicket(ticket) &&
          ticket.status === TICKET_STATUSES.OPEN &&
          !ticket.assignedTo,
      ),
    [canViewTicket, isTechnician],
  );

  const canManageTicket = useCallback(
    (ticket) => {
      if (!isTechnician || !canViewTicket(ticket) || terminalTicketStatuses.includes(ticket.status)) {
        return false;
      }

      return !ticket.assignedTo || ticket.assignedTo === currentUser.id;
    },
    [canViewTicket, currentUser, isTechnician],
  );

  const canCommentTicket = useCallback(
    (ticket) => {
      if (!currentUser || !canViewTicket(ticket)) {
        return false;
      }

      if (isAdministrator || isTechnician) {
        return true;
      }

      return ticket.createdBy === currentUser.id;
    },
    [canViewTicket, currentUser, isAdministrator, isTechnician],
  );

  const takeTicket = useCallback(
    async (ticketId) => {
      if (!currentUser || !isTechnician) {
        return { ok: false, message: "No tienes permiso para tomar tickets." };
      }

      const ticket = getTicketById(ticketId);

      if (!ticket || !canTakeTicket(ticket)) {
        return { ok: false, message: "No puedes tomar este ticket." };
      }

      const result = await assignTicketRequest(ticketId, currentUser.id);

      if (result.ok) {
        await refreshTickets();
      }

      return result;
    },
    [canTakeTicket, currentUser, getTicketById, isTechnician, refreshTickets],
  );

  const changeTicketStatus = useCallback(
    async (ticketId, nextStatus) => {
      if (!currentUser || !isTechnician) {
        return { ok: false, message: "No tienes permiso para cambiar estados." };
      }

      const ticket = getTicketById(ticketId);

      if (!ticket || !canManageTicket(ticket)) {
        return { ok: false, message: "No puedes modificar este ticket." };
      }

      const result = await changeTicketStatusRequest(ticketId, nextStatus, null, currentUser);

      if (result.ok) {
        await refreshTickets();
      }

      return result;
    },
    [canManageTicket, currentUser, getTicketById, isTechnician, refreshTickets],
  );

  const addComment = useCallback(
    async (ticketId, message) => {
      if (!currentUser) {
        return { ok: false, message: "No hay una sesi\u00f3n activa." };
      }

      const ticket = getTicketById(ticketId);

      if (!ticket || !canCommentTicket(ticket)) {
        return { ok: false, message: "No puedes comentar este ticket." };
      }

      const result = await addTicketCommentRequest(ticketId, message, currentUser);

      if (result.ok) {
        await refreshTickets();
      }

      return result;
    },
    [canCommentTicket, currentUser, getTicketById, refreshTickets],
  );

  const createTicket = useCallback(
    async (form) => {
      if (!currentUser || !canCreateTicket) {
        return { ok: false, message: "No tienes permiso para crear solicitudes." };
      }

      const requester = form.requester ?? currentUser;
      const dueDate = form.dueDate?.trim();

      if (!parseDateKey(dueDate)) {
        return { ok: false, message: "Selecciona una fecha l\u00edmite v\u00e1lida." };
      }

      const result = await createTicketRequest({
        ...form,
        dueDate,
        requester,
      });

      if (!result.ok) {
        return result;
      }

      await refreshTickets();

      return { ok: true, data: result.data, message: result.message };
    },
    [canCreateTicket, currentUser, refreshTickets],
  );

  const value = useMemo(
    () => ({
      addComment,
      canCommentTicket,
      canManageTicket,
      canTakeTicket,
      canViewTicket,
      changeTicketStatus,
      createTicket,
      dashboardDueTickets,
      dashboardSummary,
      dashboardTickets,
      getScopeForView,
      getTicketById,
      getVisibleTicketsForView,
      refreshTickets,
      takeTicket,
      technicianRanking,
      tickets,
    }),
    [
      addComment,
      canCommentTicket,
      canManageTicket,
      canTakeTicket,
      canViewTicket,
      changeTicketStatus,
      createTicket,
      dashboardDueTickets,
      dashboardSummary,
      dashboardTickets,
      getScopeForView,
      getTicketById,
      getVisibleTicketsForView,
      refreshTickets,
      takeTicket,
      technicianRanking,
      tickets,
    ],
  );

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}
