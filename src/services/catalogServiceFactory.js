import { apiRequest } from "./apiClient";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCatalogItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    ...item,
    id: Number(item.id),
    active: item.active !== false,
  };
}

function getListItems(payload) {
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

export function createCatalogService({
  resource,
  singularLabel,
}) {
  let cachedItems = [];

  function upsertCache(item) {
    const normalized = normalizeCatalogItem(item);
    if (!normalized) {
      return null;
    }

    const existingIndex = cachedItems.findIndex(
      (current) => current.id === normalized.id,
    );

    if (existingIndex === -1) {
      cachedItems = [...cachedItems, normalized];
    } else {
      cachedItems = cachedItems.map((current, index) =>
        index === existingIndex ? normalized : current,
      );
    }

    return normalized;
  }

  function getSnapshot(filters = {}) {
    const query = (filters.query ?? filters.search ?? "")
      .trim()
      .toLocaleLowerCase();
    const active = filters.active;

    return clone(
      cachedItems
        .filter((item) => {
          const matchesQuery =
            !query ||
            item.name?.toLocaleLowerCase().includes(query);
          const matchesActive =
            active === undefined ||
            active === "all" ||
            item.active ===
              (active === true || active === "true");

          return matchesQuery && matchesActive;
        })
        .sort(
          (left, right) =>
            left.name.localeCompare(right.name, "es", {
              sensitivity: "base",
            }) || left.id - right.id,
        ),
    );
  }

  async function list(filters = {}) {
    const response = await apiRequest(`${resource}/`, {
      query: {
        active: filters.active,
        page: filters.page,
        pageSize: filters.pageSize ?? 100,
        search: filters.search ?? filters.query,
      },
    });

    if (!response.ok) {
      return response;
    }

    const items = getListItems(response.data)
      .map(normalizeCatalogItem)
      .filter(Boolean);
    items.forEach(upsertCache);

    return {
      ...mapResult(response, clone(items)),
      pagination: getPagination(response.data, items.length),
    };
  }

  async function retrieve(id) {
    const response = await apiRequest(`${resource}/${Number(id)}/`);
    if (!response.ok) {
      return response;
    }

    const item = upsertCache(response.data);
    return mapResult(response, clone(item));
  }

  async function create(payload) {
    const response = await apiRequest(`${resource}/`, {
      body: {
        name: payload.name?.trim(),
        description: payload.description?.trim() || null,
      },
      method: "POST",
    });
    if (!response.ok) {
      return response;
    }

    const item = upsertCache(response.data);
    return mapResult(
      response,
      clone(item),
      `${singularLabel} creado correctamente.`,
    );
  }

  async function update(id, payload) {
    const response = await apiRequest(`${resource}/${Number(id)}/`, {
      body: payload,
      method: "PATCH",
    });
    if (!response.ok) {
      return response;
    }

    const item = upsertCache(response.data);
    return mapResult(
      response,
      clone(item),
      `${singularLabel} actualizado correctamente.`,
    );
  }

  async function setActive(id, active) {
    const action = active ? "activate" : "deactivate";
    const response = await apiRequest(
      `${resource}/${Number(id)}/${action}/`,
      {
        method: "POST",
      },
    );
    if (!response.ok) {
      return response;
    }

    const item = upsertCache(response.data?.data);
    return mapResult(
      response,
      clone(item),
      active
        ? `${singularLabel} activado correctamente.`
        : `${singularLabel} desactivado correctamente.`,
    );
  }

  function clearCache() {
    cachedItems = [];
  }

  return {
    activate: (id) => setActive(id, true),
    clearCache,
    create,
    deactivate: (id) => setActive(id, false),
    getNamesSnapshot: () =>
      getSnapshot({ active: true }).map((item) => item.name),
    getSnapshot,
    list,
    retrieve,
    update,
  };
}
