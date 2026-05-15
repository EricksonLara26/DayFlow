import { useMemo, useState } from "react";
import TechnicianRanking from "./components/dashboard/TechnicianRanking";
import MainLayout from "./components/layout/MainLayout";
import { TICKET_STATUSES, initialTickets } from "./data/tickets";
import {
  ROLES,
  getUserFullName,
  initialUsers,
  isEmployeeUser,
  isSupervisorUser,
  isTechnicianUser,
} from "./data/users";
import CreateTicket from "./pages/CreateTicket/CreateTicket";
import Dashboard from "./pages/Dashboard/Dashboard";
import InformationPanel from "./pages/InformationPanel/InformationPanel";
import Login from "./pages/Login/Login";
import Settings from "./pages/Settings/Settings";
import TechnicianProfile from "./pages/TechnicianProfile/TechnicianProfile";
import TicketDetailPage from "./pages/TicketDetail/TicketDetail";
import Tickets from "./pages/Tickets/Tickets";
import Users from "./pages/Users/Users";
import {
  getStatusLabel,
  getTechnicianCompletionStats,
  terminalTicketStatuses,
} from "./utils/ticketUtils";

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

function getDefaultView(user) {
  return isTechnicianUser(user) || isSupervisorUser(user) ? "dashboard" : "tickets";
}

function getTicketScope(user) {
  if (isSupervisorUser(user)) {
    return "supervisor";
  }

  if (isTechnicianUser(user)) {
    return "technician";
  }

  return "employee";
}

function getVisibleTicketsForUser(tickets, user) {
  if (!user) {
    return [];
  }

  if (isSupervisorUser(user)) {
    return tickets;
  }

  if (isTechnicianUser(user)) {
    return tickets.filter((ticket) => {
      const isAvailable = ticket.status === TICKET_STATUSES.OPEN && !ticket.assignedTo;
      const isAssignedToTechnician = ticket.assignedTo === user.id;

      return isAvailable || isAssignedToTechnician;
    });
  }

  return tickets.filter((ticket) => ticket.createdBy === user.id);
}

const defaultPreferences = {
  darkMode: false,
  navigationMode: "sidebar",
};

function readStoredPreferences() {
  try {
    const rawPreferences = window.localStorage.getItem("dayflow-preferences");
    const parsedPreferences = rawPreferences ? JSON.parse(rawPreferences) : {};
    const navigationMode = ["sidebar", "top", "compact"].includes(parsedPreferences.navigationMode)
      ? parsedPreferences.navigationMode
      : defaultPreferences.navigationMode;

    return {
      darkMode: Boolean(parsedPreferences.darkMode),
      navigationMode,
    };
  } catch {
    return defaultPreferences;
  }
}

export default function App() {
  const [users, setUsers] = useState(initialUsers);
  const [tickets, setTickets] = useState(initialTickets);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [preferences, setPreferences] = useState(readStoredPreferences);

  const isEmployee = isEmployeeUser(currentUser);
  const isTechnician = isTechnicianUser(currentUser);
  const isSupervisor = isSupervisorUser(currentUser);
  const canCreateTicket = isEmployee;
  const ticketScope = getTicketScope(currentUser);
  const technicians = useMemo(() => users.filter(isTechnicianUser), [users]);
  const technicianRanking = useMemo(
    () => getTechnicianCompletionStats(technicians, tickets),
    [technicians, tickets],
  );
  const visibleTickets = useMemo(
    () => getVisibleTicketsForUser(tickets, currentUser),
    [currentUser, tickets],
  );
  const dashboardTickets = isSupervisor ? tickets : visibleTickets;

  const selectedTicket = useMemo(() => {
    const ticket = tickets.find((currentTicket) => currentTicket.id === selectedTicketId);

    return ticket && canViewTicket(ticket) ? ticket : null;
  }, [selectedTicketId, tickets, currentUser]);

  function canAccessView(view) {
    if (!currentUser) {
      return false;
    }

    if (view === "dashboard") {
      return isTechnician || isSupervisor;
    }

    if (view === "tickets" || view === "settings") {
      return true;
    }

    if (view === "create-ticket") {
      return canCreateTicket;
    }

    if (view === "profile") {
      return isTechnician;
    }

    if (view === "ranking") {
      return isTechnician || isSupervisor;
    }

    if (view === "information" || view === "users") {
      return isSupervisor;
    }

    return false;
  }

  function navigate(view) {
    const nextView = canAccessView(view) ? view : getDefaultView(currentUser);

    setSelectedTicketId(null);
    setActiveView(nextView);
  }

  function handleLogin({ password, userType, username }) {
    const normalizedUsername = username.trim().toLowerCase();
    const matchedUser = users.find(
      (user) => user.username.toLowerCase() === normalizedUsername && user.password === password,
    );

    if (!matchedUser) {
      return { ok: false, message: "Usuario o contrasena incorrectos." };
    }

    if (matchedUser.role !== userType) {
      return { ok: false, message: "El usuario no pertenece al tipo seleccionado." };
    }

    setCurrentUser(matchedUser);
    setSelectedTicketId(null);
    setActiveView(getDefaultView(matchedUser));

    return { ok: true };
  }

  function handleLogout() {
    setCurrentUser(null);
    setSelectedTicketId(null);
    setActiveView("dashboard");
  }

  function canViewTicket(ticket) {
    if (!currentUser || !ticket) {
      return false;
    }

    if (isSupervisor) {
      return true;
    }

    if (isTechnician) {
      const isAvailable = ticket.status === TICKET_STATUSES.OPEN && !ticket.assignedTo;
      return isAvailable || ticket.assignedTo === currentUser.id;
    }

    return ticket.createdBy === currentUser.id;
  }

  function openTicket(ticketId) {
    const ticket = tickets.find((currentTicket) => currentTicket.id === ticketId);

    if (!canViewTicket(ticket)) {
      return;
    }

    setSelectedTicketId(ticketId);
    setActiveView("ticket-detail");
  }

  function goBackFromTicket() {
    setSelectedTicketId(null);
    setActiveView("tickets");
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

    return ticket.assignedTo === currentUser.id;
  }

  function canCommentTicket(ticket) {
    if (!currentUser || !canViewTicket(ticket)) {
      return false;
    }

    if (isSupervisor) {
      return true;
    }

    if (isTechnician) {
      return ticket.assignedTo === currentUser.id;
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
    const action =
      nextStatus === TICKET_STATUSES.COMPLETED
        ? "Ticket completado"
        : nextStatus === TICKET_STATUSES.DISMISSED
          ? "Ticket desestimado por area tecnica"
          : `Estado cambiado a ${getStatusLabel(nextStatus)}`;

    setTickets((currentTickets) =>
      currentTickets.map((currentTicket) => {
        if (currentTicket.id !== ticketId) {
          return currentTicket;
        }

        return {
          ...currentTicket,
          status: nextStatus,
          updatedAt: timestamp,
          completedAt: shouldClose ? timestamp : currentTicket.completedAt,
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
    const requester = currentUser;
    const requesterName = getUserFullName(requester);
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
      dueDate: form.dueDate,
      completedAt: null,
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
    setActiveView("ticket-detail");

    return { ok: true };
  }

  function createUser(form) {
    if (!isSupervisor) {
      return;
    }

    const nextUser = {
      id: getNextId(users),
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      email: form.email,
      password: form.password,
      role: ROLES.EMPLOYEE,
      jobTitle: form.jobTitle,
      department: form.department,
    };

    setUsers((currentUsers) => [...currentUsers, nextUser]);
  }

  function deleteUser(userId) {
    const targetUser = users.find((user) => user.id === userId);

    if (!isSupervisor || currentUser?.id === userId || targetUser?.role !== ROLES.EMPLOYEE) {
      return;
    }

    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
  }

  function updateUserEmail(userId, email) {
    if (!isSupervisor) {
      return { ok: false, message: "No tienes permiso para editar usuarios." };
    }

    const targetUser = users.find((user) => user.id === userId);

    if (targetUser?.role !== ROLES.EMPLOYEE) {
      return { ok: false, message: "Solo se puede editar el correo de empleados desde esta vista." };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailPattern.test(cleanEmail) || !cleanEmail.endsWith(".com")) {
      return { ok: false, message: "El correo debe tener formato valido y terminar en .com." };
    }

    if (users.some((user) => user.id !== userId && user.email.toLowerCase() === cleanEmail)) {
      return { ok: false, message: "Ese correo ya esta en uso." };
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === userId ? { ...user, email: cleanEmail } : user)),
    );

    return { ok: true };
  }

  function authorizeTechnicianReport({ technicianId }) {
    if (!isSupervisor) {
      return { ok: false, message: "Solo el supervisor puede descargar informes." };
    }

    const technician = users.find((user) => user.id === Number(technicianId) && isTechnicianUser(user));

    if (!technician) {
      return { ok: false, message: "Selecciona un tecnico valido." };
    }

    return { ok: true };
  }

  function updatePreferences(nextPreferences) {
    setPreferences((currentPreferences) => {
      const updatedPreferences = { ...currentPreferences, ...nextPreferences };
      try {
        window.localStorage.setItem("dayflow-preferences", JSON.stringify(updatedPreferences));
      } catch {
        // La configuracion sigue activa durante la sesion aunque el navegador bloquee almacenamiento local.
      }
      return updatedPreferences;
    });
  }

  function changePassword({ confirmPassword, currentPassword, newPassword }) {
    if (!currentUser) {
      return { ok: false, message: "No hay una sesion activa." };
    }

    if (currentPassword !== currentUser.password) {
      return { ok: false, message: "La contrasena actual no coincide." };
    }

    const cleanPassword = newPassword.trim();

    if (cleanPassword.length < 4) {
      return { ok: false, message: "La nueva contrasena debe tener al menos 4 caracteres." };
    }

    if (cleanPassword !== confirmPassword.trim()) {
      return { ok: false, message: "La confirmacion no coincide." };
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) => (user.id === currentUser.id ? { ...user, password: cleanPassword } : user)),
    );
    setCurrentUser((user) => (user ? { ...user, password: cleanPassword } : user));

    return { ok: true };
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <MainLayout
      activeView={activeView}
      canCreateTicket={canCreateTicket}
      currentUser={currentUser}
      darkMode={preferences.darkMode}
      navigationMode={preferences.navigationMode}
      onCreateTicket={() => navigate("create-ticket")}
      onLogout={handleLogout}
      onNavigate={navigate}
    >
      {activeView === "dashboard" && (isTechnician || isSupervisor) ? (
        <Dashboard
          onOpenTicket={openTicket}
          scope={isTechnician ? "technician" : "supervisor"}
          technicianRanking={technicianRanking}
          tickets={dashboardTickets}
        />
      ) : null}

      {activeView === "tickets" ? (
        <Tickets
          canTakeTicket={canTakeTicket}
          onOpenTicket={openTicket}
          onTakeTicket={takeTicket}
          scope={ticketScope}
          tickets={visibleTickets}
          users={users}
        />
      ) : null}

      {activeView === "ticket-detail" ? (
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
      ) : null}

      {activeView === "create-ticket" && canCreateTicket ? (
        <CreateTicket currentUser={currentUser} onCreateTicket={createTicket} />
      ) : null}

      {activeView === "profile" && isTechnician ? (
        <TechnicianProfile
          currentUser={currentUser}
          onOpenSettings={() => navigate("settings")}
          onOpenTicket={openTicket}
          tickets={tickets}
        />
      ) : null}

      {activeView === "ranking" && (isTechnician || isSupervisor) ? (
        <div className="page-stack">
          <TechnicianRanking technicians={technicianRanking} />
        </div>
      ) : null}

      {activeView === "information" && isSupervisor ? (
        <InformationPanel
          canDownloadReports={isSupervisor}
          onAuthorizeReport={authorizeTechnicianReport}
          onOpenTicket={openTicket}
          tickets={tickets}
          users={users}
        />
      ) : null}

      {activeView === "users" && isSupervisor ? (
        <Users
          onCreateUser={createUser}
          onDeleteUser={deleteUser}
          onUpdateUserEmail={updateUserEmail}
          users={users}
        />
      ) : null}

      {activeView === "settings" ? (
        <Settings
          onChangePassword={changePassword}
          onUpdatePreferences={updatePreferences}
          preferences={preferences}
        />
      ) : null}
    </MainLayout>
  );
}
