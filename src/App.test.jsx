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

describe("App critical flows", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-23T12:00:00.000Z"));
    window.localStorage.clear();
    window.location.hash = "";
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    window.localStorage.clear();
    window.location.hash = "";
  });

  test("login sigue funcionando", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    expect(screen.getByRole("heading", { name: /estado operativo/i })).toBeInTheDocument();
  });

  test("crear ticket incluye dueDate y abre detalle con ID real", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "empleado" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /crear solicitud/i }));
    fireEvent.change(screen.getByLabelText(/título/i), { target: { value: "Ticket con fecha" } });
    fireEvent.change(screen.getByLabelText(/descripción/i), { target: { value: "Validar fecha límite obligatoria" } });
    fireEvent.change(screen.getByLabelText(/fecha límite/i), { target: { value: "2026-06-01" } });
    fireEvent.click(screen.getByRole("button", { name: /guardar solicitud/i }));

    await flushLoading();

    expect(window.location.hash).toMatch(/^#\/detalle-solicitud\/\d+$/);
    expect(screen.getByText("Ticket con fecha")).toBeInTheDocument();
    expect(screen.getAllByText(/fecha límite/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sin fecha/i)).not.toBeInTheDocument();
  });

  test("cambio de contraseña bloquea contraseña actual incorrecta", async () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/usuario/i), { target: { value: "administrador" } });
    fireEvent.change(screen.getByPlaceholderText(/contraseña/i), { target: { value: "1234" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar/i }));

    await flushLoading();

    fireEvent.click(screen.getByRole("button", { name: /abrir mi perfil/i }));
    fireEvent.change(screen.getByLabelText(/contraseña actual/i), { target: { value: "incorrecta" } });
    fireEvent.change(screen.getByLabelText(/nueva contraseña/i), { target: { value: "abcd" } });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), { target: { value: "abcd" } });
    fireEvent.click(screen.getByRole("button", { name: /actualizar contraseña/i }));

    await flushLoading();

    expect(screen.getByText(/la contraseña actual no coincide/i)).toBeInTheDocument();
    expect(screen.queryByText(/contraseña actualizada correctamente/i)).not.toBeInTheDocument();
  });

  test("ruta de detalle con ID real funciona al refrescar", () => {
    setStoredUser("administrador");
    window.location.hash = "#/detalle-solicitud/1001";

    render(<App />);

    expect(screen.getByText(/ticket #1001/i)).toBeInTheDocument();
    expect(screen.getByText(/laptop no enciende/i)).toBeInTheDocument();
    expect(window.location.hash).toBe("#/detalle-solicitud/1001");
  });
});
