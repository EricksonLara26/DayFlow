import { useEffect, useMemo, useState } from "react";
import TechnicianRanking from "./components/dashboard/TechnicianRanking";
import MainLayout from "./components/layout/MainLayout";
import {
  VIEW_IDS,
  canAccessView,
  canCreateTicket as canCreateTicketForUser,
  canCreateUser,
  canDeactivateUser,
  canDownloadReports,
  canEditUser,
  canResetUserPassword,
  getDefaultView,
} from "./config/permissions";
import { TICKET_STATUSES } from "./data/tickets";
import {
  ROLES,
  getUserFullName,
  isAdministratorUser,
  isTechnicianUser,
} from "./data/users";
import { initialTickets, initialUsers } from "./mocks";
import AccessDenied from "./pages/AccessDenied/AccessDenied";
import CreateTicket from "./pages/CreateTicket/CreateTicket";
import Dashboard from "./pages/Dashboard/Dashboard";
import InformationPanel from "./pages/InformationPanel/InformationPanel";
import Login from "./pages/Login/Login";
import Reports from "./pages/Reports/Reports";
import TechnicianProfile from "./pages/TechnicianProfile/TechnicianProfile";
import TicketDetailPage from "./pages/TicketDetail/TicketDetail";
import Tickets from "./pages/Tickets/Tickets";
import Users from "./pages/Users/Users";
import RoleBasedRoute from "./routes/RoleBasedRoute";
import { getTicketIdFromHash, getViewFromHash, setHashForTicket, setHashForView } from "./routes/routeConfig";
import {
  clearAuthenticatedUser,
  getStoredAuthenticatedUser,
  login as authLogin,
  storeAuthenticatedUser,
} from "./services/authService";
import {
  createLocalUser,
  deactivateLocalUser,
  resetLocalUserPassword,
  updateLocalUser,
} from "./services/userService";
import {
  getDashboardTicketsForUser,
  getTicketScopeForView,
  getTicketsForView,
} from "./services/ticketService";
import {
  getStatusLabel,
  getTechnicianCompletionStats,
  terminalTicketStatuses,
} from "./utils/ticketUtils";
import { parseDateKey } from "./utils/dateUtils";

function getNextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function nowIso() {
  return new Date().toISOString();
}

function createHistoryItem(ticket, action, user, createdAt = nowIso()) {
  return {
    id: getNextId(ticket.history ?? []),
    action,
    userId: user.id,
    userName: getUserFullName(user),
    createdAt,
  };
}

function createCommentItem(ticket, message, user, createdAt = nowIso()) {
  return {
    id: getNextId(ticket.comments ?? []),
    authorId: user.id,
    authorName: getUserFullName(user),
    role: user.role,
    message,
    createdAt,
  };
}

const defaultPreferences = {
  darkMode: false,
  navigationMode: "top",
};

function getSystemDarkModePreference() {
  return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
}

function readStoredPreferences() {
  try {
    const rawPreferences = window.localStorage.getItem("dayflow-preferences");
    const parsedPreferences = rawPreferences ? JSON.parse(rawPreferences) : {};

    const darkMode =
      parsedPreferences.darkMode !== undefined
        ? Boolean(parsedPreferences.darkMode)
        : getSystemDarkModePreference();

    return {
      darkMode,
      navigationMode: "top",
    };
  } catch {
    return defaultPreferences;
  }
}

function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email) && email.endsWith(".com");
}

export default function App() {
  const [users, setUsers] = useState(initialUsers);
  const [tickets, setTickets] = useState(initialTickets);
  const [currentUser, setCurrentUser] = useState(getStoredAuthenticatedUser);
  const [activeView, setActiveView] = useState(() => getViewFromHash() ?? VIEW_IDS.DASHBOARD);
  const [selectedTicketId, setSelectedTicketId] = useState(() => getTicketIdFromHash());
  const [preferences, setPreferences] = useState(readStoredPreferences);
  const [loginMessage, setLoginMessage] = useState("");

  const isTechnician = isTechnicianUser(currentUser);
  const isAdministrator = isAdministratorUser(currentUser);
  const canCreateTicket = canCreateTicketForUser(currentUser);
  const dashboardScope = isAdministrator ? "administrator" : isTechnician ? "technician" : "employee";
  const ticketScope = getTicketScopeForView(currentUser, activeView);
  const technicians = useMemo(
    () => users.filter((user) => isTechnicianUser(user) && user.active !== false),
    [users],
  );
  const technicianRanking = useMemo(
    () => getTechnicianCompletionStats(technicians, tickets),
    [technicians, tickets],
  );
  const visibleTickets = useMemo(
    () => getTicketsForView(tickets, currentUser, activeView),
    [activeView, currentUser, tickets],
  );
  const dashboardTickets = useMemo(
    () => getDashboardTicketsForUser(tickets, currentUser),
    [currentUser, tickets],
  );

  const selectedTicket = useMemo(() => {
    const ticket = tickets.find((currentTicket) => currentTicket.id === selectedTicketId);

    return ticket && canViewTicket(ticket) ? ticket : null;
  }, [selectedTicketId, tickets, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const requestedTicketId = getTicketIdFromHash();
    const requestedView = getViewFromHash() ?? getDefaultView(currentUser);
    const nextView = canAccessView(currentUser, requestedView) ? requestedView : VIEW_IDS.ACCESS_DENIED;
    setSelectedTicketId(nextView === VIEW_IDS.TICKET_DETAIL ? requestedTicketId : null);
    setActiveView(nextView);
    if (nextView === VIEW_IDS.TICKET_DETAIL && requestedTicketId) {
      setHashForTicket(requestedTicketId);
      return;
    }

    setHashForView(nextView);
  }, [currentUser]);

  useEffect(() => {
    function handleHashChange() {
      if (!currentUser) {
        return;
      }

      const requestedTicketId = getTicketIdFromHash();
      const requestedView = getViewFromHash() ?? getDefaultView(currentUser);
      const nextView = canAccessView(currentUser, requestedView) ? requestedView : VIEW_IDS.ACCESS_DENIED;
      setSelectedTicketId(nextView === VIEW_IDS.TICKET_DETAIL ? requestedTicketId : null);
      setActiveView(nextView);

      if (nextView === VIEW_IDS.ACCESS_DENIED) {
        setHashForView(VIEW_IDS.ACCESS_DENIED);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentUser]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

    if (!mediaQuery?.addEventListener) {
      return undefined;
    }

    function handleSystemThemeChange(event) {
      if (window.localStorage.getItem("dayflow-preferences")) {
        return;
      }

      setPreferences((currentPreferences) => ({
        ...currentPreferences,
        darkMode: event.matches,
      }));
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  function navigate(view) {
    const nextView = canAccessView(currentUser, view) ? view : VIEW_IDS.ACCESS_DENIED;

    setSelectedTicketId(null);
    setActiveView(nextView);
    setHashForView(nextView);
  }

  function handleLogin(form) {
    const result = authLogin(form, users);

    if (!result.ok) {
      return result;
    }

    const nextView = getDefaultView(result.user);
    setCurrentUser(result.user);
    setSelectedTicketId(null);
    setActiveView(nextView);
    setHashForView(nextView);
    setLoginMessage("");

    return { ok: true };
  }

  function handleLogout() {
    clearAuthenticatedUser();
    setCurrentUser(null);
    setSelectedTicketId(null);
    setActiveView(VIEW_IDS.DASHBOARD);
    setLoginMessage("Sesión cerrada correctamente.");
  }

  function canViewTicket(ticket) {
    if (!currentUser || !ticket) {
      return false;
    }

    if (isAdministrator || isTechnician) {
      return true;
    }

    return ticket.createdBy === currentUser.id;
  }

  function openTicket(ticketId) {
    const ticket = tickets.find((currentTicket) => currentTicket.id === ticketId);

    if (!canViewTicket(ticket)) {
      navigate(VIEW_IDS.ACCESS_DENIED);
      return;
    }

    setSelectedTicketId(ticketId);
    setActiveView(VIEW_IDS.TICKET_DETAIL);
    setHashForTicket(ticketId);
  }

  function goBackFromTicket() {
    setSelectedTicketId(null);
    navigate(VIEW_IDS.TICKETS);
  }

  function canTakeTicket(ticket) {
    return Boolean(
      isTechnician &&
      canViewTicket(ticket) &&
      ticket.status === TICKET_STATUSES.OPEN &&
      !ticket.assignedTo,
    );
  }

  function canManageTicket(ticket) {
    if (!isTechnician || !canViewTicket(ticket) || terminalTicketStatuses.includes(ticket.status)) {
      return false;
    }

    return !ticket.assignedTo || ticket.assignedTo === currentUser.id;
  }

  function canCommentTicket(ticket) {
    if (!currentUser || !canViewTicket(ticket)) {
      return false;
    }

    if (isAdministrator || isTechnician) {
      return true;
    }

    return ticket.createdBy === currentUser.id;
  }

  function takeTicket(ticketId) {
    if (!currentUser || !isTechnician) {
      return;
    }

    const timestamp = nowIso();
    setTickets((currentTickets) =>
      currentTickets.map((ticket) => {
        if (ticket.id !== ticketId || !canTakeTicket(ticket)) {
          return ticket;
        }

        const assignedName = getUserFullName(currentUser);
        const nextHistoryId = getNextId(ticket.history);

        return {
          ...ticket,
          assignedTo: currentUser.id,
          assignedToName: assignedName,
          status: TICKET_STATUSES.IN_PROGRESS,
          takenAt: timestamp,
          updatedAt: timestamp,
          history: [
            ...ticket.history,
            {
              id: nextHistoryId,
              action: `Ticket tomado por ${assignedName}`,
              userId: currentUser.id,
              userName: assignedName,
              createdAt: timestamp,
            },
            {
              id: nextHistoryId + 1,
              action: "Estado cambiado a En proceso",
              userId: currentUser.id,
              userName: assignedName,
              createdAt: timestamp,
            },
          ],
        };
      }),
    );
  }

  function changeTicketStatus(ticketId, nextStatus) {
    if (!currentUser || !isTechnician) {
      return;
    }

    const ticket = tickets.find((currentTicket) => currentTicket.id === ticketId);

    if (!ticket || !canManageTicket(ticket)) {
      return;
    }

    const timestamp = nowIso();
    const shouldClose = nextStatus === TICKET_STATUSES.COMPLETED || nextStatus === TICKET_STATUSES.DISMISSED;
    const assignedTo = ticket.assignedTo ?? currentUser.id;
    const assignedToName = ticket.assignedToName ?? getUserFullName(currentUser);
    const action =
      nextStatus === TICKET_STATUSES.COMPLETED
        ? "Ticket completado"
        : nextStatus === TICKET_STATUSES.DISMISSED
          ? "Ticket desestimado por área técnica"
          : `Estado cambiado a ${getStatusLabel(nextStatus)}`;

    setTickets((currentTickets) =>
      currentTickets.map((currentTicket) => {
        if (currentTicket.id !== ticketId) {
          return currentTicket;
        }

        return {
          ...currentTicket,
          assignedTo,
          assignedToName,
          status: nextStatus,
          takenAt: currentTicket.takenAt ?? (!currentTicket.assignedTo ? timestamp : currentTicket.takenAt),
          updatedAt: timestamp,
          closedAt: shouldClose ? timestamp : currentTicket.closedAt,
          history: [...currentTicket.history, createHistoryItem(currentTicket, action, currentUser, timestamp)],
        };
      }),
    );
  }

  function addComment(ticketId, message) {
    if (!currentUser) {
      return;
    }

    const ticket = tickets.find((currentTicket) => currentTicket.id === ticketId);

    if (!ticket || !canCommentTicket(ticket)) {
      return;
    }

    const timestamp = nowIso();
    setTickets((currentTickets) =>
      currentTickets.map((currentTicket) => {
        if (currentTicket.id !== ticketId) {
          return currentTicket;
        }

        return {
          ...currentTicket,
          comments: [...currentTicket.comments, createCommentItem(currentTicket, message, currentUser, timestamp)],
          history: [
            ...currentTicket.history,
            createHistoryItem(
              currentTicket,
              `Comentario agregado por ${getUserFullName(currentUser)}`,
              currentUser,
              timestamp,
            ),
          ],
          updatedAt: timestamp,
        };
      }),
    );
  }

  function createTicket(form) {
    if (!currentUser || !canCreateTicket) {
      return { ok: false, message: "No tienes permiso para crear solicitudes." };
    }

    const timestamp = nowIso();
    const requester = form.requester ?? currentUser;
    const requesterName = getUserFullName(requester);
    const dueDate = form.dueDate?.trim();

    if (!parseDateKey(dueDate)) {
      return { ok: false, message: "Selecciona una fecha límite válida." };
    }

    const nextTicket = {
      id: getNextId(tickets),
      title: form.title,
      description: form.description,
      category: form.category,
      status: TICKET_STATUSES.OPEN,
      priority: form.priority,
      createdBy: requester.id,
      createdByName: requesterName,
      assignedTo: null,
      assignedToName: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      dueDate,
      closedAt: null,
      comments: [],
      history: [
        {
          id: 1,
          action: `Ticket creado por ${requesterName}`,
          userId: requester.id,
          userName: requesterName,
          createdAt: timestamp,
        },
      ],
    };

    setTickets((currentTickets) => [nextTicket, ...currentTickets]);
    setSelectedTicketId(nextTicket.id);
    setActiveView(VIEW_IDS.TICKET_DETAIL);
    setHashForTicket(nextTicket.id);

    return { ok: true };
  }

  function createUser(form) {
    if (!canCreateUser(currentUser)) {
      return { ok: false, message: "No tienes permisos para crear usuarios." };
    }

    if (users.some((user) => user.username.toLowerCase() === form.username.trim().toLowerCase())) {
      return { ok: false, message: "Ese nombre de usuario ya existe." };
    }

    if (users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
      return { ok: false, message: "Ese correo ya está en uso." };
    }

    setUsers((currentUsers) => createLocalUser(currentUsers, form));

    return { ok: true, message: "Usuario creado correctamente." };
  }

  function updateUser(userId, form) {
    const targetUser = users.find((user) => user.id === userId);

    if (!canEditUser(currentUser, targetUser)) {
      return { ok: false, message: "No tienes permisos para modificar este usuario." };
    }

    const cleanEmail = form.email.trim().toLowerCase();

    if (!validateEmail(cleanEmail)) {
      return { ok: false, message: "El correo debe tener formato válido y terminar en .com." };
    }

    if (users.some((user) => user.id !== userId && user.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: "Ese correo ya está en uso." };
    }

    const cleanFirstName = form.firstName.trim();
    const cleanLastName = form.lastName.trim();
    const cleanPosition = form.position.trim();
    const cleanDepartment = form.department.trim();

    if (!cleanFirstName || !cleanLastName || !cleanPosition || !cleanDepartment) {
      return { ok: false, message: "Nombre, apellido, cargo y departamento son obligatorios." };
    }

    const nextRole =
      currentUser.role === ROLES.ADMINISTRATOR && currentUser.id !== userId
        ? form.role
        : targetUser.role;

    const nextUsers = updateLocalUser(users, userId, {
      firstName: cleanFirstName,
      lastName: cleanLastName,
      email: cleanEmail,
      position: cleanPosition,
      department: cleanDepartment,
      role: nextRole,
    });

    setUsers(nextUsers);

    if (currentUser.id === userId) {
      const updatedSessionUser = nextUsers.find((user) => user.id === userId);
      setCurrentUser(storeAuthenticatedUser(updatedSessionUser));
    }

    return { ok: true, message: "Usuario actualizado correctamente." };
  }

  function deactivateUser(userId) {
    const targetUser = users.find((user) => user.id === userId);

    if (!canDeactivateUser(currentUser, targetUser)) {
      return { ok: false, message: "No tienes permisos para desactivar este usuario." };
    }

    setUsers((currentUsers) => deactivateLocalUser(currentUsers, userId));

    return { ok: true, message: "Usuario desactivado correctamente." };
  }

  function resetPassword(userId) {
    const targetUser = users.find((user) => user.id === userId);

    if (!canResetUserPassword(currentUser, targetUser)) {
      return { ok: false, message: "No tienes permisos para restablecer esta contraseña." };
    }

    setUsers((currentUsers) => resetLocalUserPassword(currentUsers, userId));

    return { ok: true, message: "Contraseña restablecida correctamente." };
  }

  function authorizeTechnicianReport({ technicianId }) {
    if (!canDownloadReports(currentUser)) {
      return { ok: false, message: "Solo el administrador puede descargar informes." };
    }

    const technician = users.find((user) => user.id === Number(technicianId) && isTechnicianUser(user));

    if (!technician) {
      return { ok: false, message: "Selecciona un técnico válido." };
    }

    return { ok: true };
  }

  function updatePreferences(nextPreferences) {
    setPreferences((currentPreferences) => {
      const updatedPreferences = { ...currentPreferences, ...nextPreferences };
      try {
        window.localStorage.setItem("dayflow-preferences", JSON.stringify(updatedPreferences));
      } catch {
        // La configuración sigue activa durante la sesión aunque el navegador bloquee almacenamiento local.
      }
      return updatedPreferences;
    });
  }

  function changePassword({ confirmPassword, currentPassword, newPassword }) {
    if (!currentUser) {
      return { ok: false, message: "No hay una sesión activa." };
    }

    const fullUser = users.find((user) => user.id === currentUser.id);

    if (!fullUser || currentPassword !== fullUser.password) {
      return { ok: false, message: "La contraseña actual no coincide." };
    }

    const cleanPassword = newPassword.trim();

    if (cleanPassword.length < 4) {
      return { ok: false, message: "La nueva contraseña debe tener al menos 4 caracteres." };
    }

    if (cleanPassword !== confirmPassword.trim()) {
      return { ok: false, message: "La confirmación no coincide." };
    }

    setUsers((currentUsers) => resetLocalUserPassword(currentUsers, currentUser.id, cleanPassword));

    return { ok: true };
  }

  function renderActiveView() {
    if (activeView === VIEW_IDS.ACCESS_DENIED) {
      return <AccessDenied onGoHome={() => navigate(getDefaultView(currentUser))} />;
    }

    if (activeView === VIEW_IDS.DASHBOARD) {
      return (
        <Dashboard
          onOpenTicket={openTicket}
          scope={dashboardScope}
          technicianRanking={technicianRanking}
          tickets={dashboardTickets}
        />
      );
    }

    if (
      activeView === VIEW_IDS.TICKETS ||
      activeView === VIEW_IDS.AVAILABLE_TICKETS ||
      activeView === VIEW_IDS.MY_TICKETS ||
      activeView === VIEW_IDS.HISTORY
    ) {
      return (
        <Tickets
          canTakeTicket={canTakeTicket}
          onOpenTicket={openTicket}
          onTakeTicket={takeTicket}
          scope={ticketScope}
          tickets={visibleTickets}
          users={users}
        />
      );
    }

    if (activeView === VIEW_IDS.TICKET_DETAIL) {
      return (
        <TicketDetailPage
          canCommentTicket={canCommentTicket}
          canManageTicket={canManageTicket}
          canTakeTicket={canTakeTicket}
          onAddComment={addComment}
          onBack={goBackFromTicket}
          onChangeStatus={changeTicketStatus}
          onTakeTicket={takeTicket}
          ticket={selectedTicket}
        />
      );
    }

    if (activeView === VIEW_IDS.CREATE_TICKET) {
      return <CreateTicket currentUser={currentUser} onCreateTicket={createTicket} />;
    }

    if (activeView === VIEW_IDS.PROFILE) {
      return (
        <TechnicianProfile
          currentUser={currentUser}
          onChangePassword={changePassword}
          onOpenTicket={openTicket}
          onUpdatePreferences={updatePreferences}
          preferences={preferences}
          tickets={tickets}
        />
      );
    }

    if (activeView === VIEW_IDS.RANKING) {
      return (
        <div className="page-stack">
          <TechnicianRanking technicians={technicianRanking} />
        </div>
      );
    }

    if (activeView === VIEW_IDS.INFORMATION) {
      return (
        <InformationPanel
          canDownloadReports={canDownloadReports(currentUser)}
          onAuthorizeReport={authorizeTechnicianReport}
          onOpenTicket={openTicket}
          tickets={tickets}
          users={users}
        />
      );
    }

    if (activeView === VIEW_IDS.REPORTS) {
      return <Reports onAuthorizeReport={authorizeTechnicianReport} tickets={tickets} users={users} />;
    }

    if (activeView === VIEW_IDS.USERS) {
      return (
        <Users
          currentUser={currentUser}
          onCreateUser={createUser}
          onDeactivateUser={deactivateUser}
          onResetPassword={resetPassword}
          onUpdateUser={updateUser}
          users={users}
        />
      );
    }

    return <AccessDenied onGoHome={() => navigate(getDefaultView(currentUser))} />;
  }

  if (!currentUser) {
    return (
      <div className={preferences.darkMode ? "theme-dark" : ""}>
        <Login message={loginMessage} onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <MainLayout
      activeView={activeView}
      canCreateTicket={canCreateTicket}
      currentUser={currentUser}
      darkMode={preferences.darkMode}
      navigationMode="top"
      onCreateTicket={() => navigate(VIEW_IDS.CREATE_TICKET)}
      onLogout={handleLogout}
      onNavigate={navigate}
    >
      <RoleBasedRoute
        currentUser={currentUser}
        fallback={<AccessDenied onGoHome={() => navigate(getDefaultView(currentUser))} />}
        view={activeView}
      >
        {renderActiveView()}
      </RoleBasedRoute>
    </MainLayout>
  );
}
