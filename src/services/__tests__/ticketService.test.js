import {
  assignTicket,
  clearTicketsCache,
  createTicket,
  getDashboardTicketsForUser,
  getTicketById,
  getTicketScopeForView,
  getTickets,
  getTicketsForView,
  getTicketsSnapshot,
  getVisibleTicketsForUser,
} from "../ticketService";
import { VIEW_IDS } from "../../config/permissions";
import { ROLES } from "../../data/users";
import { TICKET_STATUSES } from "../../data/tickets";
import { clearCategoriesCache } from "../categoryService";
import { clearAccessToken } from "../tokenStorage";

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type"
          ? "application/json"
          : null;
      },
    },
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(""),
  };
}

function backendTicket(overrides = {}) {
  return {
    id: 31,
    title: "Solicitud API",
    description: "Detalle persistido por Django",
    category: 1,
    category_name: "Hardware",
    status: "OPEN",
    priority: "HIGH",
    requester: 3,
    requester_name: "Empleado Demo",
    assigned_technician: null,
    assigned_technician_name: null,
    requester_department: 1,
    requester_department_name: "Operaciones",
    due_date: null,
    taken_at: null,
    closed_at: null,
    created_at: "2026-06-04T12:00:00Z",
    updated_at: "2026-06-04T12:00:00Z",
    ...overrides,
  };
}

describe("ticketService", () => {
  const adminUser = { id: 1, role: ROLES.ADMINISTRATOR };
  const techUser = { id: 2, role: ROLES.TECHNICIAN };
  const empUser = { id: 3, role: ROLES.EMPLOYEE };

  const tickets = [
    {
      id: 1,
      createdBy: 3,
      assignedTo: null,
      status: TICKET_STATUSES.OPEN,
    },
    {
      id: 2,
      createdBy: 3,
      assignedTo: 2,
      status: TICKET_STATUSES.IN_PROGRESS,
    },
    {
      id: 3,
      createdBy: 3,
      assignedTo: 2,
      status: TICKET_STATUSES.COMPLETED,
    },
    {
      id: 4,
      createdBy: 1,
      assignedTo: null,
      status: TICKET_STATUSES.OPEN,
    },
    {
      id: 5,
      createdBy: 4,
      assignedTo: 1,
      status: TICKET_STATUSES.DISMISSED,
    },
  ];

  beforeEach(() => {
    clearAccessToken();
    clearCategoriesCache();
    clearTicketsCache();
    window.localStorage.clear();
  });

  afterEach(() => {
    delete global.fetch;
  });

  describe("getVisibleTicketsForUser", () => {
    test("admin ve todos los tickets", () => {
      expect(
        getVisibleTicketsForUser(tickets, adminUser),
      ).toHaveLength(5);
    });

    test("tecnico ve todos los tickets operativos", () => {
      expect(
        getVisibleTicketsForUser(tickets, techUser),
      ).toHaveLength(5);
    });

    test("usuario ve solo sus tickets", () => {
      const visible = getVisibleTicketsForUser(
        tickets,
        empUser,
      );

      expect(visible).toHaveLength(3);
      expect(
        visible.every(
          (ticket) => ticket.createdBy === empUser.id,
        ),
      ).toBe(true);
    });

    test("devuelve lista vacia sin usuario", () => {
      expect(getVisibleTicketsForUser(tickets, null)).toEqual(
        [],
      );
    });
  });

  describe("getTicketsForView", () => {
    test("available-tickets muestra solo abiertos sin asignar", () => {
      const visible = getTicketsForView(
        tickets,
        techUser,
        VIEW_IDS.AVAILABLE_TICKETS,
      );

      expect(visible).toHaveLength(2);
      expect(
        visible.every(
          (ticket) =>
            ticket.status === TICKET_STATUSES.OPEN &&
            !ticket.assignedTo,
        ),
      ).toBe(true);
    });

    test("my-tickets muestra asignados al tecnico sin estados terminales", () => {
      expect(
        getTicketsForView(
          tickets,
          techUser,
          VIEW_IDS.MY_TICKETS,
        ),
      ).toEqual([tickets[1]]);
    });

    test("history muestra cerrados asignados al tecnico", () => {
      expect(
        getTicketsForView(
          tickets,
          techUser,
          VIEW_IDS.HISTORY,
        ),
      ).toEqual([tickets[2]]);
    });

    test("tickets muestra solo tickets propios para usuario", () => {
      const visible = getTicketsForView(
        tickets,
        empUser,
        VIEW_IDS.TICKETS,
      );

      expect(
        visible.every(
          (ticket) => ticket.createdBy === empUser.id,
        ),
      ).toBe(true);
    });
  });

  describe("getDashboardTicketsForUser", () => {
    test("admin ve resumen de todos", () => {
      expect(
        getDashboardTicketsForUser(tickets, adminUser),
      ).toHaveLength(5);
    });

    test("tecnico ve abiertos sin asignar o asignados a el", () => {
      const summary = getDashboardTicketsForUser(
        tickets,
        techUser,
      );

      expect(
        summary.every(
          (ticket) =>
            ticket.assignedTo === techUser.id ||
            !ticket.assignedTo,
        ),
      ).toBe(true);
    });

    test("usuario ve solo sus tickets", () => {
      const summary = getDashboardTicketsForUser(
        tickets,
        empUser,
      );

      expect(
        summary.every(
          (ticket) => ticket.createdBy === empUser.id,
        ),
      ).toBe(true);
    });
  });

  describe("getTicketScopeForView", () => {
    test("admin conserva scope de administrador", () => {
      expect(
        getTicketScopeForView(
          adminUser,
          VIEW_IDS.TICKETS,
        ),
      ).toBe("administrator");
    });

    test("tecnico obtiene scope por vista", () => {
      expect(
        getTicketScopeForView(
          techUser,
          VIEW_IDS.AVAILABLE_TICKETS,
        ),
      ).toBe("technician-available");
      expect(
        getTicketScopeForView(
          techUser,
          VIEW_IDS.MY_TICKETS,
        ),
      ).toBe("technician-mine");
      expect(
        getTicketScopeForView(
          techUser,
          VIEW_IDS.HISTORY,
        ),
      ).toBe("technician-history");
    });

    test("usuario obtiene scope employee", () => {
      expect(
        getTicketScopeForView(
          empUser,
          VIEW_IDS.TICKETS,
        ),
      ).toBe("employee");
    });
  });

  test("lista desde la API, mapea camelCase y solo conserva cache en memoria", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [backendTicket()],
      }),
    );

    const result = await getTickets({
      status: "OPEN",
      priority: "HIGH",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: [
          expect.objectContaining({
            category: "Hardware",
            createdBy: 3,
            dueDate: "",
            title: "Solicitud API",
          }),
        ],
      }),
    );
    expect(getTicketsSnapshot()).toHaveLength(1);
    expect(
      window.localStorage.getItem("dayflow-tickets"),
    ).toBeNull();
    expect(String(global.fetch.mock.calls[0][0])).toContain(
      "status=OPEN",
    );
  });

  test("crea mediante Django usando IDs canonicos de catalogos", async () => {
    global.fetch = jest.fn(async (input, options = {}) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/categories/")) {
        return jsonResponse({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              name: "Hardware",
              active: true,
            },
          ],
        });
      }

      const body = JSON.parse(options.body);
      expect(body).toEqual(
        expect.objectContaining({
          category: 1,
          due_date: null,
          priority: "HIGH",
        }),
      );
      return jsonResponse(
        backendTicket({
          comments: [],
          attachments: [],
        }),
        201,
      );
    });

    const result = await createTicket({
      title: "Solicitud API",
      description: "Detalle persistido por Django",
      category: "Hardware",
      priority: "HIGH",
      dueDate: "",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        status: 201,
        data: expect.objectContaining({
          category: "Hardware",
          title: "Solicitud API",
        }),
      }),
    );
  });

  test("propaga fields cuando Django rechaza el formulario", async () => {
    global.fetch = jest.fn(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/categories/")) {
        return jsonResponse({
          count: 1,
          results: [
            {
              id: 1,
              name: "Hardware",
              active: true,
            },
          ],
        });
      }
      return jsonResponse(
        {
          message: "No se pudo procesar la solicitud.",
          fields: {
            title: ["Este campo es obligatorio."],
          },
        },
        400,
      );
    });

    const result = await createTicket({
      title: "",
      description: "",
      category: "Hardware",
      priority: "HIGH",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        status: 400,
        error: expect.objectContaining({
          fields: expect.objectContaining({
            title: ["Este campo es obligatorio."],
          }),
        }),
      }),
    );
  });

  test("detalle combina comentarios, adjuntos e historial de solo lectura", async () => {
    global.fetch = jest.fn(async (input) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/history/")) {
        return jsonResponse({
          count: 1,
          results: [
            {
              id: 1,
              event_type: "CREATED",
              action_code: "CREATED",
              action: "Ticket creado",
              actor: 3,
              actor_name: "Empleado Demo",
              created_at: "2026-06-04T12:00:00Z",
              changes: [],
            },
          ],
        });
      }
      return jsonResponse(
        backendTicket({
          comments: [],
          attachments: [],
        }),
      );
    });

    const result = await getTicketById(31);

    expect(result.data).toEqual(
      expect.objectContaining({
        comments: [],
        history: [
          expect.objectContaining({
            action: "Ticket creado",
            userId: 3,
          }),
        ],
      }),
    );
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("conflicto al tomar ticket conserva el 409 del backend", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(
        {
          message: "El ticket ya fue tomado.",
          fields: {},
        },
        409,
      ),
    );

    const result = await assignTicket(31, 2);

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        status: 409,
        message: "El ticket ya fue tomado.",
      }),
    );
  });
});
