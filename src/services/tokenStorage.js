const ACCESS_TOKEN_KEY = "dayflow-access-token";
const ACCESS_EXPIRES_AT_KEY = "dayflow-access-expires-at";

let memoryToken = null;
let memoryExpiresAt = null;

function getSessionStorage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function setAccessToken(token, expiresAt = null) {
  memoryToken = token || null;
  memoryExpiresAt = expiresAt || null;

  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  if (memoryToken) {
    storage.setItem(ACCESS_TOKEN_KEY, memoryToken);
  } else {
    storage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (memoryExpiresAt) {
    storage.setItem(ACCESS_EXPIRES_AT_KEY, memoryExpiresAt);
  } else {
    storage.removeItem(ACCESS_EXPIRES_AT_KEY);
  }
}

export function getAccessToken() {
  if (memoryToken) {
    return memoryToken;
  }

  const storage = getSessionStorage();
  memoryToken = storage?.getItem(ACCESS_TOKEN_KEY) || null;
  memoryExpiresAt =
    storage?.getItem(ACCESS_EXPIRES_AT_KEY) || memoryExpiresAt;
  return memoryToken;
}

export function getAccessTokenExpiresAt() {
  if (memoryExpiresAt) {
    return memoryExpiresAt;
  }

  const storage = getSessionStorage();
  memoryExpiresAt = storage?.getItem(ACCESS_EXPIRES_AT_KEY) || null;
  return memoryExpiresAt;
}

export function shouldRefreshAccessToken(now = Date.now()) {
  const token = getAccessToken();
  const expiresAt = getAccessTokenExpiresAt();

  if (!token || !expiresAt) {
    return false;
  }

  const expiration = new Date(expiresAt).getTime();
  return Number.isFinite(expiration) && expiration <= now + 30_000;
}

export function clearAccessToken() {
  memoryToken = null;
  memoryExpiresAt = null;

  const storage = getSessionStorage();
  storage?.removeItem(ACCESS_TOKEN_KEY);
  storage?.removeItem(ACCESS_EXPIRES_AT_KEY);
}
