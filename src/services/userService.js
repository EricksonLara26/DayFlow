import { ROLES } from "../config/roles";
import { apiRequest } from "./apiClient";
import {
  getDepartments,
  getDepartmentsSnapshot,
} from "./departmentService";
import {
  userBackendToFrontend,
  userFrontendToBackend,
} from "./mappers";

let cachedUsers = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeId(id) {
  return Number(id);
}

function normalizeApiUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const mapped = userBackendToFrontend(user);
  const { password, ...safeUser } = mapped;

  return {
    ...safeUser,
    id: normalizeId(safeUser.id),
    active: safeUser.active !== false,
    mustChangePassword: safeUser.mustChangePassword === true,
  };
}

function getListUsers(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload?.results) ? payload.results : [];
}

function getPagination(payload, itemCount) {
  if (!payload || Array.isArray(payload)) {
    return {
      count: itemCount,
      next: null,
      previous: null,
    };
  }

  return {
    count: payload.count ?? itemCount,
    next: payload.next ?? null,
    previous: payload.previous ?? null,
  };
}

function mapResult(response, data, fallbackMessage = "") {
  return {
    ...response,
    data,
    message:
      response.message ||
      response.data?.message ||
      fallbackMessage,
  };
}

function upsertCachedUser(user) {
  const normalized = normalizeApiUser(user);
  if (!normalized) {
    return null;
  }

  const exists = cachedUsers.some(
    (current) => current.id === normalized.id,
  );
  cachedUsers = exists
    ? cachedUsers.map((current) =>
        current.id === normalized.id ? normalized : current,
      )
    : [...cachedUsers, normalized];

  return normalized;
}

export function replaceUsersCache(users = []) {
  cachedUsers = users
    .map(normalizeApiUser)
    .filter(Boolean);
  return getUsersSnapshot();
}

export function clearUsersCache() {
  cachedUsers = [];
}

function applyUserFilters(users, filters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const departmentFilter = filters.department;

  return users.filter((user) => {
    const matchesQuery =
      !query ||
      `${user.firstName} ${user.lastName} ${user.username} ${user.email}`
        .toLowerCase()
        .includes(query);
    const matchesRole =
      !filters.role ||
      filters.role === "ALL" ||
      user.role === filters.role;
    const matchesDepartment =
      !departmentFilter ||
      departmentFilter === "ALL" ||
      user.department === departmentFilter ||
      user.departmentId === Number(departmentFilter);
    const matchesActive =
      filters.active === undefined ||
      user.active === filters.active;

    return (
      matchesQuery &&
      matchesRole &&
      matchesDepartment &&
      matchesActive
    );
  });
}

export function getUsersSnapshot(filters = {}) {
  return clone(applyUserFilters(cachedUsers, filters));
}

export function getUserSnapshotById(id) {
  const user = cachedUsers.find(
    (currentUser) => currentUser.id === normalizeId(id),
  );
  return user ? clone(user) : null;
}

async function getDepartmentLookup() {
  let departments = getDepartmentsSnapshot();
  if (departments.length) {
    return departments;
  }

  const response = await getDepartments();
  return response.ok ? response.data : [];
}

async function resolveDepartmentId(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "ALL"
  ) {
    return value;
  }

  const numericId = Number(value);
  if (Number.isInteger(numericId) && numericId > 0) {
    return numericId;
  }

  const departments = await getDepartmentLookup();
  const normalizedName = String(value).trim().toLocaleLowerCase();
  return (
    departments.find(
      (department) =>
        department.name.trim().toLocaleLowerCase() ===
        normalizedName,
    )?.id ?? null
  );
}

async function prepareUserPayload(payload) {
  const departments = await getDepartmentLookup();
  return userFrontendToBackend(payload, { departments });
}

export async function getUsers(filters = {}) {
  const requestedDepartment =
    filters.departmentId ?? filters.department;
  const departmentId = await resolveDepartmentId(
    requestedDepartment,
  );
  const filterByUnknownDepartment =
    requestedDepartment &&
    requestedDepartment !== "ALL" &&
    !departmentId;

  const response = await apiRequest("users/", {
    query: {
      department:
        requestedDepartment === "ALL"
          ? "ALL"
          : departmentId || undefined,
      isActive:
        filters.active === undefined
          ? undefined
          : filters.active,
      ordering: filters.ordering,
      page: filters.page,
      pageSize: filters.pageSize ?? 100,
      role: filters.role,
      search: filters.search ?? filters.query,
    },
  });

  if (!response.ok) {
    return response;
  }

  let users = getListUsers(response.data)
    .map(normalizeApiUser)
    .filter(Boolean);

  if (filterByUnknownDepartment) {
    users = [];
  }

  const hasFilters = Boolean(
    filters.query ||
      filters.search ||
      filters.role ||
      requestedDepartment ||
      filters.active !== undefined ||
      filters.page,
  );

  if (hasFilters) {
    users.forEach(upsertCachedUser);
  } else {
    replaceUsersCache(users);
  }

  return {
    ...mapResult(response, clone(users)),
    pagination: getPagination(response.data, users.length),
  };
}

export async function getUserById(id) {
  const response = await apiRequest(`users/${normalizeId(id)}/`);
  if (!response.ok) {
    return response;
  }

  const user = upsertCachedUser(response.data);
  return mapResult(response, clone(user));
}

export async function createUser(payload) {
  const body = await prepareUserPayload(payload);
  const response = await apiRequest("users/", {
    body,
    mapRequest: false,
    method: "POST",
  });

  if (!response.ok) {
    return response;
  }

  const user = upsertCachedUser(response.data);
  return mapResult(
    response,
    clone(user),
    "Usuario creado correctamente.",
  );
}

export async function updateUser(id, payload) {
  const body = await prepareUserPayload(payload);
  const response = await apiRequest(`users/${normalizeId(id)}/`, {
    body,
    mapRequest: false,
    method: "PATCH",
  });

  if (!response.ok) {
    return response;
  }

  const user = upsertCachedUser(response.data);
  return mapResult(
    response,
    clone(user),
    "Usuario actualizado correctamente.",
  );
}

export async function deleteUser(id) {
  const response = await apiRequest(
    `users/${normalizeId(id)}/deactivate/`,
    {
      method: "POST",
    },
  );

  if (!response.ok) {
    return response;
  }

  const user = upsertCachedUser(response.data?.user);
  return mapResult(
    response,
    clone(user),
    "Usuario desactivado correctamente.",
  );
}

export const deactivateUser = deleteUser;

export async function resetPassword(
  userId,
  password = "1234",
  options = {},
) {
  const cleanPassword = password?.trim() ?? "";
  const response = await apiRequest(
    `users/${normalizeId(userId)}/reset-password/`,
    {
      body: {
        temporaryPassword: cleanPassword,
        confirmPassword:
          options.confirmPassword?.trim() || cleanPassword,
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    return response;
  }

  const user = upsertCachedUser(response.data?.user);
  return mapResult(
    response,
    clone(user),
    options.mustChangePassword === false
      ? "Contraseña restablecida correctamente."
      : "Contraseña temporal asignada correctamente.",
  );
}

export { ROLES };
