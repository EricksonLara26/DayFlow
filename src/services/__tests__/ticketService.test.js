import {
  getDashboardTicketsForUser,
  getTicketScopeForView,
  getTicketsForView,
  getVisibleTicketsForUser,
} from "../ticketService";
import { VIEW_IDS } from "../../config/permissions";
import { ROLES } from "../../data/users";
import { TICKET_STATUSES } from "../../data/tickets";

describe("ticketService", () => {
  const adminUser = { id: 1, role: ROLES.ADMINISTRATOR };
  const techUser = { id: 2, role: ROLES.TECHNICIAN };
  const empUser = { id: 3, role: ROLES.EMPLOYEE };

  const tickets = [
    { id: 1, createdBy: 3, assignedTo: null, status: TICKET_STATUSES.OPEN },
    { id: 2, createdBy: 3, assignedTo: 2, status: TICKET_STATUSES.IN_PROGRESS },
    { id: 3, createdBy: 3, assignedTo: 2, status: TICKET_STATUSES.COMPLETED },
    { id: 4, createdBy: 1, assignedTo: null, status: TICKET_STATUSES.OPEN },
    { id: 5, createdBy: 4, assignedTo: 1, status: TICKET_STATUSES.DISMISSED },
  ];

  describe("getVisibleTicketsForUser", () => {
    test("admin ve todos los tickets", () => {
      expect(getVisibleTicketsForUser(tickets, adminUser)).toHaveLength(5);
    });

    test("tecnico ve todos los tickets operativos", () => {
      expect(getVisibleTicketsForUser(tickets, techUser)).toHaveLength(5);
    });

    test("empleado ve solo sus tickets", () => {
      const visible = getVisibleTicketsForUser(tickets, empUser);

      expect(visible).toHaveLength(3);
      expect(visible.every((ticket) => ticket.createdBy === empUser.id)).toBe(true);
    });

    test("devuelve lista vacia sin usuario", () => {
      expect(getVisibleTicketsForUser(tickets, null)).toEqual([]);
    });
  });

  describe("getTicketsForView", () => {
    test("available-tickets muestra solo abiertos sin asignar", () => {
      const visible = getTicketsForView(tickets, techUser, VIEW_IDS.AVAILABLE_TICKETS);

      expect(visible).toHaveLength(2);
      expect(visible.every((ticket) => ticket.status === TICKET_STATUSES.OPEN && !ticket.assignedTo)).toBe(true);
    });

    test("my-tickets muestra asignados al tecnico sin estados terminales", () => {
      const visible = getTicketsForView(tickets, techUser, VIEW_IDS.MY_TICKETS);

      expect(visible).toEqual([tickets[1]]);
    });

    test("history muestra cerrados asignados al tecnico", () => {
      const visible = getTicketsForView(tickets, techUser, VIEW_IDS.HISTORY);

      expect(visible).toEqual([tickets[2]]);
    });

    test("tickets muestra solo tickets propios para empleado", () => {
      const visible = getTicketsForView(tickets, empUser, VIEW_IDS.TICKETS);

      expect(visible.every((ticket) => ticket.createdBy === empUser.id)).toBe(true);
    });
  });

  describe("getDashboardTicketsForUser", () => {
    test("admin ve resumen de todos", () => {
      expect(getDashboardTicketsForUser(tickets, adminUser)).toHaveLength(5);
    });

    test("tecnico ve abiertos sin asignar o asignados a el", () => {
      const summary = getDashboardTicketsForUser(tickets, techUser);

      expect(summary.every((ticket) => ticket.assignedTo === techUser.id || !ticket.assignedTo)).toBe(true);
    });

    test("empleado ve solo sus tickets", () => {
      const summary = getDashboardTicketsForUser(tickets, empUser);

      expect(summary.every((ticket) => ticket.createdBy === empUser.id)).toBe(true);
    });
  });

  describe("getTicketScopeForView", () => {
    test("admin conserva scope de administrador", () => {
      expect(getTicketScopeForView(adminUser, VIEW_IDS.TICKETS)).toBe("administrator");
    });

    test("tecnico obtiene scope por vista", () => {
      expect(getTicketScopeForView(techUser, VIEW_IDS.AVAILABLE_TICKETS)).toBe("technician-available");
      expect(getTicketScopeForView(techUser, VIEW_IDS.MY_TICKETS)).toBe("technician-mine");
      expect(getTicketScopeForView(techUser, VIEW_IDS.HISTORY)).toBe("technician-history");
    });

    test("empleado obtiene scope employee", () => {
      expect(getTicketScopeForView(empUser, VIEW_IDS.TICKETS)).toBe("employee");
    });
  });
});
