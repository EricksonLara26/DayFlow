// Valores iniciales del formulario que se reutilizan al crear o reiniciar una tarea.
export const defaultTaskForm = {
  title: "",
  description: "",
  areaId: "trabajo",
  dueDate: "2026-04-25",
  startTime: "09:00",
  endTime: "10:00",
  priority: "media",
  recurrence: "none",
  gmailReminder: true,
};

export const priorityOptions = [
  { id: "baja", label: "Baja" },
  { id: "media", label: "Media" },
  { id: "alta", label: "Alta" },
];

export const recurrenceOptions = [
  { id: "none", label: "No repetir" },
  { id: "daily", label: "Diaria" },
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensual" },
];
