import { ROLES } from "../config/roles";
import { getUserFullName, normalizeUser } from "../data/users";

const AUTH_STORAGE_KEY = "dayflow-auth-user";

function normalizeIdentifier(value) {
  return value.trim().toLowerCase();
}

export function sanitizeAuthenticatedUser(user) {
  if (!user) {
    return null;
  }

  const normalizedUser = normalizeUser(user);

  return {
    id: normalizedUser.id,
    nombre: getUserFullName(normalizedUser),
    usuario: normalizedUser.username,
    email: normalizedUser.email,
    rol: normalizedUser.role,
    departamento: normalizedUser.department,
    cargo: normalizedUser.jobTitle,
    activo: normalizedUser.active,
    firstName: normalizedUser.firstName,
    lastName: normalizedUser.lastName,
    username: normalizedUser.username,
    role: normalizedUser.role,
    department: normalizedUser.department,
    jobTitle: normalizedUser.jobTitle,
    active: normalizedUser.active,
  };
}

export function getStoredAuthenticatedUser() {
  try {
    const rawUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;

    if (!parsedUser) {
      return null;
    }

    if (!Object.values(ROLES).includes(parsedUser.role)) {
      clearAuthenticatedUser();
      return null;
    }

    return parsedUser;
  } catch {
    return null;
  }
}

export function storeAuthenticatedUser(user) {
  const sessionUser = sanitizeAuthenticatedUser(user);

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
  } catch {
    // La sesión continúa en memoria si el navegador bloquea almacenamiento local.
  }

  return sessionUser;
}

export function clearAuthenticatedUser() {
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // No hay acción adicional si el almacenamiento local no está disponible.
  }
}

export function login({ identifier, password }, users) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  const matchedUser = users.find((user) => {
    const fullName = getUserFullName(user).toLowerCase();
    const username = user.username?.toLowerCase() ?? "";
    const email = user.email?.toLowerCase() ?? "";

    return [username, email, fullName].includes(normalizedIdentifier);
  });

  if (!matchedUser || matchedUser.password !== password) {
    return { ok: false, message: "Credenciales incorrectas." };
  }

  if (matchedUser.active === false) {
    return { ok: false, message: "Usuario inactivo. Contacte al administrador." };
  }

  return { ok: true, user: storeAuthenticatedUser(matchedUser) };
}
