import {
  initialUsers,
  mockCategories,
  mockDepartments,
  initialTickets,
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
import { clearTicketsCache } from "../services/ticketService";

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

function getUserDepartmentId(user, departments) {
  return (
    user?.departmentId ??
    departments.find(
      (department) => department.name === user?.department,
    )?.id ??
    null
  );
}

function toBackendTicket(
  ticket,
  users,
  departments,
  categories,
  { detail = false } = {},
) {
  const requester = users.find(
    (user) => user.id === ticket.createdBy,
  );
  const technician = users.find(
    (user) => user.id === ticket.assignedTo,
  );
  const category = categories.find(
    (item) => item.name === ticket.category,
  );
  const departmentId =
    ticket.departmentId ??
    getUserDepartmentId(requester, departments);
  const department = departments.find(
    (item) => item.id === departmentId,
  );
  const mapped = {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    category: category?.id ?? ticket.categoryId ?? null,
    category_name: category?.name ?? ticket.category,
    status: ticket.status,
    priority: ticket.priority,
    requester: requester?.id ?? ticket.createdBy,
    requester_name:
      ticket.createdByName ??
      `${requester?.firstName ?? ""} ${requester?.lastName ?? ""}`.trim(),
    assigned_technician:
      technician?.id ?? ticket.assignedTo ?? null,
    assigned_technician_name:
      ticket.assignedToName ??
      (technician
        ? `${technician.firstName} ${technician.lastName}`.trim()
        : null),
    requester_department: departmentId,
    requester_department_name:
      department?.name ?? ticket.department ?? "",
    due_date: ticket.dueDate || null,
    taken_at: ticket.takenAt ?? null,
    closed_at: ticket.closedAt ?? null,
    created_at: ticket.createdAt,
    updated_at: ticket.updatedAt,
  };

  if (!detail) {
    return mapped;
  }

  return {
    ...mapped,
    comments: (ticket.comments ?? []).map((comment) => ({
      id: comment.id,
      author: comment.authorId,
      author_name: comment.authorName,
      author_role: toCanonicalRole(comment.role),
      author_role_name: comment.role,
      message: comment.message,
      created_at: comment.createdAt,
    })),
    attachments: (ticket.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      uploaded_by: attachment.uploadedBy ?? ticket.createdBy,
      uploaded_by_name:
        attachment.uploadedByName ?? ticket.createdByName,
      file_name: attachment.name,
      mime_type: attachment.type,
      size_bytes: attachment.size,
      description: attachment.description ?? null,
      created_at: attachment.uploadedAt,
      download_url: `/api/v1/tickets/${ticket.id}/attachments/${attachment.id}/download/`,
    })),
  };
}

function toBackendHistory(ticket) {
  return (ticket.history ?? []).map((item) => ({
    id: item.id,
    event_type: item.eventType ?? "UPDATED",
    action_code: item.actionCode ?? "UPDATED",
    action: item.action,
    actor: item.userId,
    actor_name: item.userName,
    created_at: item.createdAt,
    changes: item.changes ?? [],
  }));
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
  let tickets = clone(initialTickets);

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

    const authenticatedUser = users.find(
      (candidate) =>
        candidate.id ===
        (authenticatedUserId ?? getStoredUserId()),
    );
    const visibleTickets = () => {
      if (!authenticatedUser) {
        return [];
      }
      if (
        toCanonicalRole(authenticatedUser.role) === "EMPLOYEE"
      ) {
        return tickets.filter(
          (ticket) => ticket.createdBy === authenticatedUser.id,
        );
      }

      const scope = url.searchParams.get("scope");
      if (
        toCanonicalRole(authenticatedUser.role) === "TECHNICIAN"
      ) {
        if (scope === "available") {
          return tickets.filter(
            (ticket) =>
              ticket.status === "OPEN" && !ticket.assignedTo,
          );
        }
        if (scope === "mine") {
          return tickets.filter(
            (ticket) =>
              ticket.assignedTo === authenticatedUser.id &&
              !["COMPLETED", "DISMISSED"].includes(ticket.status),
          );
        }
        if (scope === "history") {
          return tickets.filter(
            (ticket) =>
              ticket.assignedTo === authenticatedUser.id &&
              ["COMPLETED", "DISMISSED"].includes(ticket.status),
          );
        }
      }
      return tickets;
    };

    const ticketHistoryMatch = path.match(
      /\/tickets\/(\d+)\/history\/$/,
    );
    if (ticketHistoryMatch && method === "GET") {
      const ticketId = Number(ticketHistoryMatch[1]);
      const ticket = visibleTickets().find(
        (candidate) => candidate.id === ticketId,
      );
      return ticket
        ? jsonResponse(paginated(toBackendHistory(ticket)))
        : jsonResponse(
            { message: "Ticket no encontrado.", fields: {} },
            404,
          );
    }

    const ticketActionMatch = path.match(
      /\/tickets\/(\d+)\/(take|status|comments|attachments)\/$/,
    );
    if (ticketActionMatch && method === "POST") {
      const ticketId = Number(ticketActionMatch[1]);
      const action = ticketActionMatch[2];
      const ticketIndex = tickets.findIndex(
        (candidate) => candidate.id === ticketId,
      );
      if (ticketIndex === -1 || !authenticatedUser) {
        return jsonResponse(
          { message: "Ticket no encontrado.", fields: {} },
          404,
        );
      }

      const timestamp = new Date().toISOString();
      const ticket = tickets[ticketIndex];
      const actorName =
        `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim();

      if (action === "take") {
        if (ticket.status !== "OPEN" || ticket.assignedTo) {
          return jsonResponse(
            {
              message: "El ticket ya fue tomado.",
              fields: {},
            },
            409,
          );
        }
        tickets[ticketIndex] = {
          ...ticket,
          assignedTo: authenticatedUser.id,
          assignedToName: actorName,
          status: "IN_PROGRESS",
          takenAt: timestamp,
          updatedAt: timestamp,
        };
        return jsonResponse(
          toBackendTicket(
            tickets[ticketIndex],
            users,
            departments,
            categories,
          ),
        );
      }

      if (action === "status") {
        tickets[ticketIndex] = {
          ...ticket,
          status: body.status,
          updatedAt: timestamp,
          closedAt: ["COMPLETED", "DISMISSED"].includes(
            body.status,
          )
            ? timestamp
            : ticket.closedAt,
        };
        return jsonResponse(
          toBackendTicket(
            tickets[ticketIndex],
            users,
            departments,
            categories,
          ),
        );
      }

      if (action === "comments") {
        const comment = {
          id:
            Math.max(
              0,
              ...(ticket.comments ?? []).map((item) => item.id),
            ) + 1,
          authorId: authenticatedUser.id,
          authorName: actorName,
          role: authenticatedUser.role,
          message: body.message,
          createdAt: timestamp,
        };
        tickets[ticketIndex] = {
          ...ticket,
          comments: [...(ticket.comments ?? []), comment],
          updatedAt: timestamp,
        };
        return jsonResponse(
          toBackendTicket(
            tickets[ticketIndex],
            users,
            departments,
            categories,
            { detail: true },
          ).comments.at(-1),
          201,
        );
      }

      const attachment = {
        id:
          Math.max(
            0,
            ...(ticket.attachments ?? []).map((item) => item.id),
          ) + 1,
        name: "evidencia.pdf",
        size: 100,
        type: "application/pdf",
        uploadedAt: timestamp,
        uploadedBy: authenticatedUser.id,
        uploadedByName: actorName,
      };
      tickets[ticketIndex] = {
        ...ticket,
        attachments: [
          ...(ticket.attachments ?? []),
          attachment,
        ],
      };
      return jsonResponse(
        toBackendTicket(
          tickets[ticketIndex],
          users,
          departments,
          categories,
          { detail: true },
        ).attachments.at(-1),
        201,
      );
    }

    const ticketDetailMatch = path.match(
      /\/tickets\/(\d+)\/$/,
    );
    if (ticketDetailMatch && method === "GET") {
      const ticketId = Number(ticketDetailMatch[1]);
      const ticket = visibleTickets().find(
        (candidate) => candidate.id === ticketId,
      );
      return ticket
        ? jsonResponse(
            toBackendTicket(
              ticket,
              users,
              departments,
              categories,
              { detail: true },
            ),
          )
        : jsonResponse(
            { message: "Ticket no encontrado.", fields: {} },
            404,
          );
    }

    if (path.endsWith("/tickets/")) {
      if (!authenticatedUser) {
        return jsonResponse(
          {
            message: "La sesiÃ³n no es vÃ¡lida o ha expirado.",
            fields: {},
          },
          401,
        );
      }

      if (method === "POST") {
        const category = categories.find(
          (item) => item.id === Number(body.category),
        );
        if (
          !body.title?.trim() ||
          !body.description?.trim() ||
          !category
        ) {
          return jsonResponse(
            {
              message: "No se pudo procesar la solicitud.",
              fields: {
                title: body.title?.trim()
                  ? []
                  : ["Este campo es obligatorio."],
                description: body.description?.trim()
                  ? []
                  : ["Este campo es obligatorio."],
                category: category
                  ? []
                  : ["Selecciona una categoría válida."],
              },
            },
            400,
          );
        }

        const timestamp = new Date().toISOString();
        const requesterName =
          `${authenticatedUser.firstName} ${authenticatedUser.lastName}`.trim();
        const departmentId = getUserDepartmentId(
          authenticatedUser,
          departments,
        );
        const department = departments.find(
          (item) => item.id === departmentId,
        );
        const ticket = {
          id:
            Math.max(0, ...tickets.map((item) => item.id)) + 1,
          title: body.title.trim(),
          description: body.description.trim(),
          category: category.name,
          categoryId: category.id,
          status: "OPEN",
          priority: body.priority,
          createdBy: authenticatedUser.id,
          createdByName: requesterName,
          assignedTo: null,
          assignedToName: null,
          department: department?.name ?? "",
          departmentId,
          dueDate: body.due_date ?? "",
          takenAt: null,
          closedAt: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          comments: [],
          attachments: [],
          history: [
            {
              id: 1,
              action: `Ticket creado por ${requesterName}`,
              userId: authenticatedUser.id,
              userName: requesterName,
              createdAt: timestamp,
            },
          ],
        };
        tickets = [ticket, ...tickets];
        return jsonResponse(
          toBackendTicket(
            ticket,
            users,
            departments,
            categories,
            { detail: true },
          ),
          201,
        );
      }

      return jsonResponse(
        paginated(
          visibleTickets().map((ticket) =>
            toBackendTicket(
              ticket,
              users,
              departments,
              categories,
            ),
          ),
        ),
      );
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
  clearTicketsCache();
  global.fetch = fetchMock;

  return {
    fetchMock,
    cleanup() {
      clearAccessToken();
      clearUsersCache();
      clearDepartmentsCache();
      clearCategoriesCache();
      clearTicketsCache();
      delete global.fetch;
    },
  };
}
