import { ROLES } from "../config/roles";
import { getUserFullName, normalizeUser } from "../data/users";
import { getUsersSnapshot, resetPassword } from "./userService";

const AUTH_STORAGE_KEY = "dayflow-auth-user";

function normalizeIdentifier(value) {
  return value?.trim().toLowerCase() ?? "";
}

function ok(data, extra = {}) {
  return { ok: true, data, ...extra };
}

function fail(message, status = 400) {
  return { ok: false, status, message, error: { message, status } };
}

export function sanitizeAuthenticatedUser(user) {
  if (!user) {
    return null;
  }

  const normalizedUser = normalizeUser(user);

  return {
    id: normalizedUser.id,
    firstName: normalizedUser.firstName,
    lastName: normalizedUser.lastName,
    username: normalizedUser.username,
    email: normalizedUser.email,
    role: normalizedUser.role,
    department: normalizedUser.department,
    position: normalizedUser.position,
    active: normalizedUser.active,
    mustChangePassword: normalizedUser.mustChangePassword,
  };
}

export function getStoredAuthenticatedUser() {
  try {
    const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;

    if (!parsedUser) {
      return null;
    }

    const normalizedUser = sanitizeAuthenticatedUser(parsedUser);

    if (!Object.values(ROLES).includes(normalizedUser.role)) {
      clearAuthenticatedUser();
      return null;
    }

    return normalizedUser;
  } catch {
    return null;
  }
}

export function storeAuthenticatedUser(user) {
  const sessionUser = sanitizeAuthenticatedUser(user);

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  } catch {
    // La sesion continua en memoria si el navegador bloquea almacenamiento local.
  }

  return sessionUser;
}

export function clearAuthenticatedUser() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // No hay accion adicional si el almacenamiento local no esta disponible.
  }
}

export function login({ identifier, password }, users = getUsersSnapshot()) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const matchedUser = users.find((user) => {
    const fullName = getUserFullName(user).toLowerCase();
    const username = user.username?.toLowerCase() ?? "";
    const email = user.email?.toLowerCase() ?? "";

    return [username, email, fullName].includes(normalizedIdentifier);
  });

  if (!matchedUser || matchedUser.password !== password) {
    return fail("Credenciales incorrectas.", 401);
  }

  if (matchedUser.active === false) {
    return fail("Usuario inactivo. Contacte al administrador.", 403);
  }

  const user = storeAuthenticatedUser(matchedUser);

  return ok({ user }, { user, message: "Sesion iniciada correctamente." });
}

export function logout() {
  clearAuthenticatedUser();
  return ok(null, { message: "Sesion cerrada correctamente." });
}

export function getCurrentUser() {
  return ok(getStoredAuthenticatedUser());
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = getUsersSnapshot().find((currentUser) => currentUser.id === Number(userId));

  if (!user) {
    return fail("Usuario no encontrado.", 404);
  }

  if (user.password !== currentPassword) {
    return fail("La contrasena actual no coincide.");
  }

  const cleanPassword = newPassword?.trim() ?? "";

  if (cleanPassword.length < 4) {
    return fail("La nueva contrasena debe tener al menos 4 caracteres.");
  }

  return resetPassword(userId, cleanPassword, { mustChangePassword: false });
}
