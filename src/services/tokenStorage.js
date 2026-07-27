let memoryToken = null;
let memoryExpiresAt = null;

export function setAccessToken(token, expiresAt = null) {
  memoryToken = token || null;
  memoryExpiresAt = expiresAt || null;
}

export function getAccessToken() {
  return memoryToken;
}

export function getAccessTokenExpiresAt() {
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
}
