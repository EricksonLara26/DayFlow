import { ROLES } from "../config/roles";
import { normalizeUser } from "../data/users";
import { apiRequest, refreshAccessToken } from "./apiClient";
import { toFrontendRole, userBackendToFrontend } from "./mappers";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./tokenStorage";

const AUTH_STORAGE_KEY = "dayflow-auth-user";

function ok(data, extra = {}) {
  return {
    ok: true,
    data,
    message: extra.message ?? "",
    status: extra.status ?? 200,
    error: null,
    ...extra,
  };
}

function getSessionStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function sanitizeAuthenticatedUser(user) {
  if (!user) {
    return null;
  }

  const mappedUser = userBackendToFrontend(user) ?? user;
  const normalizedUser = normalizeUser(mappedUser);

  return {
    id: normalizedUser.id,
    firstName: normalizedUser.firstName,
    lastName: normalizedUser.lastName,
    username: normalizedUser.username,
    email: normalizedUser.email,
    role: toFrontendRole(normalizedUser.role),
    department: normalizedUser.department,
    departmentId: mappedUser.departmentId ?? null,
    position: normalizedUser.position,
    active: normalizedUser.active,
    mustChangePassword: normalizedUser.mustChangePassword,
  };
}

export function getStoredAuthenticatedUser() {
  try {
    const rawUser = getSessionStorage()?.getItem(AUTH_STORAGE_KEY);
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;

    if (!parsedUser) {
      return null;
    }

    const normalizedUser = sanitizeAuthenticatedUser(parsedUser);
    if (!Object.values(ROLES).includes(normalizedUser.role)) {
      clearAuthenticationSession();
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
    if (sessionUser) {
      getSessionStorage()?.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify(sessionUser),
      );
    } else {
      getSessionStorage()?.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {
    // La sesión continúa en memoria si el navegador bloquea localStorage.
  }

  return sessionUser;
}

export function clearAuthenticatedUser() {
  try {
    getSessionStorage()?.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // No hay acción adicional si localStorage no está disponible.
  }
}

export function clearAuthenticationSession() {
  clearAccessToken();
  clearAuthenticatedUser();
}

function applyAuthenticationPayload(payload, fallbackMessage, status = 200) {
  const user = storeAuthenticatedUser(
    userBackendToFrontend(payload?.user),
  );

  if (payload?.access) {
    setAccessToken(payload.access, payload.accessExpiresAt ?? null);
  }

  return ok(
    { user },
    {
      user,
      message: payload?.message || fallbackMessage,
      status,
    },
  );
}

function clearIfUnauthorized(result) {
  if (result.status === 401) {
    clearAuthenticationSession();
  }
  return result;
}

export async function login({ identifier, password }) {
  const result = await apiRequest("auth/login/", {
    auth: false,
    body: { identifier, password },
    method: "POST",
    retryOnUnauthorized: false,
  });

  if (!result.ok) {
    return clearIfUnauthorized(result);
  }

  return applyAuthenticationPayload(
    result.data,
    "Sesión iniciada correctamente.",
    result.status,
  );
}

export async function refreshSession() {
  const result = await refreshAccessToken();
  if (!result.ok) {
    return clearIfUnauthorized(result);
  }

  return applyAuthenticationPayload(
    result.data,
    "Sesión renovada correctamente.",
    result.status,
  );
}

export async function getCurrentUser() {
  const result = await apiRequest("auth/me/");
  if (!result.ok) {
    return clearIfUnauthorized(result);
  }

  const user = storeAuthenticatedUser(
    userBackendToFrontend(result.data?.user),
  );
  return ok(user, {
    user,
    message: result.message,
    status: result.status,
  });
}

export async function restoreSession() {
  const cachedUser = getStoredAuthenticatedUser();
  const accessToken = getAccessToken();

  if (!cachedUser && !accessToken) {
    return ok(null, { status: 204 });
  }

  const result = accessToken
    ? await getCurrentUser()
    : await refreshSession();

  if (!result.ok && result.status === 0 && cachedUser) {
    return ok(cachedUser, {
      user: cachedUser,
      message: result.message,
      status: 0,
      stale: true,
    });
  }

  return result;
}

export async function logout() {
  let result;
  try {
    result = await apiRequest("auth/logout/", {
      auth: false,
      method: "POST",
      retryOnUnauthorized: false,
    });
  } finally {
    clearAuthenticationSession();
  }

  return result.ok
    ? ok(null, {
        message: result.message || "Sesión cerrada correctamente.",
        status: result.status,
      })
    : result;
}

export async function changePassword(
  userId,
  currentPassword,
  newPassword,
  confirmPassword = newPassword,
) {
  const result = await apiRequest("auth/change-password/", {
    body: {
      currentPassword,
      newPassword,
      confirmPassword,
    },
    method: "POST",
  });

  if (!result.ok) {
    return clearIfUnauthorized(result);
  }

  const applied = applyAuthenticationPayload(
    result.data,
    "Contraseña actualizada correctamente.",
    result.status,
  );

  return {
    ...applied,
    data: applied.user,
  };
}

export const refresh = refreshSession;
