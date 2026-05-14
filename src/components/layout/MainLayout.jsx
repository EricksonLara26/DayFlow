import Header from "./Header";
import Sidebar from "./Sidebar";

export default function MainLayout({
  activeView,
  children,
  currentUser,
  onCreateTicket,
  onLogout,
  onNavigate,
}) {
  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        currentUser={currentUser}
        onLogout={onLogout}
        onNavigate={onNavigate}
      />
      <main className="main-content">
        <Header activeView={activeView} currentUser={currentUser} onCreateTicket={onCreateTicket} />
        {children}
      </main>
    </div>
  );
}
