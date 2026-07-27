import {
  changePassword,
  clearAuthenticationSession,
  getCurrentUser,
  getStoredAuthenticatedUser,
  login,
  logout,
  refreshSession,
  restoreSession,
  storeAuthenticatedUser,
} from "../authService";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "../tokenStorage";

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name) =>
        name.toLowerCase() === "content-type"
          ? "application/json"
          : null,
    },
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(""),
  };
}

function backendUser(overrides = {}) {
  return {
    id: 7,
    username: "tecnico",
    email: "tecnico@example.test",
    first_name: "Tania",
    last_name: "Técnica",
    role: "TECHNICIAN",
    department: 3,
    department_name: "Tecnología",
    position: "Soporte",
    is_active: true,
    must_change_password: false,
    ...overrides,
  };
}

function authPayload(overrides = {}) {
  return {
    message: "Sesión iniciada correctamente.",
    token_type: "Bearer",
    access: "access-api",
    access_expires_at: "2099-01-01T00:00:00Z",
    user: backendUser(),
    ...overrides,
  };
}

describe("authService API integration", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    clearAccessToken();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    clearAuthenticationSession();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("login usa la API, guarda access y no persiste password", async () => {
    fetch.mockResolvedValueOnce(jsonResponse(authPayload()));

    const result = await login({
      identifier: "tecnico@example.test",
      password: "ClaveSegura9",
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        status: 200,
        user: expect.objectContaining({
          username: "tecnico",
          role: "TECNICO",
          mustChangePassword: false,
        }),
      }),
    );
    expect(getAccessToken()).toBe("access-api");
    expect(getStoredAuthenticatedUser()).not.toHaveProperty("password");

    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain("/api/v1/auth/login/");
    expect(JSON.parse(options.body)).toEqual({
      identifier: "tecnico@example.test",
      password: "ClaveSegura9",
    });
  });

  test("login inválido limpia cualquier sesión anterior", async () => {
    storeAuthenticatedUser(backendUser());
    setAccessToken("access-anterior", "2099-01-01T00:00:00Z");
    fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "No fue posible iniciar sesión con las credenciales proporcionadas.",
          fields: {},
        },
        401,
      ),
    );

    const result = await login({
      identifier: "desconocido",
      password: "incorrecta",
    });

    expect(result.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(getStoredAuthenticatedUser()).toBeNull();
  });

  test("restaura con refresh HttpOnly cuando falta access token", async () => {
    storeAuthenticatedUser(backendUser());
    fetch.mockResolvedValueOnce(
      jsonResponse(
        authPayload({
          message: "Sesión renovada correctamente.",
          access: "access-restaurado",
          user: backendUser({ must_change_password: true }),
        }),
      ),
    );

    const result = await restoreSession();

    expect(result.ok).toBe(true);
    expect(result.user.mustChangePassword).toBe(true);
    expect(getAccessToken()).toBe("access-restaurado");
    expect(fetch.mock.calls[0][0]).toContain("/auth/refresh/");
  });

  test("restaura con current user cuando ya existe access token", async () => {
    storeAuthenticatedUser(backendUser());
    setAccessToken("access-vigente", "2099-01-01T00:00:00Z");
    fetch.mockResolvedValueOnce(
      jsonResponse({
        user: backendUser({ first_name: "Tatiana" }),
      }),
    );

    const result = await restoreSession();

    expect(result.ok).toBe(true);
    expect(result.user.firstName).toBe("Tatiana");
    expect(fetch.mock.calls[0][0]).toContain("/auth/me/");
  });

  test("sin datos locales no inventa una sesión ni llama la red", async () => {
    const result = await restoreSession();

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        data: null,
        status: 204,
      }),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  test("refresh inválido limpia usuario y access token", async () => {
    storeAuthenticatedUser(backendUser());
    setAccessToken("access-viejo", "2099-01-01T00:00:00Z");
    fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "La sesión no es válida o ha expirado.",
          fields: {},
        },
        401,
      ),
    );

    const result = await refreshSession();

    expect(result.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(getStoredAuthenticatedUser()).toBeNull();
  });

  test("current user actualiza el usuario almacenado", async () => {
    setAccessToken("access-vigente", "2099-01-01T00:00:00Z");
    fetch.mockResolvedValueOnce(
      jsonResponse({
        user: backendUser({ position: "Soporte senior" }),
      }),
    );

    const result = await getCurrentUser();

    expect(result.ok).toBe(true);
    expect(result.data.position).toBe("Soporte senior");
    expect(getStoredAuthenticatedUser().position).toBe("Soporte senior");
  });

  test("change password conserva firma y actualiza mustChangePassword", async () => {
    setAccessToken("access-temporal", "2099-01-01T00:00:00Z");
    storeAuthenticatedUser(
      backendUser({ must_change_password: true }),
    );
    fetch.mockResolvedValueOnce(
      jsonResponse(
        authPayload({
          message: "Contraseña actualizada correctamente.",
          access: "access-nuevo",
          user: backendUser({ must_change_password: false }),
        }),
      ),
    );

    const result = await changePassword(
      7,
      "Temporal9",
      "NuevaClave9",
      "NuevaClave9",
    );

    expect(result.ok).toBe(true);
    expect(result.data.mustChangePassword).toBe(false);
    expect(getStoredAuthenticatedUser().mustChangePassword).toBe(false);
    expect(getAccessToken()).toBe("access-nuevo");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      current_password: "Temporal9",
      new_password: "NuevaClave9",
      confirm_password: "NuevaClave9",
    });
  });

  test("logout limpia localmente incluso con error de red", async () => {
    storeAuthenticatedUser(backendUser());
    setAccessToken("access-vigente", "2099-01-01T00:00:00Z");
    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await logout();

    expect(result.ok).toBe(false);
    expect(result.error.type).toBe("network");
    expect(getAccessToken()).toBeNull();
    expect(getStoredAuthenticatedUser()).toBeNull();
  });

  test("expiración definitiva durante current user limpia la sesión", async () => {
    storeAuthenticatedUser(backendUser());
    setAccessToken("access-expirado", "2099-01-01T00:00:00Z");
    fetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Access expirado.",
            fields: {},
          },
          401,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Refresh expirado.",
            fields: {},
          },
          401,
        ),
      );

    const result = await getCurrentUser();

    expect(result.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(getStoredAuthenticatedUser()).toBeNull();
  });
});
