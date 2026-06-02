// Normaliza una fecha al formato YYYY-MM-DD usado por los tickets.
export function toDateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateToKey(date) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTodayKey() {
  return dateToKey(new Date());
}

export function getCurrentYear() {
  return new Date().getFullYear();
}

export function parseDateKey(dateKey) {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function compareDateKeys(firstDateKey, secondDateKey) {
  if (!firstDateKey || !secondDateKey) {
    return 0;
  }

  return firstDateKey.localeCompare(secondDateKey);
}

export function isDateInCurrentWeek(dateKey) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return false;
  }

  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() - today.getDay());

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
}

export function addDaysToDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return dateKey;
  }

  date.setDate(date.getDate() + days);

  return dateToKey(date);
}

export function addMonthsToDateKey(dateKey, months) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return dateKey;
  }

  date.setMonth(date.getMonth() + months);

  return dateToKey(date);
}

export function getNextRecurrenceDate(dateKey, recurrence) {
  if (recurrence === "daily") {
    return addDaysToDateKey(dateKey, 1);
  }

  if (recurrence === "weekly") {
    return addDaysToDateKey(dateKey, 7);
  }

  if (recurrence === "monthly") {
    return addMonthsToDateKey(dateKey, 1);
  }

  return dateKey;
}

export function formatDate(dateValue, options = {}) {
  if (!dateValue) {
    return "Sin fecha";
  }

  const date = typeof dateValue === "string" && dateValue.length === 10 ? parseDateKey(dateValue) : new Date(dateValue);

  if (!date || Number.isNaN(date.getTime())) {
    return "Fecha inválida";
  }

  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTime(dateValue) {
  return formatDate(dateValue, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getYearsFromDateValues(dateValues, fallbackYear = getCurrentYear()) {
  const years = new Set(
    dateValues
      .filter(Boolean)
      .map((dateValue) => new Date(dateValue).getFullYear())
      .filter((year) => !Number.isNaN(year)),
  );

  years.add(fallbackYear);

  return [...years].sort((first, second) => second - first);
}

export function getYearsFromDateField(items, dateField, fallbackYear = getCurrentYear()) {
  return getYearsFromDateValues(
    items.map((item) => item?.[dateField]),
    fallbackYear,
  );
}

export function getDaysUntil(dateKey) {
  const target = parseDateKey(dateKey);

  if (!target) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function isWithinNextDays(dateKey, days, minimumDays = 0) {
  const daysUntil = getDaysUntil(dateKey);

  return daysUntil !== null && daysUntil >= minimumDays && daysUntil <= days;
}
