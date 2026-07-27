const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

function removeTrailingSlashes(value) {
  return value.replace(/\/+$/, "");
}

function getConfiguredApiBaseUrl() {
  if (typeof __DAYFLOW_API_BASE_URL__ !== "undefined") {
    return __DAYFLOW_API_BASE_URL__;
  }

  if (typeof process !== "undefined") {
    return process.env?.VITE_API_BASE_URL;
  }

  return undefined;
}

export const API_BASE_URL = removeTrailingSlashes(
  getConfiguredApiBaseUrl()?.trim() || DEFAULT_API_BASE_URL,
);

export function buildApiUrl(path = "") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = String(path).replace(/^\/+/, "");
  return normalizedPath
    ? `${API_BASE_URL}/${normalizedPath}`
    : API_BASE_URL;
}
