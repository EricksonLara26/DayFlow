import { TICKET_STATUSES } from "../../data/tickets";
import {
  getDashboardSummary,
  getDemandByDepartmentData,
  getDueTicketsSnapshot,
  getHistoricalData,
  getTechnicianRankingData,
  getTicketsByCategoryData,
} from "../dashboardService";

describe("dashboardService", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-04T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("genera resumen con contrato preparado para backend", () => {
    const tickets = [
      { status: TICKET_STATUSES.OPEN, dueDate: "2026-06-01" },
      { status: TICKET_STATUSES.IN_PROGRESS, dueDate: "2026-06-06" },
      { status: TICKET_STATUSES.ON_HOLD, dueDate: "2026-06-02" },
      { status: TICKET_STATUSES.COMPLETED, dueDate: "2026-06-01" },
      { status: TICKET_STATUSES.DISMISSED, dueDate: "2026-06-01" },
    ];

    expect(getDashboardSummary(tickets)).toEqual({
      totalTickets: 5,
      openTickets: 1,
      inProgressTickets: 1,
      onHoldTickets: 1,
      completedTickets: 1,
      dismissedTickets: 1,
      overdueTickets: 2,
    });
  });

  test("ranking tecnico cuenta solo tickets completados", () => {
    const technicians = [
      { id: 1, firstName: "Ana", lastName: "Rojas" },
      { id: 2, firstName: "Carlos", lastName: "Diaz" },
    ];
    const tickets = [
      {
        assignedTo: 1,
        status: TICKET_STATUSES.COMPLETED,
        createdAt: "2026-06-01T10:00:00.000Z",
        closedAt: "2026-06-01T11:00:00.000Z",
      },
      {
        assignedTo: 1,
        status: TICKET_STATUSES.COMPLETED,
        createdAt: "2026-06-02T10:00:00.000Z",
        closedAt: "2026-06-02T12:00:00.000Z",
      },
      { assignedTo: 1, status: TICKET_STATUSES.DISMISSED },
      { assignedTo: 2, status: TICKET_STATUSES.IN_PROGRESS },
      {
        assignedTo: 2,
        status: TICKET_STATUSES.COMPLETED,
        createdAt: "2026-06-03T10:00:00.000Z",
        closedAt: "2026-06-03T11:30:00.000Z",
      },
    ];

    expect(getTechnicianRankingData(technicians, tickets)).toEqual([
      {
        technicianId: 1,
        technicianName: "Ana Rojas",
        completedTickets: 2,
        averageResolutionTime: 90,
      },
      {
        technicianId: 2,
        technicianName: "Carlos Diaz",
        completedTickets: 1,
        averageResolutionTime: 90,
      },
    ]);
  });

  test("agrupa tickets por categoria excluyendo desestimados", () => {
    const tickets = [
      { category: "Hardware", status: TICKET_STATUSES.OPEN },
      { category: "Hardware", status: TICKET_STATUSES.COMPLETED },
      { category: "Software", status: TICKET_STATUSES.COMPLETED },
      { category: "Software", status: TICKET_STATUSES.DISMISSED },
    ];
    const categories = [
      { id: 1, name: "Hardware" },
      { id: 2, name: "Software" },
    ];

    expect(getTicketsByCategoryData(tickets, categories)).toEqual([
      { categoryId: 1, categoryName: "Hardware", total: 2 },
      { categoryId: 2, categoryName: "Software", total: 1 },
    ]);
  });

  test("agrupa demanda por departamento excluyendo desestimados", () => {
    const users = [
      { id: 10, department: "Administracion" },
      { id: 11, department: "Ventas" },
    ];
    const departments = [
      { id: 3, name: "Administracion" },
      { id: 5, name: "Ventas" },
    ];
    const tickets = [
      { createdBy: 10, status: TICKET_STATUSES.OPEN },
      { createdBy: 10, department: "Ventas", status: TICKET_STATUSES.COMPLETED },
      { createdBy: 11, status: TICKET_STATUSES.DISMISSED },
    ];

    expect(getDemandByDepartmentData(tickets, users, departments)).toEqual([
      { departmentId: 3, departmentName: "Administracion", total: 1 },
      { departmentId: 5, departmentName: "Ventas", total: 1 },
    ]);
  });

  test("devuelve vencimientos con contrato de API", () => {
    const tickets = [
      {
        id: 1,
        title: "Ticket manana",
        dueDate: "2026-06-05",
        status: TICKET_STATUSES.OPEN,
        priority: "HIGH",
      },
      {
        id: 2,
        title: "Ticket cerrado",
        dueDate: "2026-06-05",
        status: TICKET_STATUSES.COMPLETED,
        priority: "LOW",
      },
    ];

    expect(getDueTicketsSnapshot({ tickets })).toEqual([
      {
        ticketId: 1,
        title: "Ticket manana",
        dueDate: "2026-06-05",
        status: TICKET_STATUSES.OPEN,
        priority: "HIGH",
      },
    ]);
  });

  test("genera historico por periodo", () => {
    const tickets = [
      {
        createdAt: "2026-05-01T10:00:00.000Z",
        closedAt: "2026-05-02T10:00:00.000Z",
        status: TICKET_STATUSES.COMPLETED,
      },
      {
        createdAt: "2026-05-03T10:00:00.000Z",
        closedAt: "2026-06-01T10:00:00.000Z",
        status: TICKET_STATUSES.DISMISSED,
      },
    ];

    expect(getHistoricalData(tickets)).toEqual([
      { period: "2026-05", created: 2, completed: 1, dismissed: 0 },
      { period: "2026-06", created: 0, completed: 0, dismissed: 1 },
    ]);
  });
});
