import { ROLES } from "../config/roles";
import { normalizeUser } from "../data/users";
import { initialUsers } from "../mocks";

let mockUsers = initialUsers.map(normalizeUser);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ok(data, extra = {}) {
  return Promise.resolve({ ok: true, data, ...extra });
}

function fail(message, status = 400) {
  return Promise.resolve({ ok: false, status, message, error: { message, status } });
}

function getNextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function normalizeId(id) {
  return Number(id);
}

function findUserIndex(userId) {
  const normalizedId = normalizeId(userId);
  return mockUsers.findIndex((user) => user.id === normalizedId);
}

function applyUserFilters(users, filters = {}) {
  const query = filters.query?.trim().toLowerCase() ?? "";

  return users.filter((user) => {
    const matchesQuery =
      !query ||
      `${user.firstName} ${user.lastName} ${user.username} ${user.email}`.toLowerCase().includes(query);
    const matchesRole = !filters.role || filters.role === "ALL" || user.role === filters.role;
    const matchesDepartment =
      !filters.department || filters.department === "ALL" || user.department === filters.department;
    const matchesActive = filters.active === undefined || user.active === filters.active;

    return matchesQuery && matchesRole && matchesDepartment && matchesActive;
  });
}

export function getUsersSnapshot(filters = {}) {
  return clone(applyUserFilters(mockUsers, filters));
}

export function getUserSnapshotById(id) {
  const user = mockUsers.find((currentUser) => currentUser.id === normalizeId(id));
  return user ? clone(user) : null;
}

export function getUsers(filters = {}) {
  return ok(getUsersSnapshot(filters));
}

export function getUserById(id) {
  const user = getUserSnapshotById(id);

  if (!user) {
    return fail("Usuario no encontrado.", 404);
  }

  return ok(user);
}

export function createUser(payload) {
  const username = payload.username?.trim();
  const email = payload.email?.trim().toLowerCase();

  if (!username || !email) {
    return fail("Nombre de usuario y correo son obligatorios.");
  }

  if (mockUsers.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    return fail("Ese nombre de usuario ya existe.", 409);
  }

  if (mockUsers.some((user) => user.email.toLowerCase() === email)) {
    return fail("Ese correo ya esta en uso.", 409);
  }

  mockUsers = createLocalUser(mockUsers, {
    ...payload,
    username,
    email,
  });

  return ok(clone(mockUsers.at(-1)), { message: "Usuario creado correctamente.", status: 201 });
}

export function updateUser(id, payload) {
  const userId = normalizeId(id);
  const currentUser = mockUsers.find((user) => user.id === userId);

  if (!currentUser) {
    return fail("Usuario no encontrado.", 404);
  }

  const nextEmail = payload.email?.trim().toLowerCase();

  if (nextEmail && mockUsers.some((user) => user.id !== userId && user.email.toLowerCase() === nextEmail)) {
    return fail("Ese correo ya esta en uso.", 409);
  }

  mockUsers = updateLocalUser(mockUsers, userId, {
    ...payload,
    email: nextEmail ?? payload.email,
  });

  return ok(getUserSnapshotById(userId), { message: "Usuario actualizado correctamente." });
}

export function deleteUser(id) {
  const userId = normalizeId(id);
  const userIndex = findUserIndex(userId);

  if (userIndex === -1) {
    return fail("Usuario no encontrado.", 404);
  }

  mockUsers = deactivateLocalUser(mockUsers, userId);

  return ok(getUserSnapshotById(userId), { message: "Usuario desactivado correctamente." });
}

export function resetPassword(userId, password = "1234", options = {}) {
  const normalizedUserId = normalizeId(userId);

  if (findUserIndex(normalizedUserId) === -1) {
    return fail("Usuario no encontrado.", 404);
  }

  const cleanPassword = password?.trim() ?? "";

  if (cleanPassword.length < 4) {
    return fail("La contrasena temporal debe tener al menos 4 caracteres.");
  }

  mockUsers = resetLocalUserPassword(mockUsers, normalizedUserId, cleanPassword, {
    mustChangePassword: options.mustChangePassword ?? false,
  });

  const message = options.mustChangePassword
    ? "Contrasena temporal asignada correctamente."
    : "Contrasena restablecida correctamente.";

  return ok(getUserSnapshotById(normalizedUserId), { message });
}

export function createLocalUser(users, form) {
  const role = Object.values(ROLES).includes(form.role) ? form.role : ROLES.EMPLOYEE;
  const nextUser = normalizeUser({
    id: getNextId(users),
    firstName: form.firstName,
    lastName: form.lastName,
    username: form.username,
    email: form.email,
    password: form.password,
    role,
    department: form.department,
    position: form.position,
    active: true,
    mustChangePassword: form.mustChangePassword ?? false,
  });

  return [...users, nextUser];
}

export function updateLocalUser(users, userId, changes) {
  return users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    const firstName = changes.firstName ?? user.firstName;
    const lastName = changes.lastName ?? user.lastName;
    const role = changes.role ?? user.role;
    const department = changes.department ?? user.department;
    const position = changes.position ?? user.position;

    return normalizeUser({
      ...user,
      ...changes,
      firstName,
      lastName,
      role,
      department,
      position,
    });
  });
}

export function deactivateLocalUser(users, userId) {
  return updateLocalUser(users, userId, { active: false });
}

export function resetLocalUserPassword(users, userId, password = "1234", options = {}) {
  return updateLocalUser(users, userId, {
    password,
    mustChangePassword: options.mustChangePassword ?? false,
  });
}
