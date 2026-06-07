import { TICKET_PRIORITIES, TICKET_STATUSES } from "../../data/tickets";
import { filterTickets } from "../ticketUtils";

describe("filterTickets", () => {
  const tickets = [
    {
      id: 1,
      title: "Laptop no enciende",
      description: "Equipo de Juan",
      category: "Hardware",
      department: "Administracion",
      status: TICKET_STATUSES.OPEN,
      priority: TICKET_PRIORITIES.HIGH,
      createdByName: "Juan Perez",
      assignedToName: null,
      createdAt: "2026-06-01T10:00:00.000Z",
      dueDate: "2026-06-10",
    },
    {
      id: 2,
      title: "VPN inestable",
      description: "Conexion remota",
      category: "Redes",
      department: "Ventas",
      status: TICKET_STATUSES.IN_PROGRESS,
      priority: TICKET_PRIORITIES.CRITICAL,
      createdByName: "Laura Mendez",
      assignedToName: "Mariela Santos",
      createdAt: "2026-06-02T10:00:00.000Z",
      dueDate: "2026-06-11",
    },
    {
      id: 3,
      title: "Instalar editor PDF",
      description: "Licencia aprobada",
      category: "Software",
      department: "Compras",
      status: TICKET_STATUSES.COMPLETED,
      priority: TICKET_PRIORITIES.LOW,
      createdByName: "Pedro Nunez",
      assignedToName: "Carlos Diaz",
      createdAt: "2026-06-03T10:00:00.000Z",
      dueDate: "2026-06-12",
    },
  ];

  const defaultFilters = {
    query: "",
    status: "ALL",
    priority: "ALL",
    createdFrom: "",
    createdTo: "",
    dueSoon: false,
  };

  test("filtra por estado", () => {
    const result = filterTickets(tickets, {
      ...defaultFilters,
      status: TICKET_STATUSES.IN_PROGRESS,
    });

    expect(result.map((ticket) => ticket.id)).toEqual([2]);
  });

  test("filtra por prioridad", () => {
    const result = filterTickets(tickets, {
      ...defaultFilters,
      priority: TICKET_PRIORITIES.HIGH,
    });

    expect(result.map((ticket) => ticket.id)).toEqual([1]);
  });

  test("busca por categoria", () => {
    const result = filterTickets(tickets, {
      ...defaultFilters,
      query: "software",
    });

    expect(result.map((ticket) => ticket.id)).toEqual([3]);
  });

  test("busca por solicitante o tecnico", () => {
    const byRequester = filterTickets(tickets, {
      ...defaultFilters,
      query: "Laura Mendez",
    });
    const byTechnician = filterTickets(tickets, {
      ...defaultFilters,
      query: "Carlos Diaz",
    });

    expect(byRequester.map((ticket) => ticket.id)).toEqual([2]);
    expect(byTechnician.map((ticket) => ticket.id)).toEqual([3]);
  });
});
