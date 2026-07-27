import { buildApiUrl } from "../config/api";
import { backendToFrontend, frontendToBackend } from "./mappers";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  shouldRefreshAccessToken,
} from "./tokenStorage";

export const AUTH_EXPIRED_EVENT = "dayflow:auth-expired";
export const AUTH_REFRESHED_EVENT = "dayflow:auth-refreshed";

let refreshPromise = null;

function dispatchAuthEvent(name, detail = undefined) {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function" ||
    typeof CustomEvent === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function createSuccess(data, status, message = "") {
  return {
    ok: true,
    data,
    message,
    status,
    error: null,
  };
}

function createFailure({
  message,
  status = 0,
  fields = {},
  type = "api",
  cause,
}) {
  return {
    ok: false,
    data: null,
    message,
    status,
    error: {
      message,
      status,
      fields,
      type,
      ...(cause ? { cause } : {}),
    },
  };
}

function appendQueryValue(searchParams, key, value) {
  if (value === undefined || value === null || value === "") {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendQueryValue(searchParams, key, item));
    return;
  }

  searchParams.append(key, String(value));
}

function buildRequestUrl(path, query) {
  const url = new URL(buildApiUrl(path));
  const mappedQuery = frontendToBackend(query ?? {});

  Object.entries(mappedQuery).forEach(([key, value]) => {
    appendQueryValue(url.searchParams, key, value);
  });

  return url.toString();
}

function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function prepareBody(body, headers, mapRequest) {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (
    isFormData(body) ||
    typeof body === "string" ||
    (typeof Blob !== "undefined" && body instanceof Blob)
  ) {
    return body;
  }

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return JSON.stringify(mapRequest ? frontendToBackend(body) : body);
}

async function readResponse(response, responseType = "json") {
  if (response.status === 204) {
    return null;
  }

  if (responseType === "blob" && response.ok) {
    return response.blob();
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

function mapResponsePayload(payload, mapper) {
  if (!mapper || payload === null || payload === undefined) {
    return payload;
  }

  return mapper(payload);
}

function normalizeResponse(response, payload, mapper) {
  const mappedPayload = mapResponsePayload(payload, mapper);
  const message =
    mappedPayload &&
    typeof mappedPayload === "object" &&
    "message" in mappedPayload
      ? mappedPayload.message
      : "";

  if (response.ok) {
    return createSuccess(mappedPayload, response.status, message);
  }

  const fields =
    mappedPayload &&
    typeof mappedPayload === "object" &&
    mappedPayload.fields &&
    typeof mappedPayload.fields === "object"
      ? mappedPayload.fields
      : {};

  return createFailure({
    message:
      message ||
      (response.status === 401
        ? "La sesión no es válida o ha expirado."
        : response.status === 403
          ? "No tienes permisos para realizar esta operación."
          : "No se pudo procesar la solicitud."),
    status: response.status,
    fields,
  });
}

async function performRefresh() {
  try {
    const response = await fetch(buildApiUrl("auth/refresh/"), {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    const payload = await readResponse(response);
    const mappedPayload = backendToFrontend(payload);

    if (!response.ok || !mappedPayload?.access) {
      clearAccessToken();
      dispatchAuthEvent(AUTH_EXPIRED_EVENT);
      return normalizeResponse(response, payload, backendToFrontend);
    }

    setAccessToken(
      mappedPayload.access,
      mappedPayload.accessExpiresAt ?? null,
    );
    dispatchAuthEvent(AUTH_REFRESHED_EVENT, {
      user: mappedPayload.user ?? null,
    });
    return createSuccess(
      mappedPayload,
      response.status,
      mappedPayload.message ?? "",
    );
  } catch (cause) {
    return createFailure({
      message: "No se pudo conectar con DayFlow.",
      status: 0,
      type: "network",
      cause,
    });
  }
}

export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function apiRequest(path, options = {}) {
  const {
    auth = true,
    body,
    headers: customHeaders = {},
    mapRequest = true,
    mapResponse = backendToFrontend,
    method = body === undefined ? "GET" : "POST",
    query,
    responseType = "json",
    retryOnUnauthorized = true,
    signal,
    _retried = false,
  } = options;

  if (auth && !_retried && shouldRefreshAccessToken()) {
    const proactiveRefresh = await refreshAccessToken();
    if (!proactiveRefresh.ok && proactiveRefresh.status === 0) {
      return proactiveRefresh;
    }
  }

  const headers = new Headers(customHeaders);
  if (!headers.has("Accept")) {
    headers.set(
      "Accept",
      responseType === "blob"
        ? "application/octet-stream"
        : "application/json",
    );
  }

  const accessToken = auth ? getAccessToken() : null;
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  try {
    const response = await fetch(buildRequestUrl(path, query), {
      method,
      credentials: "include",
      headers,
      body: prepareBody(body, headers, mapRequest),
      signal,
    });
    const payload = await readResponse(response, responseType);

    if (
      response.status === 401 &&
      auth &&
      retryOnUnauthorized &&
      !_retried
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed.ok) {
        return apiRequest(path, {
          ...options,
          _retried: true,
        });
      }
      if (refreshed.status === 0) {
        return refreshed;
      }
    }

    return normalizeResponse(response, payload, mapResponse);
  } catch (cause) {
    const aborted = cause?.name === "AbortError";
    return createFailure({
      message: aborted
        ? "La solicitud fue cancelada."
        : "No se pudo conectar con DayFlow.",
      status: 0,
      type: aborted ? "aborted" : "network",
      cause,
    });
  }
}

export const httpClient = {
  get(path, options = {}) {
    return apiRequest(path, { ...options, method: "GET" });
  },
  post(path, body, options = {}) {
    return apiRequest(path, { ...options, body, method: "POST" });
  },
  put(path, body, options = {}) {
    return apiRequest(path, { ...options, body, method: "PUT" });
  },
  patch(path, body, options = {}) {
    return apiRequest(path, { ...options, body, method: "PATCH" });
  },
  delete(path, options = {}) {
    return apiRequest(path, { ...options, method: "DELETE" });
  },
};
