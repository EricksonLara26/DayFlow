import {
  clearUsersCache,
  createUser,
  deleteUser,
  getUserById,
  getUsers,
  getUsersSnapshot,
  resetPassword,
  updateUser,
} from "../userService";
import { clearDepartmentsCache } from "../departmentService";
import {
  clearAccessToken,
  setAccessToken,
} from "../tokenStorage";
import { ROLES } from "../../data/users";

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => "application/json",
    },
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(""),
  };
}

function backendUser(overrides = {}) {
  return {
    id: 8,
    username: "mlopez",
    email: "mlopez@example.test",
    first_name: "María",
    last_name: "López",
    position: "Analista",
    department: 3,
    department_name: "Operaciones",
    role: "EMPLOYEE",
    is_active: true,
    must_change_password: false,
    ...overrides,
  };
}

function departmentList() {
  return {
    count: 1,
    next: null,
    previous: null,
    results: [
      {
        id: 3,
        name: "Operaciones",
        description: "Operación diaria",
        active: true,
      },
    ],
  };
}

describe("userService API", () => {
  beforeEach(() => {
    clearUsersCache();
    clearDepartmentsCache();
    clearAccessToken();
    window.sessionStorage.clear();
    setAccessToken("access-users", "2099-01-01T00:00:00Z");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    clearUsersCache();
    clearDepartmentsCache();
    clearAccessToken();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("lista con filtros reales, despagina y conserva camelCase", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [backendUser()],
      }),
    );

    const result = await getUsers({
      query: "maría",
      role: ROLES.EMPLOYEE,
      department: 3,
      active: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        pagination: {
          count: 1,
          next: null,
          previous: null,
        },
        data: [
          expect.objectContaining({
            firstName: "María",
            department: "Operaciones",
            departmentId: 3,
            role: ROLES.EMPLOYEE,
            active: true,
          }),
        ],
      }),
    );
    expect(result.data[0]).not.toHaveProperty("password");

    const requestUrl = new URL(fetch.mock.calls[0][0]);
    expect(requestUrl.searchParams.get("search")).toBe("maría");
    expect(requestUrl.searchParams.get("role")).toBe("EMPLOYEE");
    expect(requestUrl.searchParams.get("department")).toBe("3");
    expect(requestUrl.searchParams.get("is_active")).toBe("true");
    expect(requestUrl.searchParams.get("page_size")).toBe("100");
    expect(getUsersSnapshot()).toHaveLength(1);
  });

  test("consulta detalle y conserva el error uniforme 404", async () => {
    fetch
      .mockResolvedValueOnce(
        jsonResponse({ message: "Usuario no encontrado.", fields: {} }, 404),
      )
      .mockResolvedValueOnce(jsonResponse(backendUser()));

    const missing = await getUserById(999);
    const found = await getUserById(8);

    expect(missing).toEqual(
      expect.objectContaining({
        ok: false,
        status: 404,
        message: "Usuario no encontrado.",
      }),
    );
    expect(found.data.username).toBe("mlopez");
    expect(getUsersSnapshot()).toHaveLength(1);
  });

  test("crea usuario resolviendo nombre de departamento a ID", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse(departmentList()))
      .mockResolvedValueOnce(
        jsonResponse(
          backendUser({
            id: 9,
            username: "nuevo",
            email: "nuevo@example.test",
            must_change_password: true,
          }),
          201,
        ),
      );

    const result = await createUser({
      firstName: "Nuevo",
      lastName: "Usuario",
      username: "nuevo",
      email: "nuevo@example.test",
      password: "ClaveSegura!937",
      position: "Analista",
      department: "Operaciones",
      role: ROLES.EMPLOYEE,
    });

    expect(result.status).toBe(201);
    expect(result.data.mustChangePassword).toBe(true);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({
      first_name: "Nuevo",
      last_name: "Usuario",
      username: "nuevo",
      email: "nuevo@example.test",
      password: "ClaveSegura!937",
      position: "Analista",
      department: 3,
      role: "EMPLOYEE",
    });
  });

  test("actualiza por PATCH usando IDs canónicos", async () => {
    fetch
      .mockResolvedValueOnce(jsonResponse(departmentList()))
      .mockResolvedValueOnce(
        jsonResponse(
          backendUser({
            first_name: "Mariana",
            role: "TECHNICIAN",
          }),
        ),
      );

    const result = await updateUser(8, {
      firstName: "Mariana",
      lastName: "López",
      email: "mlopez@example.test",
      position: "Soporte",
      department: "Operaciones",
      role: ROLES.TECHNICIAN,
    });

    expect(result.data.firstName).toBe("Mariana");
    expect(result.data.role).toBe(ROLES.TECHNICIAN);
    expect(fetch.mock.calls[1][1].method).toBe("PATCH");
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual(
      expect.objectContaining({
        department: 3,
        role: "TECHNICIAN",
      }),
    );
  });

  test("desactiva mediante acción POST sin DELETE físico", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        message: "Usuario desactivado correctamente.",
        user: backendUser({ is_active: false }),
      }),
    );

    const result = await deleteUser(8);

    expect(result.data.active).toBe(false);
    expect(result.message).toBe(
      "Usuario desactivado correctamente.",
    );
    expect(fetch.mock.calls[0][0]).toContain(
      "/users/8/deactivate/",
    );
    expect(fetch.mock.calls[0][1].method).toBe("POST");
  });

  test("restablece contraseña temporal sin exponerla", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        message: "Contraseña temporal asignada correctamente.",
        user: backendUser({ must_change_password: true }),
      }),
    );

    const result = await resetPassword(
      8,
      "TemporalSegura!937",
      { mustChangePassword: true },
    );

    expect(result.data.mustChangePassword).toBe(true);
    expect(result.data).not.toHaveProperty("password");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      temporary_password: "TemporalSegura!937",
      confirm_password: "TemporalSegura!937",
    });
  });
});
