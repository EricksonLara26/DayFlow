// Normaliza una fecha del calendario al formato YYYY-MM-DD usado por las tareas.
export function toDateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
