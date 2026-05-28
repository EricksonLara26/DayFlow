import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { initialUsers } from "./mocks";
import { sanitizeAuthenticatedUser } from "./services/authService";

jest.mock("./utils/xlsxExporter", () => ({
  downloadXlsx: jest.fn(),
}));

function setStoredUser(username) {
  const user = initialUsers.find((currentUser) => currentUser.username === username);
  window.localStorage.setItem("dayflow-auth-user", JSON.stringify(sanitizeAuthenticatedUser(user)));
}

async function flushLoading() {
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("App critical flows", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-23T12:00:00.000Z"));
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  test("login sigue funcionando", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    expect(screen.getByRole("heading", { name: /estado operativo/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
  });

  test("crear ticket incluye dueDate y abre detalle con ID real", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "usuario" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /crear solicitud/i }));
    expect(window.location.pathname).toBe("/tickets/new");

    fireEvent.change(screen.getByLabelText(/t.*tulo/i), { target: { value: "Ticket con fecha" } });
    fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
      target: { value: "Validar fecha limite obligatoria" },
    });
    fireEvent.change(screen.getByLabelText(/fecha/i), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar solicitud/i }));

    await flushLoading();

    expect(window.location.pathname).toMatch(/^\/tickets\/\d+$/);
    expect(screen.getByText("Ticket con fecha")).toBeInTheDocument();
    expect(screen.getAllByText(/fecha/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sin fecha/i)).not.toBeInTheDocument();
  });

  test("cambio de contrasena bloquea contrasena actual incorrecta", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /abrir mi perfil/i }));
    fireEvent.change(screen.getByLabelText(/actual/i), { target: { value: "incorrecta" } });
    fireEvent.change(screen.getByLabelText(/nueva/i), { target: { value: "abcd" } });
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: "abcd" } });
    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }));

    await flushLoading();

    expect(screen.getByText(/actual no coincide/i)).toBeInTheDocument();
    expect(screen.queryByText(/actualizada correctamente/i)).not.toBeInTheDocument();
  });

  test("administrador asigna contrasena temporal y usuario debe cambiarla", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /gesti.*usuarios/i }));
    fireEvent.click(screen.getByRole("button", { name: /temporal de Laura Mendez/i }));
    fireEvent.change(screen.getByLabelText(/^Contraseña temporal$/i), {
      target: { value: "Temporal9" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña temporal/i), {
      target: { value: "Temporal9" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar temporal/i }));

    await flushAsync();

    expect(screen.getByText(/temporal asignada correctamente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesi/i }));
    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "lmendez" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "Temporal9" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    expect(window.location.pathname).toBe("/settings");
    expect(screen.getByText(/debes cambiar tu contraseña/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/actual/i), { target: { value: "Temporal9" } });
    fireEvent.change(screen.getByLabelText(/nueva/i), { target: { value: "ClaveNueva9" } });
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: "ClaveNueva9" } });
    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }));

    await flushLoading();

    expect(screen.getByText(/actualizada correctamente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^inicio$/i }));
    expect(window.location.pathname).toBe("/dashboard");
  });

  test("ruta de detalle con ID real funciona al refrescar", () => {
    setStoredUser("administrador");
    window.history.pushState({}, "", "/tickets/1001");

    render(<App />);

    expect(screen.getByText(/ticket #1001/i)).toBeInTheDocument();
    expect(screen.getByText(/laptop no enciende/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/tickets/1001");
  });

  test("ticket inexistente muestra pantalla de no encontrado", () => {
    setStoredUser("administrador");
    window.history.pushState({}, "", "/tickets/999999");

    render(<App />);

    expect(screen.getByText(/ticket no encontrado/i)).toBeInTheDocument();
  });

  test("ruta protegida por rol muestra acceso denegado", async () => {
    setStoredUser("usuario");
    window.history.pushState({}, "", "/users");

    render(<App />);

    expect(await screen.findByText(/no tienes permisos/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/access-denied");
  });

  test("usuario no puede abrir tickets de otro usuario", () => {
    setStoredUser("usuario");
    window.history.pushState({}, "", "/tickets/1002");

    render(<App />);

    expect(screen.getByText(/no tienes permisos/i)).toBeInTheDocument();
    expect(screen.queryByText(/vpn corporativa/i)).not.toBeInTheDocument();
  });
});
