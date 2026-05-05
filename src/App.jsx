import { useMemo, useState } from "react";
import AuthScreen from "./components/auth/AuthScreen";
import CalendarView from "./components/calendar/CalendarView";
import HomeView from "./components/home/HomeView";
import Header from "./components/layout/Header";
import Sidebar from "./components/layout/Sidebar";
import SettingsView from "./components/settings/SettingsView";
import Filters from "./components/tasks/Filters";
import TaskForm from "./components/tasks/TaskForm";
import TaskList from "./components/tasks/TaskList";
import { defaultTaskForm } from "./constants/taskForm";
import { initialAreas, initialTasks } from "./data/dayflowData";
import { getAreaName, toAreaId } from "./utils/areaUtils";

// App mantiene el estado principal y decide que vista debe renderizarse.
export default function App() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState("Inicio");
  const [areas, setAreas] = useState(initialAreas);
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [activeArea, setActiveArea] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 3, 1));
  const [themeMode, setThemeMode] = useState("light");
  const [timeFormat, setTimeFormat] = useState("automatic");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [profileForm, setProfileForm] = useState({
    username: "Erickson",
    email: "ericksonburgos26@gmail.com",
    phone: "",
  });

  // Primero se filtra por bloque para que Inicio, Tareas y Calendario compartan criterio.
  const areaFilteredTasks = useMemo(
    () => tasks.filter((task) => activeArea === "all" || task.areaId === activeArea),
    [activeArea, tasks],
  );

  // La busqueda incluye texto de tarea, descripcion, fecha y nombre del bloque.
  const searchedTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return areaFilteredTasks.filter((task) => {
      const areaName = getAreaName(areas, task.areaId).toLowerCase();
      const text = `${task.title} ${task.description} ${task.dueDate} ${areaName}`.toLowerCase();

      return !normalizedQuery || text.includes(normalizedQuery);
    });
  }, [areaFilteredTasks, areas, query]);

  const filteredTasks = useMemo(
    () => searchedTasks.filter((task) => statusFilter === "all" || task.status === statusFilter),
    [statusFilter, searchedTasks],
  );

  const dueReminderTasks = notificationsEnabled
    ? tasks.filter((task) => task.gmailReminder && task.status === "pendiente")
    : [];

  function updateTaskForm(field, value) {
    setTaskForm((current) => ({ ...current, [field]: value }));
  }

  function handleLogin(account) {
    setUser(account);
    setProfileForm((current) => ({
      ...current,
      username: account.username || account.name || current.username,
      email: account.email || current.email,
      phone: account.phone || current.phone,
    }));
  }

  function createTask() {
    if (!taskForm.title.trim()) {
      return;
    }

    setTasks((current) => [
      {
        id: Date.now(),
        title: taskForm.title.trim(),
        description: taskForm.description.trim() || "Sin descripción",
        areaId: taskForm.areaId,
        dueDate: taskForm.dueDate,
        startTime: taskForm.startTime,
        endTime: taskForm.endTime,
        dueTime: taskForm.endTime,
        status: "pendiente",
        gmailReminder: taskForm.gmailReminder,
      },
      ...current,
    ]);
    setTaskForm(defaultTaskForm);
    setIsTaskFormOpen(false);
    setActiveView("Tareas");
  }

  function setTaskStatus(taskId, status) {
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );
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

  function deleteArea(areaId) {
    const area = areas.find((currentArea) => currentArea.id === areaId);

    if (!area) {
      return;
    }

    if (areas.length === 1) {
      window.alert("Debes mantener al menos un bloque para crear tareas.");
      return;
    }

    const relatedTasksCount = tasks.filter((task) => task.areaId === areaId).length;
    const shouldDelete = window.confirm(
      `Eliminar "${area.name}" tambien eliminara ${relatedTasksCount} tarea(s) de ese bloque. ¿Continuar?`,
    );

    if (!shouldDelete) {
      return;
    }

    const remainingAreas = areas.filter((currentArea) => currentArea.id !== areaId);

    setAreas(remainingAreas);
    setTasks((current) => current.filter((task) => task.areaId !== areaId));
    setActiveArea((current) => (current === areaId ? "all" : current));
    setTaskForm((current) => ({
      ...current,
      areaId: current.areaId === areaId ? remainingAreas[0].id : current.areaId,
    }));
  }

  // Elegir un bloque desde la barra lateral tambien lleva a la vista de tareas.
  function handleSidebarAreaChange(areaId) {
    setActiveArea(areaId);
    setQuery("");

    if (activeView === "Inicio") {
      setActiveView("Tareas");
    }
  }

  function openTasksForArea(areaId) {
    setActiveArea(areaId);
    setQuery("");
    setActiveView("Tareas");
  }

  function updateProfileField(field, value) {
    setProfileForm((current) => ({ ...current, [field]: value }));
  }

  function saveProfile() {
    setUser((current) => ({
      ...current,
      email: profileForm.email,
      phone: profileForm.phone,
    }));
  }

  function moveCalendarMonth(offset) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
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
        onDeleteArea={deleteArea}
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
              setIsTaskFormOpen(true);
            }}
            alertsCount={dueReminderTasks.length}
            reminders={dueReminderTasks}
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
            timeFormat={timeFormat}
          />
        )}

        {activeView === "Tareas" && (
          <>
            <Filters statusFilter={statusFilter} onStatusFilterChange={setStatusFilter} />

            <div className="content-stack">
              <TaskList
                tasks={filteredTasks}
                areas={areas}
                onSetStatus={setTaskStatus}
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
            timeFormat={timeFormat}
            onTimeFormatChange={setTimeFormat}
          />
        )}
      </main>

      {isTaskFormOpen && (
        <div className="task-modal-backdrop" role="dialog" aria-modal="true">
          <TaskForm
            areas={areas}
            form={taskForm}
            onChange={updateTaskForm}
            onSubmit={createTask}
            onClose={() => setIsTaskFormOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
