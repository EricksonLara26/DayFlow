import { getAreaName, toAreaId } from "./areaUtils";
import { getPriorityLabel, getRecurrenceLabel, normalizeTasks } from "./taskUtils";

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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStatus(status) {
  return status === "completada" ? "Completada" : "Pendiente";
}

function formatReminder(value) {
  return value ? "Gmail activo" : "Sin aviso";
}

function formatTaskTime(task) {
  if (task.startTime && task.endTime) {
    return `${task.startTime} - ${task.endTime}`;
  }

  return task.dueTime || "Sin hora";
}

function formatDescription(description) {
  return escapeHtml(description || "Sin descripcion").replace(/\n/g, "<br>");
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

export function buildTasksWordDocument(tasks, areas, profile) {
  const pendingCount = tasks.filter((task) => task.status === "pendiente").length;
  const completedCount = tasks.filter((task) => task.status === "completada").length;
  const generatedAt = new Date().toLocaleString("es-DO");
  const owner = profile?.username || profile?.email || "Usuario DayFlow";
  const rows = tasks
    .map(
      (task) => `
        <tr>
          <td>${escapeHtml(task.title)}</td>
          <td>${escapeHtml(getAreaName(areas, task.areaId))}</td>
          <td>${escapeHtml(task.dueDate || "Sin fecha")}</td>
          <td>${escapeHtml(formatTaskTime(task))}</td>
          <td>${escapeHtml(formatStatus(task.status))}</td>
          <td>${escapeHtml(getPriorityLabel(task.priority))}</td>
          <td>${escapeHtml(getRecurrenceLabel(task.recurrence))}</td>
          <td>${escapeHtml(formatReminder(task.gmailReminder))}</td>
          <td>${formatDescription(task.description)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="es">
  <head>
    <meta charset="utf-8">
    <title>Reporte DayFlow</title>
    <style>
      body {
        color: #142033;
        font-family: "Segoe UI", Arial, sans-serif;
        line-height: 1.45;
      }

      h1 {
        margin: 0 0 4px;
        color: #1f6feb;
        font-size: 26px;
      }

      .meta {
        margin: 0 0 18px;
        color: #526174;
        font-size: 12px;
      }

      .summary {
        display: table;
        width: 100%;
        margin-bottom: 18px;
      }

      .summary span {
        display: table-cell;
        padding: 8px 10px;
        border: 1px solid #dfe7dd;
        background: #f8fbff;
        font-weight: 700;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
      }

      th {
        background: #1f6feb;
        color: #ffffff;
        text-align: left;
      }

      th,
      td {
        padding: 7px;
        border: 1px solid #cfd8d0;
        vertical-align: top;
      }

      td:nth-child(9) {
        width: 24%;
      }
    </style>
  </head>
  <body>
    <h1>Reporte DayFlow</h1>
    <p class="meta">Generado por ${escapeHtml(owner)} el ${escapeHtml(generatedAt)}</p>
    <div class="summary">
      <span>${tasks.length} tareas</span>
      <span>${pendingCount} pendientes</span>
      <span>${completedCount} completadas</span>
      <span>${areas.length} bloques</span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Tarea</th>
          <th>Bloque</th>
          <th>Fecha</th>
          <th>Hora</th>
          <th>Estado</th>
          <th>Prioridad</th>
          <th>Repeticion</th>
          <th>Aviso</th>
          <th>Descripcion</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="9">No hay tareas registradas.</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`;
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
