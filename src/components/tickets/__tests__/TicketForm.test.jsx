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
    mockOnSubmit.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renderiza formulario", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    expect(screen.getByPlaceholderText(/titulo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripcion/i)).toBeInTheDocument();
  });

  test("valida campos requeridos", () => {
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/completa titulo/i)).toBeInTheDocument();
  });

  test("envia datos validos y muestra loading", async () => {
    mockOnSubmit.mockReturnValue({ ok: true });
    render(<TicketForm currentUser={currentUser} onSubmit={mockOnSubmit} requesters={[currentUser]} />);

    fireEvent.change(screen.getByLabelText(/titulo/i), { target: { value: "Test Ticket" } });
    fireEvent.change(screen.getByLabelText(/descripcion/i), { target: { value: "Test description" } });
    fireEvent.change(screen.getByLabelText(/fecha limite/i), { target: { value: "2026-05-20" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    expect(screen.getByRole("button", { name: /cargando/i })).toBeDisabled();
    expect(screen.getByLabelText(/titulo/i)).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Test description",
        requester: currentUser,
        title: "Test Ticket",
      }),
    );
  });

  test("soporta alias onCreateTicket y users", async () => {
    mockOnSubmit.mockReturnValue({ ok: true });
    render(<TicketForm currentUser={currentUser} onCreateTicket={mockOnSubmit} users={[currentUser]} />);

    fireEvent.change(screen.getByLabelText(/titulo/i), { target: { value: "Alias Ticket" } });
    fireEvent.change(screen.getByLabelText(/descripcion/i), { target: { value: "Alias description" } });
    fireEvent.change(screen.getByLabelText(/fecha limite/i), { target: { value: "2026-05-21" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });
});
