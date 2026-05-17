import { act, fireEvent, render, screen } from "@testing-library/react";
import Login from "../Login";

describe("Login", () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    mockOnLogin.mockReset();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test("renderiza campos de login", () => {
    render(<Login message="" onLogin={mockOnLogin} />);

    expect(screen.getByPlaceholderText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contrasena/i)).toBeInTheDocument();
  });

  test("muestra mensaje de sesion", () => {
    render(<Login message="Sesion cerrada correctamente." onLogin={mockOnLogin} />);

    expect(screen.getByText(/sesion cerrada/i)).toBeInTheDocument();
  });

  test("llama onLogin con formulario completo", async () => {
    mockOnLogin.mockReturnValue({ ok: true });
    render(<Login message="" onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText(/contrasena/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    expect(screen.getByRole("button", { name: /cargando/i })).toBeDisabled();

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(mockOnLogin).toHaveBeenCalledWith({ identifier: "admin", password: "1234" });
  });

  test("no envia si hay campos vacios", () => {
    render(<Login message="" onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    expect(mockOnLogin).not.toHaveBeenCalled();
    expect(screen.getByText(/completa usuario/i)).toBeInTheDocument();
  });

  test("muestra error devuelto por onLogin", async () => {
    mockOnLogin.mockReturnValue({ ok: false, message: "Credenciales incorrectas." });
    render(<Login message="" onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText(/contrasena/i), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText(/credenciales incorrectas/i)).toBeInTheDocument();
  });
});
