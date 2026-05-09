import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import AuthScreen from "./components/auth/AuthScreen";
import CalendarView from "./components/calendar/CalendarView";
import HomeView from "./components/home/HomeView";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import SettingsView from "./components/settings/SettingsView";
import Filters from "./components/tasks/Filters";
import TaskDetailsModal from "./components/tasks/TaskDetailsModal";
import TaskForm from "./components/tasks/TaskForm";
import TaskList from "./components/tasks/TaskList";
import { defaultTaskForm } from "./constants/taskForm";
import { initialAreas, initialTasks } from "./data/dayflowData";
import { getAreaName, toAreaId } from "./utils/areaUtils";
import {
  buildTasksCsv,
  createExportPayload,
  parseImportedData,
} from "./utils/dataTransferUtils";
import {
  compareDateKeys,
  getNextRecurrenceDate,
  getTodayKey,
  isDateInCurrentWeek,
} from "./utils/dateUtils";
import { isRecurringTask, normalizeTask, normalizeTasks } from "./utils/taskUtils";

const STORAGE_KEY = "dayflow-state-v2";
const taskFilterIds = ["all", "pendiente", "completada", "today", "week", "overdue", "reminders", "high"];
const defaultProfile = {
  username: "Erickson",
  email: "ericksonburgos26@gmail.com",
  phone: "",
};

function readStoredState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function saveStoredState(state) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sanitizeUser(account) {
  if (!account) {
    return null;
  }

  return {
    name: account.name || account.username || account.email || "Usuario DayFlow",
    username: account.username || account.name || account.email || "Usuario DayFlow",
    email: account.email || "",
    phone: account.phone || "",
  };
}

function taskMatchesFilter(task, filter) {
  const today = getTodayKey();

  if (filter === "pendiente" || filter === "completada") {
    return task.status === filter;
  }

  if (filter === "today") {
    return task.dueDate === today;
  }

  if (filter === "week") {
    return isDateInCurrentWeek(task.dueDate);
  }

  if (filter === "overdue") {
    return task.status === "pendiente" && compareDateKeys(task.dueDate, today) < 0;
  }

  if (filter === "reminders") {
    return task.gmailReminder;
  }

  if (filter === "high") {
    return task.priority === "alta";
  }

  return true;
}

function getTaskFilterCounts(tasks) {
  return Object.fromEntries(
    taskFilterIds.map((filter) => [filter, tasks.filter((task) => taskMatchesFilter(task, filter)).length]),
  );
}

function taskToForm(task) {
  return {
    title: task.title ?? "",
    description: task.description ?? "",
    areaId: task.areaId ?? defaultTaskForm.areaId,
    dueDate: task.dueDate ?? getTodayKey(),
    startTime: task.startTime ?? "",
    endTime: task.endTime ?? task.dueTime ?? "",
    priority: task.priority ?? "media",
    recurrence: task.recurrence ?? "none",
    gmailReminder: Boolean(task.gmailReminder),
  };
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// App mantiene el estado principal y decide que vista debe renderizarse.
export default function App() {
  const storedState = useMemo(() => readStoredState(), []);
  const [user, setUser] = useState(() => sanitizeUser(storedState?.user));
  const [activeView, setActiveView] = useState("Inicio");
  const [areas, setAreas] = useState(() =>
    Array.isArray(storedState?.areas) && storedState.areas.length ? storedState.areas : initialAreas,
  );
  const [tasks, setTasks] = useState(() =>
    normalizeTasks(Array.isArray(storedState?.tasks) && storedState.tasks.length ? storedState.tasks : initialTasks),
  );
  const [query, setQuery] = useState("");
  const [activeArea, setActiveArea] = useState("all");
  const [taskFilter, setTaskFilter] = useState("all");
  const [taskForm, setTaskForm] = useState(() => ({ ...defaultTaskForm, dueDate: getTodayKey() }));
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [newAreaName, setNewAreaName] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [themeMode, setThemeMode] = useState(storedState?.settings?.themeMode ?? "light");
  const [timeFormat, setTimeFormat] = useState(storedState?.settings?.timeFormat ?? "automatic");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    storedState?.settings?.notificationsEnabled ?? true,
  );
  const [, setAccountPassword] = useState("");
  const [profileForm, setProfileForm] = useState(() => ({
    ...defaultProfile,
    ...(storedState?.profile ?? {}),
  }));
  const [dataNotice, setDataNotice] = useState("");

  useEffect(() => {
    saveStoredState({
      user: sanitizeUser(user),
      areas,
      tasks,
      profile: profileForm,
      settings: {
        themeMode,
        timeFormat,
        notificationsEnabled,
      },
    });
  }, [areas, notificationsEnabled, profileForm, tasks, themeMode, timeFormat, user]);

  // Primero se filtra por bloque para que Inicio, Tareas y Calendario compartan criterio.
  const areaFilteredTasks = useMemo(
    () => tasks.filter((task) => activeArea === "all" || task.areaId === activeArea),
    [activeArea, tasks],
  );

  // La busqueda incluye texto de tarea, descripcion, fecha, prioridad y nombre del bloque.
  const searchedTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return areaFilteredTasks.filter((task) => {
      const areaName = getAreaName(areas, task.areaId).toLowerCase();
      const text = `${task.title} ${task.description} ${task.dueDate} ${areaName} ${task.priority} ${task.recurrence}`.toLowerCase();

      return !normalizedQuery || text.includes(normalizedQuery);
    });
  }, [areaFilteredTasks, areas, query]);

  const filterCounts = useMemo(() => getTaskFilterCounts(searchedTasks), [searchedTasks]);

  const filteredTasks = useMemo(
    () => searchedTasks.filter((task) => taskMatchesFilter(task, taskFilter)),
    [searchedTasks, taskFilter],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId),
    [selectedTaskId, tasks],
  );

  const dueReminderTasks = useMemo(() => {
    if (!notificationsEnabled) {
      return [];
    }

    return tasks
      .filter((task) => task.gmailReminder && task.status === "pendiente")
      .sort((first, second) =>
        `${first.dueDate} ${first.startTime ?? first.dueTime ?? ""}`.localeCompare(
          `${second.dueDate} ${second.startTime ?? second.dueTime ?? ""}`,
        ),
      );
  }, [notificationsEnabled, tasks]);

  function getFreshTaskForm(overrides = {}) {
    return {
      ...defaultTaskForm,
      areaId: activeArea !== "all" ? activeArea : areas[0]?.id ?? defaultTaskForm.areaId,
      dueDate: getTodayKey(),
      ...overrides,
    };
  }

  function updateTaskForm(field, value) {
    setTaskForm((current) => ({ ...current, [field]: value }));
  }

  function handleLogin(account) {
    const nextUser = sanitizeUser(account);

    setUser(nextUser);
    setAccountPassword(account.password || "");
    setProfileForm((current) => ({
      ...current,
      username: nextUser.username || current.username,
      email: nextUser.email || current.email,
      phone: nextUser.phone || current.phone,
    }));
  }

  function openCreateTask(overrides = {}) {
    setEditingTaskId(null);
    setTaskForm(getFreshTaskForm(overrides));
    setIsTaskFormOpen(true);
  }

  function openCreateTaskForDate(dateKey) {
    openCreateTask({
      dueDate: dateKey,
      areaId: activeArea !== "all" ? activeArea : areas[0]?.id ?? defaultTaskForm.areaId,
    });
  }

  function openEditTask(task) {
    setEditingTaskId(task.id);
    setSelectedTaskId(null);
    setTaskForm(taskToForm(task));
    setActiveView("Tareas");
    setIsTaskFormOpen(true);
  }

  function closeTaskForm() {
    setIsTaskFormOpen(false);
    setEditingTaskId(null);
  }

  function saveTask() {
    const title = taskForm.title.trim();

    if (!title) {
      return;
    }

    const taskData = {
      title,
      description: taskForm.description.trim() || "Sin descripcion",
      areaId: taskForm.areaId,
      dueDate: taskForm.dueDate,
      startTime: taskForm.startTime,
      endTime: taskForm.endTime,
      dueTime: taskForm.endTime,
      priority: taskForm.priority,
      recurrence: taskForm.recurrence,
      gmailReminder: taskForm.gmailReminder,
    };

    if (editingTaskId) {
      setTasks((current) =>
        current.map((task) =>
          task.id === editingTaskId
            ? normalizeTask({
                ...task,
                ...taskData,
              })
            : task,
        ),
      );
    } else {
      setTasks((current) => [
        normalizeTask({
          id: Date.now(),
          ...taskData,
          status: "pendiente",
        }),
        ...current,
      ]);
    }

    setTaskForm(getFreshTaskForm());
    closeTaskForm();
    setTaskFilter("all");
    setActiveView("Tareas");
  }

  function setTaskStatus(taskId, status) {
    setTasks((current) => {
      const originalTask = current.find((task) => task.id === taskId);
      const shouldCreateNext =
        originalTask &&
        status === "completada" &&
        originalTask.status !== "completada" &&
        isRecurringTask(originalTask) &&
        !originalTask.nextOccurrenceCreated;

      const updatedTasks = current.map((task) =>
        task.id === taskId
          ? normalizeTask({
              ...task,
              status,
              nextOccurrenceCreated: shouldCreateNext ? true : task.nextOccurrenceCreated,
            })
          : task,
      );

      if (!shouldCreateNext) {
        return updatedTasks;
      }

      const nextTask = normalizeTask({
        ...originalTask,
        id: Date.now() + 1,
        dueDate: getNextRecurrenceDate(originalTask.dueDate, originalTask.recurrence),
        status: "pendiente",
        nextOccurrenceCreated: false,
        sourceTaskId: originalTask.sourceTaskId ?? originalTask.id,
      });

      return [nextTask, ...updatedTasks];
    });
  }

  function requestDeleteTask(taskId) {
    const task = tasks.find((currentTask) => currentTask.id === taskId);

    if (!task) {
      return;
    }

    setDeleteConfirmation({
      type: "task",
      id: task.id,
      title: task.title,
    });
  }

  function addArea() {
    const name = newAreaName.trim();
    if (!name) {
      return;
    }

    const baseId = toAreaId(name);
    let id = baseId;
    let suffix = 2;

    while (areas.some((area) => area.id === id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const colors = ["#1f6feb", "#2f9e44", "#7c3f92", "#be3a34", "#315c9f"];
    const color = colors[areas.length % colors.length];

    setAreas((current) => [...current, { id, name, color }]);
    setTaskForm((current) => ({ ...current, areaId: id }));
    setActiveArea(id);
    setNewAreaName("");
  }

  function requestDeleteArea(areaId) {
    const area = areas.find((currentArea) => currentArea.id === areaId);

    if (!area) {
      return;
    }

    if (areas.length === 1) {
      window.alert("Debes mantener al menos un bloque para crear tareas.");
      return;
    }

    const relatedTasksCount = tasks.filter((task) => task.areaId === areaId).length;
    setDeleteConfirmation({
      type: "area",
      id: area.id,
      title: area.name,
      relatedTasksCount,
    });
  }

  function closeDeleteConfirmation() {
    setDeleteConfirmation(null);
  }

  function confirmDelete() {
    if (!deleteConfirmation) {
      return;
    }

    if (deleteConfirmation.type === "task") {
      setTasks((current) => current.filter((task) => task.id !== deleteConfirmation.id));
      closeDeleteConfirmation();
      return;
    }

    const remainingAreas = areas.filter((currentArea) => currentArea.id !== deleteConfirmation.id);

    setAreas(remainingAreas);
    setTasks((current) => current.filter((task) => task.areaId !== deleteConfirmation.id));
    setActiveArea((current) => (current === deleteConfirmation.id ? "all" : current));
    setTaskForm((current) => ({
      ...current,
      areaId:
        current.areaId === deleteConfirmation.id ? remainingAreas[0].id : current.areaId,
    }));
    closeDeleteConfirmation();
  }

  // Elegir un bloque desde la barra lateral tambien lleva a la vista de tareas.
  function handleSidebarAreaChange(areaId) {
    setActiveArea(areaId);
    setQuery("");
    setTaskFilter("all");
    setActiveView("Tareas");
  }

  function openTasksForArea(areaId) {
    setActiveArea(areaId);
    setQuery("");
    setTaskFilter("all");
    setActiveView("Tareas");
  }

  function openTasksWithFilter(filter) {
    setQuery("");
    setTaskFilter(filter);
    setActiveView("Tareas");
  }

  function openTaskDirectly(task) {
    setActiveArea(task.areaId);
    setQuery("");
    setTaskFilter("all");
    setSelectedTaskId(task.id);
    setIsNotificationsOpen(false);
    setActiveView("Tareas");
  }

  function updateProfileField(field, value) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function saveProfile() {
    setUser((current) => ({
      ...(current ?? {}),
      name: profileForm.username,
      username: profileForm.username,
      email: profileForm.email,
      phone: profileForm.phone,
    }));
  }

  function moveCalendarMonth(offset) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function exportData(format) {
    const dateKey = getTodayKey();

    if (format === "csv") {
      downloadTextFile(
        `dayflow-tareas-${dateKey}.csv`,
        buildTasksCsv(tasks, areas),
        "text/csv;charset=utf-8",
      );
      setDataNotice("CSV exportado correctamente.");
      return;
    }

    const payload = createExportPayload({
      areas,
      tasks,
      profile: profileForm,
      settings: {
        themeMode,
        timeFormat,
        notificationsEnabled,
      },
    });

    downloadTextFile(
      `dayflow-respaldo-${dateKey}.json`,
      JSON.stringify(payload, null, 2),
      "application/json;charset=utf-8",
    );
    setDataNotice("Respaldo JSON exportado correctamente.");
  }

  function importData(file) {
    if (!file) {
      return;
    }

    const shouldImport = window.confirm(
      "Importar este archivo reemplazara tus tareas y bloques actuales. Continuar?",
    );

    if (!shouldImport) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const importedData = parseImportedData(String(reader.result || ""), file.name, areas);
        const nextAreas = importedData.areas?.length ? importedData.areas : initialAreas;

        setAreas(nextAreas);
        setTasks(normalizeTasks(importedData.tasks));
        setActiveArea("all");
        setTaskFilter("all");
        setQuery("");

        if (importedData.profile) {
          setProfileForm((current) => ({ ...current, ...importedData.profile }));
        }

        if (importedData.settings) {
          setThemeMode(importedData.settings.themeMode ?? themeMode);
          setTimeFormat(importedData.settings.timeFormat ?? timeFormat);
          setNotificationsEnabled(importedData.settings.notificationsEnabled ?? notificationsEnabled);
        }

        setTaskForm((current) => ({ ...current, areaId: nextAreas[0]?.id ?? defaultTaskForm.areaId }));
        setDataNotice(`Importadas ${importedData.tasks.length} tarea(s).`);
      } catch (error) {
        setDataNotice(error instanceof Error ? error.message : "No se pudo importar el archivo.");
      }
    };

    reader.onerror = () => {
      setDataNotice("No se pudo leer el archivo.");
    };

    reader.readAsText(file);
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className={`app-shell theme-${themeMode}`}>
      <Sidebar
        activeView={activeView}
        onChangeView={setActiveView}
        areas={areas}
        activeArea={activeArea}
        onAreaChange={handleSidebarAreaChange}
        newAreaName={newAreaName}
        onNewAreaName={setNewAreaName}
        onAddArea={addArea}
        onDeleteArea={requestDeleteArea}
        user={user}
        onLogout={() => setUser(null)}
      />
      <main className="main-content">
        {activeView !== "Ajustes" && (
          <Header
            query={query}
            onQueryChange={setQuery}
            onCreateTask={() => {
              setActiveView("Tareas");
              openCreateTask();
            }}
            alertsCount={dueReminderTasks.length}
            reminders={dueReminderTasks}
            onOpenReminder={openTaskDirectly}
            isNotificationsOpen={isNotificationsOpen}
            onToggleNotifications={() => setIsNotificationsOpen((current) => !current)}
            showSearch={activeView === "Tareas"}
            timeFormat={timeFormat}
          />
        )}

        {activeView === "Inicio" && (
          <HomeView
            tasks={tasks}
            areas={areas}
            reminders={dueReminderTasks}
            onChangeView={setActiveView}
            onSelectArea={openTasksForArea}
            onApplyFilter={openTasksWithFilter}
            onOpenTask={openTaskDirectly}
            timeFormat={timeFormat}
          />
        )}

        {activeView === "Tareas" && (
          <>
            <Filters activeFilter={taskFilter} onFilterChange={setTaskFilter} counts={filterCounts} />

            <div className="content-stack">
              <TaskList
                tasks={filteredTasks}
                areas={areas}
                onOpenTask={(task) => setSelectedTaskId(task.id)}
                timeFormat={timeFormat}
              />
            </div>
          </>
        )}

        {activeView === "Calendario" && (
          <CalendarView
            tasks={areaFilteredTasks}
            areas={areas}
            monthDate={calendarMonth}
            onPreviousMonth={() => moveCalendarMonth(-1)}
            onNextMonth={() => moveCalendarMonth(1)}
            onToday={() =>
              setCalendarMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
            }
            onCreateTaskOnDate={openCreateTaskForDate}
            onOpenTask={openTaskDirectly}
            timeFormat={timeFormat}
          />
        )}

        {activeView === "Ajustes" && (
          <SettingsView
            themeMode={themeMode}
            onThemeModeChange={setThemeMode}
            profile={profileForm}
            onProfileChange={updateProfileField}
            onSaveProfile={saveProfile}
            notificationsEnabled={notificationsEnabled}
            onNotificationsEnabledChange={setNotificationsEnabled}
            onPasswordChange={setAccountPassword}
            timeFormat={timeFormat}
            onTimeFormatChange={setTimeFormat}
            tasksCount={tasks.length}
            areasCount={areas.length}
            onExportData={exportData}
            onImportData={importData}
            dataNotice={dataNotice}
          />
        )}
      </main>

      {isTaskFormOpen && (
        <div className="task-modal-backdrop" role="dialog" aria-modal="true">
          <TaskForm
            areas={areas}
            form={taskForm}
            isEditing={Boolean(editingTaskId)}
            onChange={updateTaskForm}
            onSubmit={saveTask}
            onClose={closeTaskForm}
          />
        </div>
      )}

      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          areas={areas}
          timeFormat={timeFormat}
          onClose={() => setSelectedTaskId(null)}
          onSetStatus={setTaskStatus}
          onDeleteTask={requestDeleteTask}
          onEditTask={openEditTask}
        />
      )}

      {deleteConfirmation && (
        <div className="confirmation-backdrop" role="dialog" aria-modal="true">
          <section className="panel confirmation-dialog" aria-labelledby="delete-confirmation-title">
            <span className="confirmation-icon">
              <AlertTriangle size={22} />
            </span>
            <div className="confirmation-copy">
              <p className="eyebrow">
                {deleteConfirmation.type === "area" ? "Eliminar bloque" : "Eliminar tarea"}
              </p>
              <h2 id="delete-confirmation-title">
                {deleteConfirmation.type === "area"
                  ? `Eliminar "${deleteConfirmation.title}"`
                  : `Eliminar "${deleteConfirmation.title}"`}
              </h2>
              <p>
                {deleteConfirmation.type === "area"
                  ? `Tambien se eliminaran ${deleteConfirmation.relatedTasksCount} tarea(s) dentro de este bloque.`
                  : "Esta tarea saldra de tu lista y no se podra recuperar desde la app."}
              </p>
            </div>
            <div className="confirmation-actions">
              <button className="outline-button" type="button" onClick={closeDeleteConfirmation}>
                Cancelar
              </button>
              <button className="danger-button" type="button" onClick={confirmDelete}>
                <Trash2 size={17} />
                Eliminar
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
