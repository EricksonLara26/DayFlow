// Normaliza una fecha del calendario al formato YYYY-MM-DD usado por las tareas.
export function toDateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateToKey(date) {
  return toDateKey(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getTodayKey() {
  return dateToKey(new Date());
}

export function parseDateKey(dateKey) {
  if (!dateKey) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(year, month - 1, day);
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
