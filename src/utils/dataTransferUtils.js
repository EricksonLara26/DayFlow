import { getAreaName, toAreaId } from "./areaUtils";
import { normalizeTasks } from "./taskUtils";

const csvColumns = [
  "id",
  "title",
  "description",
  "areaId",
  "areaName",
  "dueDate",
  "startTime",
  "endTime",
  "status",
  "priority",
  "recurrence",
  "gmailReminder",
];

function escapeCsvValue(value) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function parseBoolean(value) {
  return ["true", "1", "si", "yes", "activo"].includes(String(value).trim().toLowerCase());
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      if (row.some((value) => value.trim())) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) {
    rows.push(row);
  }

  return rows;
}

function ensureArea(areas, areaId, areaName) {
  const fallbackName = areaName || areaId || "Importado";
  const resolvedId = areaId || toAreaId(fallbackName);

  if (areas.some((area) => area.id === resolvedId)) {
    return resolvedId;
  }

  const colors = ["#1f6feb", "#2f9e44", "#7c3f92", "#be3a34", "#315c9f", "#0f766e"];
  areas.push({
    id: resolvedId,
    name: fallbackName,
    color: colors[areas.length % colors.length],
  });

  return resolvedId;
}

export function createExportPayload({ areas, tasks, profile, settings }) {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    areas,
    tasks,
    profile,
    settings,
  };
}

export function buildTasksCsv(tasks, areas) {
  const header = csvColumns.join(",");
  const lines = tasks.map((task) =>
    csvColumns
      .map((column) => {
        if (column === "areaName") {
          return escapeCsvValue(getAreaName(areas, task.areaId));
        }

        return escapeCsvValue(task[column]);
      })
      .join(","),
  );

  return [header, ...lines].join("\n");
}

export function parseImportedData(text, fileName, currentAreas) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error("El archivo esta vacio.");
  }

  if (fileName.toLowerCase().endsWith(".json") || ["{", "["].includes(trimmedText[0])) {
    const parsed = JSON.parse(trimmedText);
    const tasks = Array.isArray(parsed) ? parsed : parsed.tasks;
    const areas = Array.isArray(parsed.areas) ? parsed.areas : currentAreas;

    if (!Array.isArray(tasks)) {
      throw new Error("El JSON no contiene tareas validas.");
    }

    return {
      areas,
      tasks: normalizeTasks(tasks),
      profile: parsed.profile,
      settings: parsed.settings,
    };
  }

  const rows = parseCsvRows(trimmedText);
  const header = rows[0]?.map((value) => value.trim());

  if (!header?.length) {
    throw new Error("El CSV no contiene encabezados validos.");
  }

  const areas = [...currentAreas];
  const tasks = rows.slice(1).map((row, index) => {
    const record = Object.fromEntries(header.map((column, columnIndex) => [column, row[columnIndex] ?? ""]));
    const areaId = ensureArea(areas, record.areaId?.trim(), record.areaName?.trim());

    return {
      id: Number(record.id) || Date.now() + index,
      title: record.title?.trim() || "Tarea importada",
      description: record.description?.trim() || "Sin descripcion",
      areaId,
      dueDate: record.dueDate?.trim() || "",
      startTime: record.startTime?.trim() || "",
      endTime: record.endTime?.trim() || "",
      dueTime: record.endTime?.trim() || "",
      status: record.status?.trim() || "pendiente",
      priority: record.priority?.trim() || "media",
      recurrence: record.recurrence?.trim() || "none",
      gmailReminder: parseBoolean(record.gmailReminder),
    };
  });

  return {
    areas,
    tasks: normalizeTasks(tasks),
  };
}
