import {
  initialUsers,
  mockCategories,
  mockDepartments,
} from "../mocks";
import {
  toCanonicalRole,
  toFrontendRole,
} from "../services/mappers";
import {
  clearCategoriesCache,
} from "../services/categoryService";
import {
  clearDepartmentsCache,
} from "../services/departmentService";
import {
  clearUsersCache,
} from "../services/userService";
import { clearAccessToken } from "../services/tokenStorage";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type"
          ? "application/json"
          : null;
      },
    },
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(""),
  };
}

function paginated(items) {
  return {
    count: items.length,
    next: null,
    previous: null,
    results: items,
  };
}

function findDepartmentId(user, departments) {
  return (
    user.departmentId ??
    departments.find(
      (department) => department.name === user.department,
    )?.id ??
    null
  );
}

function toBackendUser(user, departments) {
  const departmentId = findDepartmentId(user, departments);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    full_name: `${user.firstName} ${user.lastName}`.trim(),
    role: toCanonicalRole(user.role),
    role_name: user.role,
    department: departmentId,
    department_name:
      departments.find(
        (department) => department.id === departmentId,
      )?.name ??
      user.department ??
      "",
    position: user.position,
    is_active: user.active,
    must_change_password: user.mustChangePassword ?? false,
  };
}

function getStoredUserId() {
  try {
    const value = window.sessionStorage.getItem(
      "dayflow-auth-user",
    );
    return value ? JSON.parse(value).id : null;
  } catch {
    return null;
  }
}

function authenticationPayload(user, departments, message) {
  return {
    message,
    token_type: "Bearer",
    access: `test-access-${user.id}`,
    access_expires_at: "2099-01-01T00:00:00Z",
    user: toBackendUser(user, departments),
  };
}

function updateUserFromBackend(user, body, departments) {
  const department =
    departments.find(
      (item) => item.id === Number(body.department),
    )?.name ?? user.department;

  return {
    ...user,
    firstName: body.first_name ?? user.firstName,
    lastName: body.last_name ?? user.lastName,
    email: body.email ?? user.email,
    position: body.position ?? user.position,
    department,
    departmentId:
      body.department === undefined
        ? user.departmentId
        : Number(body.department),
    role:
      body.role === undefined
        ? user.role
        : toFrontendRole(body.role),
  };
}

export function installMockAuthApi() {
  let authenticatedUserId = null;
  let users = clone(initialUsers);
  let departments = clone(mockDepartments);
  let categories = clone(mockCategories);

  const fetchMock = jest.fn(async (input, options = {}) => {
    const url = new URL(String(input));
    const path = url.pathname;
    const method = options.method ?? "GET";
    const body =
      typeof options.body === "string" && options.body
        ? JSON.parse(options.body)
        : {};

    if (path.endsWith("/auth/login/")) {
      const identifier = body.identifier?.trim().toLowerCase();
      const user = users.find(
        (candidate) =>
          candidate.username.toLowerCase() === identifier ||
          candidate.email.toLowerCase() === identifier,
      );

      if (!user || user.password !== body.password || !user.active) {
        return jsonResponse(
          {
            message:
              "No fue posible iniciar sesión con las credenciales proporcionadas.",
            fields: {},
          },
          401,
        );
      }

      authenticatedUserId = user.id;
      return jsonResponse(
        authenticationPayload(
          user,
          departments,
          "Sesión iniciada correctamente.",
        ),
      );
    }

    if (path.endsWith("/auth/refresh/")) {
      authenticatedUserId ??= getStoredUserId();
      const user = users.find(
        (candidate) => candidate.id === authenticatedUserId,
      );
      if (!user) {
        return jsonResponse(
          {
            message: "La sesión no es válida o ha expirado.",
            fields: {},
          },
          401,
        );
      }

      return jsonResponse(
        authenticationPayload(
          user,
          departments,
          "Sesión renovada correctamente.",
        ),
      );
    }

    if (path.endsWith("/auth/me/")) {
      const user = users.find(
        (candidate) => candidate.id === authenticatedUserId,
      );
      return user
        ? jsonResponse({
            user: toBackendUser(user, departments),
          })
        : jsonResponse(
            {
              message: "La sesión no es válida o ha expirado.",
              fields: {},
            },
            401,
          );
    }

    if (path.endsWith("/auth/change-password/")) {
      const user = users.find(
        (candidate) => candidate.id === authenticatedUserId,
      );
      if (!user || user.password !== body.current_password) {
        return jsonResponse(
          {
            message: "La contraseña actual no coincide.",
            fields: {
              current_password: [
                "La contraseña actual no es correcta.",
              ],
            },
          },
          400,
        );
      }

      if (body.new_password !== body.confirm_password) {
        return jsonResponse(
          {
            message: "No se pudo procesar la solicitud.",
            fields: {
              confirm_password: [
                "La confirmación no coincide.",
              ],
            },
          },
          400,
        );
      }

      users = users.map((candidate) =>
        candidate.id === user.id
          ? {
              ...candidate,
              password: body.new_password,
              mustChangePassword: false,
            }
          : candidate,
      );
      const updatedUser = users.find(
        (candidate) => candidate.id === user.id,
      );
      return jsonResponse(
        authenticationPayload(
          updatedUser,
          departments,
          "Contraseña actualizada correctamente.",
        ),
      );
    }

    if (path.endsWith("/auth/logout/")) {
      authenticatedUserId = null;
      return jsonResponse({
        message: "Sesión cerrada correctamente.",
      });
    }

    const userResetMatch = path.match(
      /\/users\/(\d+)\/reset-password\/$/,
    );
    if (userResetMatch && method === "POST") {
      const userId = Number(userResetMatch[1]);
      users = users.map((user) =>
        user.id === userId
          ? {
              ...user,
              password: body.temporary_password,
              mustChangePassword: true,
            }
          : user,
      );
      const user = users.find(
        (candidate) => candidate.id === userId,
      );
      return user
        ? jsonResponse({
            message:
              "Contraseña temporal asignada correctamente.",
            user: toBackendUser(user, departments),
          })
        : jsonResponse(
            { message: "Usuario no encontrado.", fields: {} },
            404,
          );
    }

    const userDeactivateMatch = path.match(
      /\/users\/(\d+)\/deactivate\/$/,
    );
    if (userDeactivateMatch && method === "POST") {
      const userId = Number(userDeactivateMatch[1]);
      users = users.map((user) =>
        user.id === userId ? { ...user, active: false } : user,
      );
      const user = users.find(
        (candidate) => candidate.id === userId,
      );
      return user
        ? jsonResponse({
            message: "Usuario desactivado correctamente.",
            user: toBackendUser(user, departments),
          })
        : jsonResponse(
            { message: "Usuario no encontrado.", fields: {} },
            404,
          );
    }

    const userDetailMatch = path.match(/\/users\/(\d+)\/$/);
    if (userDetailMatch) {
      const userId = Number(userDetailMatch[1]);
      const userIndex = users.findIndex(
        (candidate) => candidate.id === userId,
      );
      if (userIndex === -1) {
        return jsonResponse(
          { message: "Usuario no encontrado.", fields: {} },
          404,
        );
      }

      if (method === "PATCH" || method === "PUT") {
        users[userIndex] = updateUserFromBackend(
          users[userIndex],
          body,
          departments,
        );
      }

      return jsonResponse(
        toBackendUser(users[userIndex], departments),
      );
    }

    if (path.endsWith("/users/")) {
      if (method === "POST") {
        const department = departments.find(
          (item) => item.id === Number(body.department),
        );
        const user = {
          id:
            Math.max(0, ...users.map((item) => item.id)) + 1,
          username: body.username,
          email: body.email,
          password: body.password,
          firstName: body.first_name,
          lastName: body.last_name,
          role: toFrontendRole(body.role),
          department: department?.name ?? "",
          departmentId: department?.id ?? null,
          position: body.position,
          active: true,
          mustChangePassword: true,
        };
        users = [...users, user];
        return jsonResponse(
          toBackendUser(user, departments),
          201,
        );
      }

      const search = url.searchParams
        .get("search")
        ?.toLocaleLowerCase();
      const role = url.searchParams.get("role");
      const departmentId =
        url.searchParams.get("department");
      const active = url.searchParams.get("is_active");
      const results = users.filter((user) => {
        const text =
          `${user.firstName} ${user.lastName} ${user.username} ${user.email}`
            .toLocaleLowerCase();
        return (
          (!search || text.includes(search)) &&
          (!role ||
            role === "ALL" ||
            toCanonicalRole(user.role) === role) &&
          (!departmentId ||
            departmentId === "ALL" ||
            findDepartmentId(user, departments) ===
              Number(departmentId)) &&
          (active === null ||
            active === "ALL" ||
            user.active === (active === "true"))
        );
      });
      return jsonResponse(
        paginated(
          results.map((user) =>
            toBackendUser(user, departments),
          ),
        ),
      );
    }

    const catalogMatch = path.match(
      /\/(departments|categories)(?:\/(\d+))?(?:\/(activate|deactivate))?\/$/,
    );
    if (catalogMatch) {
      const resource = catalogMatch[1];
      const itemId = catalogMatch[2]
        ? Number(catalogMatch[2])
        : null;
      const action = catalogMatch[3];
      let items =
        resource === "departments"
          ? departments
          : categories;

      if (!itemId && method === "GET") {
        const active = url.searchParams.get("active");
        const search = url.searchParams
          .get("search")
          ?.toLocaleLowerCase();
        const results = items.filter(
          (item) =>
            (!active ||
              active === "all" ||
              item.active === (active === "true")) &&
            (!search ||
              item.name.toLocaleLowerCase().includes(search)),
        );
        return jsonResponse(paginated(results));
      }

      if (!itemId && method === "POST") {
        const item = {
          id:
            Math.max(0, ...items.map((current) => current.id)) +
            1,
          name: body.name,
          description: body.description ?? null,
          active: true,
        };
        items = [...items, item];
        if (resource === "departments") {
          departments = items;
        } else {
          categories = items;
        }
        return jsonResponse(item, 201);
      }

      const itemIndex = items.findIndex(
        (item) => item.id === itemId,
      );
      if (itemIndex === -1) {
        return jsonResponse(
          { message: "Elemento no encontrado.", fields: {} },
          404,
        );
      }

      if (action && method === "POST") {
        items[itemIndex] = {
          ...items[itemIndex],
          active: action === "activate",
        };
        if (resource === "departments") {
          departments = items;
        } else {
          categories = items;
        }
        return jsonResponse({
          message:
            action === "activate"
              ? "Elemento activado correctamente."
              : "Elemento desactivado correctamente.",
          data: items[itemIndex],
        });
      }

      if (method === "PATCH" || method === "PUT") {
        items[itemIndex] = {
          ...items[itemIndex],
          ...body,
        };
        if (resource === "departments") {
          departments = items;
        } else {
          categories = items;
        }
      }

      return jsonResponse(items[itemIndex]);
    }

    return jsonResponse(
      {
        message: "No encontrado.",
        fields: {},
      },
      404,
    );
  });

  clearAccessToken();
  clearUsersCache();
  clearDepartmentsCache();
  clearCategoriesCache();
  global.fetch = fetchMock;

  return {
    fetchMock,
    cleanup() {
      clearAccessToken();
      clearUsersCache();
      clearDepartmentsCache();
      clearCategoriesCache();
      delete global.fetch;
    },
  };
}
