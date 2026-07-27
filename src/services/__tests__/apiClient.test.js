import {
  AUTH_EXPIRED_EVENT,
  apiRequest,
} from "../apiClient";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  shouldRefreshAccessToken,
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
    blob: jest.fn(),
  };
}

describe("apiClient", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    clearAccessToken();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    clearAccessToken();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("envía Bearer, convierte el body y conserva el envelope", async () => {
    setAccessToken("access-local", "2099-01-01T00:00:00Z");
    fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          id: 4,
          first_name: "Ada",
          role: "ADMINISTRATOR",
        },
        201,
      ),
    );

    const result = await apiRequest("users/", {
      body: {
        firstName: "Ada",
        role: "ADMINISTRADOR",
      },
      method: "POST",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        id: 4,
        firstName: "Ada",
        role: "ADMINISTRADOR",
      },
      message: "",
      status: 201,
      error: null,
    });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("http://127.0.0.1:8000/api/v1/users/");
    expect(options.credentials).toBe("include");
    expect(options.headers.get("Authorization")).toBe(
      "Bearer access-local",
    );
    expect(JSON.parse(options.body)).toEqual({
      first_name: "Ada",
      role: "ADMINISTRATOR",
    });
  });

  test("normaliza 400 y fields a camelCase", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "No se pudo procesar la solicitud.",
          fields: {
            due_date: ["Fecha inválida."],
          },
        },
        400,
      ),
    );

    const result = await apiRequest("tickets/", {
      auth: false,
      body: {},
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        data: null,
        message: "No se pudo procesar la solicitud.",
        status: 400,
        error: expect.objectContaining({
          fields: {
            dueDate: ["Fecha inválida."],
          },
          type: "api",
        }),
      }),
    );
  });

  test("mantiene 403 sin intentar renovar la sesión", async () => {
    setAccessToken("access-local", "2099-01-01T00:00:00Z");
    fetch.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "Solo un administrador puede realizar esta operación.",
          fields: {},
        },
        403,
      ),
    );

    const result = await apiRequest("users/");

    expect(result.status).toBe(403);
    expect(result.ok).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe("access-local");
  });

  test("renueva una vez tras 401 y reintenta con el token nuevo", async () => {
    setAccessToken("access-viejo", "2099-01-01T00:00:00Z");
    fetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "La sesión expiró.",
            fields: {},
          },
          401,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          message: "Sesión renovada.",
          access: "access-nuevo",
          access_expires_at: "2099-01-01T01:00:00Z",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          total_tickets: 8,
        }),
      );

    const result = await apiRequest("analytics/summary/");

    expect(result.ok).toBe(true);
    expect(result.data.totalTickets).toBe(8);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][0]).toContain("/auth/refresh/");
    expect(
      fetch.mock.calls[2][1].headers.get("Authorization"),
    ).toBe("Bearer access-nuevo");
    expect(getAccessToken()).toBe("access-nuevo");
  });

  test("limpia sesión y emite evento si refresh falla", async () => {
    setAccessToken("access-viejo", "2099-01-01T00:00:00Z");
    const expiredListener = jest.fn();
    window.addEventListener(AUTH_EXPIRED_EVENT, expiredListener);
    fetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Token inválido.",
            fields: {},
          },
          401,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Sesión inválida.",
            fields: {},
          },
          401,
        ),
      );

    const result = await apiRequest("tickets/");

    expect(result.status).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(expiredListener).toHaveBeenCalledTimes(1);
    window.removeEventListener(AUTH_EXPIRED_EVENT, expiredListener);
  });

  test("devuelve error uniforme de red", async () => {
    fetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const result = await apiRequest("departments/", {
      auth: false,
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        data: null,
        message: "No se pudo conectar con DayFlow.",
        status: 0,
        error: expect.objectContaining({
          type: "network",
          fields: {},
        }),
      }),
    );
  });

  test("envía FormData sin fijar Content-Type", async () => {
    const file = new File(["contenido"], "evidencia.txt", {
      type: "text/plain",
    });
    const formData = new FormData();
    formData.append("file", file);
    fetch.mockResolvedValueOnce(jsonResponse({ id: 7 }, 201));

    const result = await apiRequest("tickets/3/attachments/", {
      auth: false,
      body: formData,
      method: "POST",
    });

    const options = fetch.mock.calls[0][1];
    expect(result.status).toBe(201);
    expect(options.body).toBe(formData);
    expect(options.headers.has("Content-Type")).toBe(false);
  });

  test("mantiene el token solo en memoria y detecta renovación", () => {
    setAccessToken("access-local", "2026-07-27T12:00:00Z");

    expect(getAccessToken()).toBe("access-local");
    expect(window.sessionStorage.getItem("dayflow-access-token")).toBeNull();
    expect(
      shouldRefreshAccessToken(
        new Date("2026-07-27T11:59:40Z").getTime(),
      ),
    ).toBe(true);

    clearAccessToken();
    expect(getAccessToken()).toBeNull();
    expect(window.sessionStorage.getItem("dayflow-access-token")).toBeNull();
  });
});
