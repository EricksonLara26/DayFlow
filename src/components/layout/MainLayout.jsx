import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({
  activeView,
  children,
  currentUser,
  darkMode,
  navigationMode,
  onCreateTicket,
  onLogout,
  onNavigate,
}) {
  return (
    <div className={`app-shell nav-${navigationMode} ${darkMode ? "theme-dark" : ""}`.trim()}>
      <Sidebar
        activeView={activeView}
        currentUser={currentUser}
        navigationMode={navigationMode}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      <main className="main-content">
        <Header
          activeView={activeView}
          currentUser={currentUser}
          onCreateTicket={onCreateTicket}
        />
        {children}
      </main>
    </div>
  );
}
