import { AuthProvider } from "./context/AuthContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import { TicketsProvider } from "./context/TicketsContext";
import { UsersProvider } from "./context/UsersContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <UsersProvider>
          <TicketsProvider>
            <AppRoutes />
          </TicketsProvider>
        </UsersProvider>
      </AuthProvider>
    </PreferencesProvider>
  );
}
