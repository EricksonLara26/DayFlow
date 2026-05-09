import { priorityOptions, recurrenceOptions } from "../constants/taskForm";

export function getPriorityLabel(priority) {
  return priorityOptions.find((option) => option.id === priority)?.label ?? "Media";
}

export function getRecurrenceLabel(recurrence) {
  return recurrenceOptions.find((option) => option.id === recurrence)?.label ?? "No repetir";
}

export function normalizeTask(task) {
  const priority =
    task.priority ?? (task.gmailReminder && task.status !== "completada" ? "alta" : "media");

  return {
    ...task,
    priority,
    recurrence: task.recurrence ?? "none",
    dueTime: task.dueTime ?? task.endTime ?? "",
    nextOccurrenceCreated: Boolean(task.nextOccurrenceCreated),
  };
}

export function normalizeTasks(tasks) {
  return tasks.map((task) => normalizeTask(task));
}

export function isRecurringTask(task) {
  return Boolean(task.recurrence && task.recurrence !== "none");
}
