import { useEffect, useMemo, useRef, useState } from "react";
import TechnicianRanking from "../components/dashboard/TechnicianRanking";
import MainLayout from "../components/layout/MainLayout";
import { VIEW_IDS, getDefaultView } from "../config/permissions";
import AccessDenied from "../pages/AccessDenied/AccessDenied";
import CreateTicket from "../pages/CreateTicket/CreateTicket";
import Dashboard from "../pages/Dashboard/Dashboard";
import InformationPanel from "../pages/InformationPanel/InformationPanel";
import Login from "../pages/Login/Login";
import Reports from "../pages/Reports/Reports";
import TechnicianProfile from "../pages/TechnicianProfile/TechnicianProfile";
import TicketDetailPage from "../pages/TicketDetail/TicketDetail";
import Tickets from "../pages/Tickets/Tickets";
import Users from "../pages/Users/Users";
import RoleBasedRoute from "./RoleBasedRoute";
import {
  getTicketIdFromHash,
  getViewFromHash,
  setHashForTicket,
  setHashForView,
} from "./routeConfig";
import { useAuth } from "../hooks/useAuth";
import { usePreferences } from "../hooks/usePreferences";
import { useTickets } from "../hooks/useTickets";
import { useUsers } from "../hooks/useUsers";

export default function AppRoutes() {
  const {
    canAccessView,
    canCreateTicket,
    canDownloadReports,
    changePassword,
    currentUser,
    dashboardScope,
    login,
    loginMessage,
    logout,
  } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const {
    addComment,
    canCommentTicket,
    canManageTicket,
    canTakeTicket,
    canViewTicket,
    changeTicketStatus,
    createTicket,
    dashboardDueTickets,
    dashboardSummary,
    dashboardTickets,
    getScopeForView,
    getTicketById,
    getVisibleTicketsForView,
    refreshTickets,
    takeTicket,
    technicianRanking,
    tickets,
  } = useTickets();
  const {
    authorizeTechnicianReport,
    createUser,
    deactivateUser,
    refreshUsers,
    resetPassword,
    updateUser,
    users,
  } = useUsers();
  const [activeView, setActiveView] = useState(() => getViewFromHash() ?? VIEW_IDS.DASHBOARD);
  const [selectedTicketId, setSelectedTicketId] = useState(() => getTicketIdFromHash());
  const activeViewRef = useRef(activeView);
  const selectedTicketIdRef = useRef(selectedTicketId);
  const visibleTickets = useMemo(
    () => getVisibleTicketsForView(activeView),
    [activeView, getVisibleTicketsForView],
  );
  const ticketScope = useMemo(() => getScopeForView(activeView), [activeView, getScopeForView]);
  const selectedTicket = useMemo(() => {
    const ticket = getTicketById(selectedTicketId);

    return ticket && canViewTicket(ticket) ? ticket : null;
  }, [canViewTicket, getTicketById, selectedTicketId]);

  function setRouteState(nextView, ticketId = null) {
    const nextTicketId = nextView === VIEW_IDS.TICKET_DETAIL ? ticketId : null;

    activeViewRef.current = nextView;
    selectedTicketIdRef.current = nextTicketId;
    setActiveView(nextView);
    setSelectedTicketId(nextTicketId);
  }

  function syncRouteState(nextView, ticketId = null) {
    const nextTicketId = nextView === VIEW_IDS.TICKET_DETAIL ? ticketId : null;

    if (activeViewRef.current !== nextView) {
      activeViewRef.current = nextView;
      setActiveView(nextView);
    }

    if (selectedTicketIdRef.current !== nextTicketId) {
      selectedTicketIdRef.current = nextTicketId;
      setSelectedTicketId(nextTicketId);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const requestedTicketId = getTicketIdFromHash();
    const requestedView = getViewFromHash() ?? getDefaultView(currentUser);
    const nextView = canAccessView(requestedView) ? requestedView : VIEW_IDS.ACCESS_DENIED;
    syncRouteState(nextView, requestedTicketId);

    if (nextView === VIEW_IDS.TICKET_DETAIL && requestedTicketId) {
      setHashForTicket(requestedTicketId);
      return;
    }

    setHashForView(nextView);
  }, [canAccessView, currentUser]);

  useEffect(() => {
    function handleHashChange() {
      if (!currentUser) {
        return;
      }

      const requestedTicketId = getTicketIdFromHash();
      const requestedView = getViewFromHash() ?? getDefaultView(currentUser);
      const nextView = canAccessView(requestedView) ? requestedView : VIEW_IDS.ACCESS_DENIED;
      syncRouteState(nextView, requestedTicketId);

      if (nextView === VIEW_IDS.ACCESS_DENIED) {
        setHashForView(VIEW_IDS.ACCESS_DENIED);
      }
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [canAccessView, currentUser]);

  function navigate(view) {
    const nextView = canAccessView(view) ? view : VIEW_IDS.ACCESS_DENIED;

    setRouteState(nextView);
    setHashForView(nextView);
  }

  async function handleLogin(form) {
    const result = await login(form);

    if (!result.ok) {
      return result;
    }

    const authenticatedUser = result.user ?? result.data?.user;
    const nextView = getDefaultView(authenticatedUser);
    await Promise.all([refreshUsers(), refreshTickets()]);
    setRouteState(nextView);
    setHashForView(nextView);

    return { ok: true };
  }

  function handleLogout() {
    logout();
    setRouteState(VIEW_IDS.DASHBOARD);
  }

  function openTicket(ticketId) {
    const ticket = getTicketById(ticketId);

    if (!canViewTicket(ticket)) {
      navigate(VIEW_IDS.ACCESS_DENIED);
      return;
    }

    setRouteState(VIEW_IDS.TICKET_DETAIL, ticketId);
    setHashForTicket(ticketId);
  }

  function goBackFromTicket() {
    navigate(VIEW_IDS.TICKETS);
  }

  async function handleCreateTicket(form) {
    const result = await createTicket(form);

    if (!result.ok) {
      return result;
    }

    const createdTicket = result.data;
    setRouteState(VIEW_IDS.TICKET_DETAIL, createdTicket.id);
    setHashForTicket(createdTicket.id);

    return { ok: true };
  }

  function renderActiveView() {
    if (activeView === VIEW_IDS.ACCESS_DENIED) {
      return <AccessDenied onGoHome={() => navigate(getDefaultView(currentUser))} />;
    }

    if (activeView === VIEW_IDS.DASHBOARD) {
      return (
        <Dashboard
          dueTickets={dashboardDueTickets}
          onOpenTicket={openTicket}
          scope={dashboardScope}
          summary={dashboardSummary}
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
      return <CreateTicket currentUser={currentUser} onCreateTicket={handleCreateTicket} />;
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
          canDownloadReports={canDownloadReports}
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
      navigationMode={preferences.navigationMode}
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
