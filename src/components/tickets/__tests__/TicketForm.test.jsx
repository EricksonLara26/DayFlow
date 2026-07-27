import { act, fireEvent, render, screen } from "@testing-library/react";
import TicketForm from "../TicketForm";
import { ROLES } from "../../../data/users";
import { TICKET_PRIORITIES } from "../../../data/tickets";

jest.mock("../../../hooks/useCatalogOptions", () => ({
  useCategoryOptions: () => ({
    error: "",
    loading: false,
    names: ["Hardware", "Software"],
    refresh: jest.fn(),
  }),
  useDepartmentOptions: () => ({
    error: "",
    loading: false,
    names: ["Tecnologia", "Administracion"],
    refresh: jest.fn(),
  }),
}));

describe("TicketForm", () => {
  const mockOnSubmit = jest.fn();
  const currentUser = {
    id: 2,
    firstName: "Tech",
    lastName: "User",
    role: ROLES.TECHNICIAN,
    department: "Tecnologia",
    active: true,
  };

  function fillRequiredFields() {
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Test Ticket" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Test description" } });
    fireEvent.change(screen.getByLabelText(/categoría/i), { target: { value: "Hardware" } });
    fireEvent.change(screen.getByLabelText(/prioridad/i), { target: { value: TICKET_PRIORITIES.HIGH } });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-23T12:00:00.000Z"));
    mockOnSubmit.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renderiza formulario completo", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    expect(screen.getByPlaceholderText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/prioridad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByText(/evidencia o adjunto/i)).toBeInTheDocument();
  });

  test("valida campos requeridos por campo", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/el título es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/la descripción es obligatoria/i)).toBeInTheDocument();
    expect(screen.getByText(/la categoría es obligatoria/i)).toBeInTheDocument();
    expect(screen.getByText(/la prioridad es obligatoria/i)).toBeInTheDocument();
  });

  test("requiere fecha límite válida cuando se activa", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fillRequiredFields();
    fireEvent.click(screen.getByLabelText(/agregar fecha límite/i));
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/fecha límite válida/i)).toBeInTheDocument();
  });

  test("envia datos validos y muestra loading", async () => {
    mockOnSubmit.mockReturnValue({ ok: true });
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fillRequiredFields();
    fireEvent.click(screen.getByLabelText(/agregar fecha límite/i));
    fireEvent.change(screen.getByLabelText(/^fecha límite$/i), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    expect(screen.getByRole("button", { name: /cargando/i })).toBeDisabled();
    expect(screen.getByLabelText(/título/i)).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "Hardware",
        department: "Tecnologia",
        description: "Test description",
        dueDate: "2026-06-01",
        priority: TICKET_PRIORITIES.HIGH,
        requester: currentUser,
        title: "Test Ticket",
      }),
    );
  });

  test("soporta alias onCreateTicket y users con fecha límite opcional", async () => {
    mockOnSubmit.mockReturnValue({ ok: true });
    render(<TicketForm currentUser={currentUser} onCreateTicket={mockOnSubmit} users={[currentUser]} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: "",
        requester: currentUser,
      }),
    );
  });
});
