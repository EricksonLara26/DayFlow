import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import TechnicianRanking from "../components/dashboard/TechnicianRanking";
import MainLayout from "../components/layout/MainLayout";
import { VIEW_IDS, getDefaultView } from "../config/permissions";
import AccessDenied from "../pages/AccessDenied/AccessDenied";
import CreateTicket from "../pages/CreateTicket/CreateTicket";
import Dashboard from "../pages/Dashboard/Dashboard";
import InformationPanel from "../pages/InformationPanel/InformationPanel";
import Login from "../pages/Login/Login";
import Reports from "../pages/Reports/Reports";
import Settings from "../pages/Settings/Settings";
import TechnicianProfile from "../pages/TechnicianProfile/TechnicianProfile";
import TicketDetailPage from "../pages/TicketDetail/TicketDetail";
import Tickets from "../pages/Tickets/Tickets";
import Users from "../pages/Users/Users";
import { useAuth } from "../hooks/useAuth";
import { usePreferences } from "../hooks/usePreferences";
import { useTickets } from "../hooks/useTickets";
import { useUsers } from "../hooks/useUsers";
import ProtectedRoute from "./ProtectedRoute";
import RoleBasedRoute from "./RoleBasedRoute";
import {
  LOGIN_PATH,
  getPathForView,
  getRoutePatternForView,
  getViewFromPathname,
} from "./routeConfig";

function getHomePath(user) {
  if (user?.mustChangePassword) {
    return getPathForView(VIEW_IDS.SETTINGS);
  }

  return getPathForView(getDefaultView(user));
}

function LoginRoute({ currentUser, message, onLogin, preferences }) {
  if (currentUser) {
    return <Navigate replace to={getHomePath(currentUser)} />;
  }

  return (
    <div className={preferences.darkMode ? "theme-dark" : ""}>
      <Login message={message} onLogin={onLogin} />
    </div>
  );
}

function TemporaryPasswordGate({ activeView, children, currentUser }) {
  const location = useLocation();

  if (currentUser?.mustChangePassword && activeView !== VIEW_IDS.SETTINGS) {
    return <Navigate replace state={{ from: location }} to={getPathForView(VIEW_IDS.SETTINGS)} />;
  }

  return children;
}

function TicketsView({
  canTakeTicket,
  error,
  getScopeForView,
  getVisibleTicketsForView,
  isLoading,
  onCreateTicket,
  onOpenTicket,
  onTakeTicket,
  users,
  view,
}) {
  return (
    <Tickets
      canTakeTicket={canTakeTicket}
      error={error}
      isLoading={isLoading}
      onCreateTicket={onCreateTicket}
      onOpenTicket={onOpenTicket}
      onTakeTicket={onTakeTicket}
      scope={getScopeForView(view)}
      tickets={getVisibleTicketsForView(view)}
      users={users}
    />
  );
}

function TicketDetailRoute({
  canCommentTicket,
  canManageTicket,
  canTakeTicket,
  canViewTicket,
  getTicketById,
  onAddComment,
  onBack,
  onChangeStatus,
  onGoHome,
  onTakeTicket,
  users,
}) {
  const { id } = useParams();
  const location = useLocation();
  const ticket = getTicketById(id);

  if (ticket && !canViewTicket(ticket)) {
    return <AccessDenied onGoHome={onGoHome} />;
  }

  return (
    <TicketDetailPage
      canCommentTicket={canCommentTicket}
      canManageTicket={canManageTicket}
      canTakeTicket={canTakeTicket}
      onAddComment={onAddComment}
      onBack={onBack}
      onChangeStatus={onChangeStatus}
      onTakeTicket={onTakeTicket}
      flashMessage={location.state?.ticketMessage}
      ticket={ticket}
      users={users}
    />
  );
}

function AppRoutesContent() {
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
    dashboardActivityHistory,
    dashboardDemandByDepartment,
    dashboardDueTickets,
    dashboardHistorical,
    dashboardSummary,
    dashboardTicketsByCategory,
    getScopeForView,
    getTicketById,
    getVisibleTicketsForView,
    refreshTickets,
    takeTicket,
    technicianRanking,
    tickets,
    ticketsError,
    ticketsLoading,
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
  const location = useLocation();
  const navigate = useNavigate();
  const activeView = getViewFromPathname(location.pathname) ?? VIEW_IDS.DASHBOARD;

  function navigateToView(view, options = {}) {
    const nextView = canAccessView(view) ? view : VIEW_IDS.ACCESS_DENIED;
    navigate(getPathForView(nextView), options);
  }

  function goHome() {
    navigate(getHomePath(currentUser));
  }

  async function handleLogin(form) {
    const result = await login(form);

    if (!result.ok) {
      return result;
    }

    const authenticatedUser = result.user ?? result.data?.user;
    await Promise.all([refreshUsers(), refreshTickets()]);
    navigate(getHomePath(authenticatedUser), { replace: true });

    return { ok: true };
  }

  function handleLogout() {
    logout();
    navigate(LOGIN_PATH, { replace: true });
  }

  function openTicket(ticketId) {
    const ticket = getTicketById(ticketId);

    if (ticket && !canViewTicket(ticket)) {
      navigateToView(VIEW_IDS.ACCESS_DENIED);
      return;
    }

    navigate(getPathForView(VIEW_IDS.TICKET_DETAIL, { ticketId }));
  }

  function goBackFromTicket() {
    navigateToView(VIEW_IDS.TICKETS);
  }

  async function handleCreateTicket(form) {
    const result = await createTicket(form);

    if (!result.ok) {
      return result;
    }

    navigate(getPathForView(VIEW_IDS.TICKET_DETAIL, { ticketId: result.data.id }), {
      state: { ticketMessage: result.message ?? "Solicitud enviada correctamente." },
    });

    return { ok: true };
  }

  function withRole(view, element) {
    return (
      <RoleBasedRoute currentUser={currentUser} view={view}>
        {element}
      </RoleBasedRoute>
    );
  }

  return (
    <Routes>
      <Route
        path={LOGIN_PATH}
        element={
          <LoginRoute
            currentUser={currentUser}
            message={loginMessage}
            onLogin={handleLogin}
            preferences={preferences}
          />
        }
      />

      <Route element={<ProtectedRoute currentUser={currentUser} />}>
        <Route
          element={
            <MainLayout
              activeView={activeView}
              canCreateTicket={canCreateTicket && currentUser?.mustChangePassword !== true}
              currentUser={currentUser}
              darkMode={preferences.darkMode}
              navigationMode={preferences.navigationMode}
              onCreateTicket={() => navigateToView(VIEW_IDS.CREATE_TICKET)}
              onLogout={handleLogout}
              onNavigate={navigateToView}
            >
              <TemporaryPasswordGate activeView={activeView} currentUser={currentUser}>
                <Outlet />
              </TemporaryPasswordGate>
            </MainLayout>
          }
        >
          <Route index element={<Navigate replace to={getHomePath(currentUser)} />} />
          <Route
            path={getRoutePatternForView(VIEW_IDS.ACCESS_DENIED)}
            element={<AccessDenied onGoHome={goHome} />}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.DASHBOARD)}
            element={withRole(
              VIEW_IDS.DASHBOARD,
              <Dashboard
                dueTickets={dashboardDueTickets}
                error={ticketsError}
                isLoading={ticketsLoading}
                onOpenTicket={openTicket}
                scope={dashboardScope}
                summary={dashboardSummary}
                technicianRanking={technicianRanking}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.TICKETS)}
            element={withRole(
              VIEW_IDS.TICKETS,
              <TicketsView
                canTakeTicket={canTakeTicket}
                error={ticketsError}
                getScopeForView={getScopeForView}
                getVisibleTicketsForView={getVisibleTicketsForView}
                isLoading={ticketsLoading}
                onCreateTicket={() => navigateToView(VIEW_IDS.CREATE_TICKET)}
                onOpenTicket={openTicket}
                onTakeTicket={takeTicket}
                users={users}
                view={VIEW_IDS.TICKETS}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.CREATE_TICKET)}
            element={withRole(
              VIEW_IDS.CREATE_TICKET,
              <CreateTicket currentUser={currentUser} onCreateTicket={handleCreateTicket} />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.AVAILABLE_TICKETS)}
            element={withRole(
              VIEW_IDS.AVAILABLE_TICKETS,
              <TicketsView
                canTakeTicket={canTakeTicket}
                error={ticketsError}
                getScopeForView={getScopeForView}
                getVisibleTicketsForView={getVisibleTicketsForView}
                isLoading={ticketsLoading}
                onCreateTicket={() => navigateToView(VIEW_IDS.CREATE_TICKET)}
                onOpenTicket={openTicket}
                onTakeTicket={takeTicket}
                users={users}
                view={VIEW_IDS.AVAILABLE_TICKETS}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.MY_TICKETS)}
            element={withRole(
              VIEW_IDS.MY_TICKETS,
              <TicketsView
                canTakeTicket={canTakeTicket}
                error={ticketsError}
                getScopeForView={getScopeForView}
                getVisibleTicketsForView={getVisibleTicketsForView}
                isLoading={ticketsLoading}
                onCreateTicket={() => navigateToView(VIEW_IDS.CREATE_TICKET)}
                onOpenTicket={openTicket}
                onTakeTicket={takeTicket}
                users={users}
                view={VIEW_IDS.MY_TICKETS}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.HISTORY)}
            element={withRole(
              VIEW_IDS.HISTORY,
              <TicketsView
                canTakeTicket={canTakeTicket}
                error={ticketsError}
                getScopeForView={getScopeForView}
                getVisibleTicketsForView={getVisibleTicketsForView}
                isLoading={ticketsLoading}
                onCreateTicket={() => navigateToView(VIEW_IDS.CREATE_TICKET)}
                onOpenTicket={openTicket}
                onTakeTicket={takeTicket}
                users={users}
                view={VIEW_IDS.HISTORY}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.TICKET_DETAIL)}
            element={withRole(
              VIEW_IDS.TICKET_DETAIL,
              <TicketDetailRoute
                canCommentTicket={canCommentTicket}
                canManageTicket={canManageTicket}
                canTakeTicket={canTakeTicket}
                canViewTicket={canViewTicket}
                getTicketById={getTicketById}
                onAddComment={addComment}
                onBack={goBackFromTicket}
                onChangeStatus={changeTicketStatus}
                onGoHome={goHome}
                onTakeTicket={takeTicket}
                users={users}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.PROFILE)}
            element={withRole(
              VIEW_IDS.PROFILE,
              <TechnicianProfile
                currentUser={currentUser}
                onChangePassword={changePassword}
                onOpenTicket={openTicket}
                onUpdatePreferences={updatePreferences}
                preferences={preferences}
                tickets={tickets}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.SETTINGS)}
            element={withRole(
              VIEW_IDS.SETTINGS,
              <Settings
                requirePasswordChange={currentUser?.mustChangePassword === true}
                onChangePassword={changePassword}
                onUpdatePreferences={updatePreferences}
                preferences={preferences}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.RANKING)}
            element={withRole(
              VIEW_IDS.RANKING,
              <div className="page-stack">
                <TechnicianRanking technicians={technicianRanking} />
              </div>,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.INFORMATION)}
            element={withRole(
              VIEW_IDS.INFORMATION,
              <InformationPanel
                activityHistory={dashboardActivityHistory}
                canDownloadReports={canDownloadReports}
                categoryVolume={dashboardTicketsByCategory}
                departmentDemand={dashboardDemandByDepartment}
                historical={dashboardHistorical}
                onAuthorizeReport={authorizeTechnicianReport}
                onOpenTicket={openTicket}
                summary={dashboardSummary}
                tickets={tickets}
                technicianRanking={technicianRanking}
                users={users}
              />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.REPORTS)}
            element={withRole(
              VIEW_IDS.REPORTS,
              <Reports onAuthorizeReport={authorizeTechnicianReport} tickets={tickets} users={users} />,
            )}
          />
          <Route
            path={getRoutePatternForView(VIEW_IDS.USERS)}
            element={withRole(
              VIEW_IDS.USERS,
              <Users
                currentUser={currentUser}
                onCreateUser={createUser}
                onDeactivateUser={deactivateUser}
                onResetPassword={resetPassword}
                onUpdateUser={updateUser}
                users={users}
              />,
            )}
          />
          <Route path="*" element={<Navigate replace to={getHomePath(currentUser)} />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AppRoutesContent />
    </BrowserRouter>
  );
}
