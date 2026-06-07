import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { initialUsers } from "./mocks";
import { sanitizeAuthenticatedUser } from "./services/authService";
import { TICKET_PRIORITIES } from "./data/tickets";

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

function fillEmployeeTicketForm() {
  fireEvent.change(screen.getByLabelText(/t.*tulo/i), { target: { value: "Ticket con fecha" } });
  fireEvent.change(screen.getByPlaceholderText(/describe el problema/i), {
    target: { value: "Validar fecha limite opcional con datos completos" },
  });
  fireEvent.change(screen.getByLabelText(/categor/i), { target: { value: "Hardware" } });
  fireEvent.change(screen.getByLabelText(/prioridad/i), { target: { value: TICKET_PRIORITIES.HIGH } });
  fireEvent.click(screen.getByLabelText(/agregar fecha/i));
  fireEvent.change(screen.getByLabelText(/^fecha/i), { target: { value: "2026-06-01" } });
}

describe("App critical flows", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-23T12:00:00.000Z"));
    jest.spyOn(window, "confirm").mockReturnValue(true);
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
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

  test("crear ticket incluye datos completos y se mantiene al refrescar detalle", async () => {
    const { unmount } = render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "usuario" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /crear solicitud/i }));
    expect(window.location.pathname).toBe("/tickets/new");

    fillEmployeeTicketForm();
    fireEvent.click(screen.getByRole("button", { name: /enviar solicitud/i }));

    await flushLoading();

    expect(window.location.pathname).toMatch(/^\/tickets\/\d+$/);
    const detailPath = window.location.pathname;

    expect(screen.getByText("Ticket con fecha")).toBeInTheDocument();
    expect(screen.getByText(/ticket creado correctamente/i)).toBeInTheDocument();
    expect(screen.getByText(/Hardware/i)).toBeInTheDocument();
    expect(screen.getByText(/Administracion/i)).toBeInTheDocument();
    expect(screen.getAllByText(/fecha/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sin fecha/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/acciones t/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tomar ticket/i })).not.toBeInTheDocument();

    unmount();
    render(<App />);

    expect(window.location.pathname).toBe(detailPath);
    expect(screen.getByText("Ticket con fecha")).toBeInTheDocument();
    expect(screen.getByText(/Hardware/i)).toBeInTheDocument();
  });

  test("empleado no ve funciones administrativas ni tecnicas", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "usuario" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    expect(screen.getByRole("button", { name: /crear solicitud/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /gesti.*usuarios/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /panel de informaci/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/exportaci/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tomar ticket/i })).not.toBeInTheDocument();
  });

  test("empleado ve error en filtros con rango de fechas invalido", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "usuario" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /^mis solicitudes$/i }));
    fireEvent.change(screen.getByLabelText(/^desde$/i), { target: { value: "2026-06-02" } });
    fireEvent.change(screen.getByLabelText(/^hasta$/i), { target: { value: "2026-06-01" } });

    expect(screen.getByText(/fecha desde no puede/i)).toBeInTheDocument();
    expect(screen.getByText(/fecha hasta no puede/i)).toBeInTheDocument();
  });

  test("crear usuario incompleto muestra validaciones por campo", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /gesti.*usuarios/i }));
    fireEvent.click(screen.getByRole("button", { name: /agregar usuario/i }));
    fireEvent.click(screen.getByRole("button", { name: /^crear usuario$/i }));

    expect(screen.getByText(/el nombre es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/el correo es obligatorio/i)).toBeInTheDocument();
    expect(screen.getByText(/la contrase.*obligatoria/i)).toBeInTheDocument();
    expect(screen.getByText(/el departamento es obligatorio/i)).toBeInTheDocument();
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

  test("usuario no autenticado es redirigido al login desde una ruta protegida", async () => {
    window.history.pushState({}, "", "/tickets/1001");

    render(<App />);

    expect(await screen.findByRole("button", { name: /iniciar/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByText(/ticket #1001/i)).not.toBeInTheDocument();
  });

  test("tecnico entra a solicitudes disponibles pero no a gestion de usuarios", async () => {
    setStoredUser("tecnico");
    window.history.pushState({}, "", "/tickets/available");

    render(<App />);

    expect(screen.getByRole("heading", { name: /tickets abiertos sin asignar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /gesti.*usuarios/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe("/tickets/available");
  });

  test("cambio de contrasena correcto permite iniciar sesion con la nueva clave", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /abrir mi perfil/i }));
    fireEvent.change(screen.getByLabelText(/actual/i), { target: { value: "1234" } });
    fireEvent.change(screen.getByLabelText(/nueva/i), { target: { value: "NuevaClave9" } });
    fireEvent.change(screen.getByLabelText(/confirmar/i), { target: { value: "NuevaClave9" } });
    fireEvent.click(screen.getByRole("button", { name: /actualizar/i }));

    await flushLoading();

    expect(screen.getByText(/actualizada correctamente/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /cerrar sesi/i }));
    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contrase/i), { target: { value: "NuevaClave9" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    expect(screen.getByRole("heading", { name: /estado operativo/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/dashboard");
  });
});
