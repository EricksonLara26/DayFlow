import { act, fireEvent, render, screen } from "@testing-library/react";
import TicketForm from "../TicketForm";
import { ROLES } from "../../../data/users";

describe("TicketForm", () => {
  const mockOnSubmit = jest.fn();
  const currentUser = {
    id: 2,
    firstName: "Tech",
    lastName: "User",
    role: ROLES.TECHNICIAN,
    active: true,
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-23T12:00:00.000Z"));
    mockOnSubmit.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renderiza formulario", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    expect(screen.getByPlaceholderText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha límite/i)).toBeInTheDocument();
  });

  test("valida campos requeridos", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/completa título y descripción/i)).toBeInTheDocument();
  });

  test("requiere fecha límite válida", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Test Ticket" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Test description" } });
    fireEvent.change(screen.getByLabelText(/fecha límite/i), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/fecha límite válida/i)).toBeInTheDocument();
  });

  test("envia datos validos y muestra loading", async () => {
    mockOnSubmit.mockReturnValue({ ok: true });
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Test Ticket" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Test description" } });
    fireEvent.change(screen.getByLabelText(/fecha límite/i), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(screen.getByRole("button", { name: /cargando/i })).toBeDisabled();
    expect(screen.getByLabelText(/título/i)).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Test description",
        dueDate: "2026-06-01",
        requester: currentUser,
        title: "Test Ticket",
      }),
    );
  });

  test("soporta alias onCreateTicket y users", async () => {
    mockOnSubmit.mockReturnValue({ ok: true });
    render(<TicketForm currentUser={currentUser} onCreateTicket={mockOnSubmit} users={[currentUser]} />);

    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Alias Ticket" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Alias description" } });
    fireEvent.change(screen.getByLabelText(/fecha límite/i), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });
});
