// Detecta si el navegador del usuario usa formato de 12 o 24 horas.
export function detectUserTimeFormat() {
  try {
    const options = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();

    if (typeof options.hour12 === "boolean") {
      return options.hour12 ? "12h" : "24h";
    }

    return options.hourCycle === "h11" || options.hourCycle === "h12" ? "12h" : "24h";
  } catch {
    return "24h";
  }
}

// Resuelve la opcion "automatico" antes de formatear horas para pantalla.
export function getEffectiveTimeFormat(timeFormat) {
  return timeFormat === "automatic" ? detectUserTimeFormat() : timeFormat;
}

// Convierte valores HH:mm del formulario a 24h o AM/PM segun la preferencia activa.
export function formatTimeValue(time, timeFormat = "automatic") {
  if (!time) {
    return "";
  }

  const [hourPart, minutePart = "00"] = time.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return time;
  }

  if (getEffectiveTimeFormat(timeFormat) === "24h") {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

// Construye el rango de tiempo que se muestra en tarjetas, calendario y avisos.
export function getTaskTimeRange(task, timeFormat = "automatic") {
  if (task.startTime && task.endTime) {
    return `${formatTimeValue(task.startTime, timeFormat)} - ${formatTimeValue(task.endTime, timeFormat)}`;
  }

  return task.dueTime ? formatTimeValue(task.dueTime, timeFormat) : "Sin hora";
}
