const CANONICAL_ROLES = {
  ADMINISTRATOR: "ADMINISTRATOR",
  TECHNICIAN: "TECHNICIAN",
  EMPLOYEE: "EMPLOYEE",
};

const FRONTEND_ROLES = {
  ADMINISTRATOR: "ADMINISTRADOR",
  TECHNICIAN: "TECNICO",
  EMPLOYEE: "EMPLEADO",
};

const ROLE_TO_CANONICAL = {
  ADMINISTRATOR: CANONICAL_ROLES.ADMINISTRATOR,
  ADMINISTRADOR: CANONICAL_ROLES.ADMINISTRATOR,
  TECHNICIAN: CANONICAL_ROLES.TECHNICIAN,
  TECNICO: CANONICAL_ROLES.TECHNICIAN,
  TÉCNICO: CANONICAL_ROLES.TECHNICIAN,
  EMPLOYEE: CANONICAL_ROLES.EMPLOYEE,
  EMPLEADO: CANONICAL_ROLES.EMPLOYEE,
};

const ROLE_TO_FRONTEND = {
  ADMINISTRATOR: FRONTEND_ROLES.ADMINISTRATOR,
  ADMINISTRADOR: FRONTEND_ROLES.ADMINISTRATOR,
  TECHNICIAN: FRONTEND_ROLES.TECHNICIAN,
  TECNICO: FRONTEND_ROLES.TECHNICIAN,
  TÉCNICO: FRONTEND_ROLES.TECHNICIAN,
  EMPLOYEE: FRONTEND_ROLES.EMPLOYEE,
  EMPLEADO: FRONTEND_ROLES.EMPLOYEE,
};

const ROLE_FIELDS = new Set(["role", "roleCode", "authorRole"]);

function isFormData(value) {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

function isFileLike(value) {
  return (
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof File !== "undefined" && value instanceof File)
  );
}

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
}

export function snakeToCamel(value) {
  return String(value).replace(
    /_([a-z0-9])/g,
    (_, character) => character.toUpperCase(),
  );
}

export function camelToSnake(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

export function toCanonicalRole(role) {
  if (!role) {
    return role;
  }

  const normalized = String(role).trim().toUpperCase();
  return ROLE_TO_CANONICAL[normalized] ?? normalized;
}

export function toFrontendRole(role) {
  if (!role) {
    return role;
  }

  const normalized = String(role).trim().toUpperCase();
  return ROLE_TO_FRONTEND[normalized] ?? normalized;
}

function transformKeys(value, keyMapper, roleMapper) {
  if (
    value === null ||
    value === undefined ||
    value instanceof Date ||
    isFormData(value) ||
    isFileLike(value)
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => transformKeys(item, keyMapper, roleMapper));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  return Object.entries(value).reduce((result, [key, item]) => {
    const mappedKey = keyMapper(key);
    const mappedItem = transformKeys(item, keyMapper, roleMapper);
    result[mappedKey] =
      ROLE_FIELDS.has(mappedKey) && typeof mappedItem === "string"
        ? roleMapper(mappedItem)
        : mappedItem;
    return result;
  }, {});
}

export function backendToFrontend(value) {
  return transformKeys(value, snakeToCamel, toFrontendRole);
}

export function frontendToBackend(value) {
  return transformKeys(value, camelToSnake, toCanonicalRole);
}

export function userBackendToFrontend(user) {
  if (!user) {
    return null;
  }

  const mapped = backendToFrontend(user);
  const departmentId =
    mapped.departmentId ??
    (typeof mapped.department === "number" ? mapped.department : null);

  return {
    ...mapped,
    role: toFrontendRole(mapped.role),
    department: mapped.departmentName ?? mapped.department ?? "",
    departmentId,
    active: mapped.isActive ?? mapped.active ?? true,
    mustChangePassword: mapped.mustChangePassword ?? false,
  };
}

function resolveCatalogId(value, items = []) {
  if (value === null || value === undefined || value === "") {
    return value;
  }

  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && numericValue > 0) {
    return numericValue;
  }

  const normalizedName = String(value).trim().toLocaleLowerCase();
  return (
    items.find(
      (item) => item.name?.trim().toLocaleLowerCase() === normalizedName,
    )?.id ?? value
  );
}

export function userFrontendToBackend(user, options = {}) {
  const department = resolveCatalogId(
    user.departmentId ?? user.department,
    options.departments,
  );

  return frontendToBackend({
    ...user,
    department,
    role: toCanonicalRole(user.role),
    active: undefined,
    departmentId: undefined,
    departmentName: undefined,
    fullName: undefined,
    roleName: undefined,
  });
}

function commentBackendToFrontend(comment) {
  const mapped = backendToFrontend(comment);
  return {
    ...mapped,
    authorId: mapped.authorId ?? mapped.author,
    role: toFrontendRole(mapped.authorRole ?? mapped.role),
  };
}

export function ticketAttachmentBackendToFrontend(attachment) {
  const mapped = backendToFrontend(attachment);
  return {
    ...mapped,
    name: mapped.fileName,
    size: mapped.sizeBytes,
    type: mapped.mimeType,
    uploadedAt: mapped.createdAt,
  };
}

function historyBackendToFrontend(history) {
  const mapped = backendToFrontend(history);
  return {
    ...mapped,
    userId: mapped.actorId ?? mapped.actor,
    userName: mapped.actorName,
  };
}

export function ticketBackendToFrontend(ticket) {
  if (!ticket) {
    return null;
  }

  const mapped = backendToFrontend(ticket);
  const attachments = (mapped.attachments ?? []).map(
    ticketAttachmentBackendToFrontend,
  );
  const historySource = mapped.history ?? mapped.historyEntries ?? [];

  return {
    ...mapped,
    category: mapped.categoryName ?? mapped.category,
    categoryId:
      mapped.categoryId ??
      (typeof mapped.category === "number" ? mapped.category : null),
    createdBy: mapped.requesterId ?? mapped.requester,
    createdByName: mapped.requesterName,
    assignedTo:
      mapped.assignedTechnicianId ?? mapped.assignedTechnician ?? null,
    assignedToName: mapped.assignedTechnicianName ?? null,
    department:
      mapped.requesterDepartmentName ?? mapped.department ?? "",
    departmentId:
      mapped.requesterDepartmentId ??
      (typeof mapped.requesterDepartment === "number"
        ? mapped.requesterDepartment
        : null),
    dueDate: mapped.dueDate ?? "",
    comments: (mapped.comments ?? []).map(commentBackendToFrontend),
    attachments,
    evidence: attachments[0] ?? null,
    history: historySource.map(historyBackendToFrontend),
  };
}

export function ticketFrontendToBackend(ticket, options = {}) {
  const category = resolveCatalogId(
    ticket.categoryId ?? ticket.category,
    options.categories,
  );

  return frontendToBackend({
    title: ticket.title,
    description: ticket.description,
    category,
    priority: ticket.priority,
    dueDate: ticket.dueDate || null,
  });
}

export function ticketAttachmentToFormData(fileOrPayload, description) {
  const payload =
    fileOrPayload &&
    typeof fileOrPayload === "object" &&
    "file" in fileOrPayload
      ? fileOrPayload
      : { file: fileOrPayload, description };
  const formData = new FormData();

  if (payload.file) {
    formData.append("file", payload.file);
  }
  if (payload.description !== undefined && payload.description !== null) {
    formData.append("description", payload.description);
  }

  return formData;
}
