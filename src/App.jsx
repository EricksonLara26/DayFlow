
import { useMemo, useState } from "react";
import MainLayout from "./components/layout/MainLayout";
import { TICKET_STATUSES, initialTickets } from "./data/tickets";
import {
  ROLES,
  getUserFullName,
  initialUsers,
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
import { getStatusLabel, terminalTicketStatuses } from "./utils/ticketUtils";

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
  return isTechnicianUser(user) ? "dashboard" : "tickets";
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

  const isTechnician = isTechnicianUser(currentUser);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedTicketId),
    [selectedTicketId, tickets],
  );

  function navigate(view) {
    if (view === "dashboard" && !isTechnician) {
      setActiveView("tickets");
      return;
    }

    if ((view === "profile" || view === "users" || view === "information") && !isTechnician) {
      setActiveView("tickets");
      return;
    }

    setSelectedTicketId(null);
    setActiveView(view);
  }

  function handleLogin({ password, userType, username }) {
    const normalizedUsername = username.trim().toLowerCase();
    const matchedUser = users.find(
      (user) => user.username.toLowerCase() === normalizedUsername && user.password === password,
    );

    if (!matchedUser) {
      return { ok: false, message: "Usuario o contrasena incorrectos." };
    }

    const matchesSelectedRole =
      userType === ROLES.EMPLOYEE ? matchedUser.role === ROLES.EMPLOYEE : isTechnicianUser(matchedUser);

    if (!matchesSelectedRole) {
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

  function openTicket(ticketId) {
    setSelectedTicketId(ticketId);
    setActiveView("ticket-detail");
  }

  function goBackFromTicket() {
    setSelectedTicketId(null);
    setActiveView(isTechnician ? "tickets" : "tickets");
  }

  function canTakeTicket(ticket) {
    return Boolean(isTechnician && ticket.status === TICKET_STATUSES.OPEN && !ticket.assignedTo);
  }

  function canManageTicket(ticket) {
    if (!isTechnician || terminalTicketStatuses.includes(ticket.status)) {
      return false;
    }

    return !ticket.assignedTo || ticket.assignedTo === currentUser.id;
  }

  function canCommentTicket(ticket) {
    if (!currentUser) {
      return false;
    }

    return isTechnician || ticket.createdBy === currentUser.id;
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
          ? "Ticket desestimado por area tecnica"
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
    if (!currentUser) {
      return;
    }

    const timestamp = nowIso();
    const requester = form.requester ?? currentUser;
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
  }

  function createUser(form) {
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
    if (currentUser?.id === userId) {
      return;
    }

    setUsers((currentUsers) => currentUsers.filter((user) => user.id !== userId));
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
      currentUser={currentUser}
      darkMode={preferences.darkMode}
      navigationMode={preferences.navigationMode}
      onCreateTicket={() => navigate("create-ticket")}
      onLogout={handleLogout}
      onNavigate={navigate}
    >
      {activeView === "dashboard" && isTechnician ? (
        <Dashboard onOpenTicket={openTicket} tickets={tickets} />
      ) : null}

      {activeView === "tickets" ? (
        <Tickets
          canTakeTicket={canTakeTicket}
          currentUser={currentUser}
          isTechnician={isTechnician}
          onOpenTicket={openTicket}
          onTakeTicket={takeTicket}
          tickets={tickets}
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

      {activeView === "create-ticket" ? (
        <CreateTicket currentUser={currentUser} onCreateTicket={createTicket} users={users} />
      ) : null}

      {activeView === "profile" && isTechnician ? (
        <TechnicianProfile currentUser={currentUser} onOpenTicket={openTicket} tickets={tickets} />
      ) : null}

      {activeView === "information" && isTechnician ? (
        <InformationPanel onOpenTicket={openTicket} tickets={tickets} users={users} />
      ) : null}

      {activeView === "users" && isTechnician ? (
        <Users onCreateUser={createUser} onDeleteUser={deleteUser} users={users} />
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
