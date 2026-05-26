import { createContext, useCallback, useMemo, useState } from "react";
import {
  canAccessView as canAccessViewForUser,
  canCreateTicket as canCreateTicketForUser,
  canDownloadReports as canDownloadReportsForUser,
} from "../config/permissions";
import { isAdministratorUser, isTechnicianUser } from "../data/users";
import {
  changePassword as authChangePassword,
  getStoredAuthenticatedUser,
  login as authLogin,
  logout as authLogout,
  storeAuthenticatedUser,
} from "../services/authService";
import { getUserSnapshotById } from "../services/userService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getStoredAuthenticatedUser);
  const [loginMessage, setLoginMessage] = useState("");

  const isTechnician = isTechnicianUser(currentUser);
  const isAdministrator = isAdministratorUser(currentUser);
  const canCreateTicket = canCreateTicketForUser(currentUser);
  const canDownloadReports = canDownloadReportsForUser(currentUser);
  const dashboardScope = isAdministrator ? "administrator" : isTechnician ? "technician" : "employee";

  const login = useCallback(async (form) => {
    const result = await authLogin(form);

    if (!result.ok) {
      return result;
    }

    const authenticatedUser = result.user ?? result.data?.user;
    setCurrentUser(authenticatedUser);
    setLoginMessage("");

    return { ...result, user: authenticatedUser };
  }, []);

  const logout = useCallback(() => {
    const result = authLogout();
    setCurrentUser(null);
    setLoginMessage("Sesi\u00f3n cerrada correctamente.");

    return result;
  }, []);

  const replaceCurrentUser = useCallback((user) => {
    const sessionUser = storeAuthenticatedUser(user);
    setCurrentUser(sessionUser);

    return sessionUser;
  }, []);

  const canAccessView = useCallback(
    (view) => canAccessViewForUser(currentUser, view),
    [currentUser],
  );

  const changePassword = useCallback(
    async ({ confirmPassword, currentPassword, newPassword }) => {
      if (!currentUser) {
        return { ok: false, message: "No hay una sesi\u00f3n activa." };
      }

      const fullUser = getUserSnapshotById(currentUser.id);

      if (!fullUser || currentPassword !== fullUser.password) {
        return { ok: false, message: "La contrase\u00f1a actual no coincide." };
      }

      const cleanPassword = newPassword.trim();

      if (cleanPassword.length < 4) {
        return { ok: false, message: "La nueva contrase\u00f1a debe tener al menos 4 caracteres." };
      }

      if (cleanPassword !== confirmPassword.trim()) {
        return { ok: false, message: "La confirmaci\u00f3n no coincide." };
      }

      const result = await authChangePassword(currentUser.id, currentPassword, cleanPassword);

      if (!result.ok) {
        return result;
      }

      return { ok: true };
    },
    [currentUser],
  );

  const value = useMemo(
    () => ({
      canAccessView,
      canCreateTicket,
      canDownloadReports,
      changePassword,
      currentUser,
      dashboardScope,
      isAdministrator,
      isTechnician,
      login,
      loginMessage,
      logout,
      replaceCurrentUser,
    }),
    [
      canAccessView,
      canCreateTicket,
      canDownloadReports,
      changePassword,
      currentUser,
      dashboardScope,
      isAdministrator,
      isTechnician,
      login,
      loginMessage,
      logout,
      replaceCurrentUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
