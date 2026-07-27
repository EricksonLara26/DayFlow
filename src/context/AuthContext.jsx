import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canAccessView as canAccessViewForUser,
  canCreateTicket as canCreateTicketForUser,
  canDownloadReports as canDownloadReportsForUser,
} from "../config/permissions";
import { isAdministratorUser, isTechnicianUser } from "../data/users";
import {
  changePassword as authChangePassword,
  clearAuthenticatedUser,
  getStoredAuthenticatedUser,
  login as authLogin,
  logout as authLogout,
  restoreSession as authRestoreSession,
  storeAuthenticatedUser,
} from "../services/authService";
import { AUTH_EXPIRED_EVENT } from "../services/apiClient";

export const AuthContext = createContext(null);

function hasSameSessionData(currentUser, restoredUser) {
  const sessionFields = [
    "id",
    "firstName",
    "lastName",
    "username",
    "email",
    "role",
    "department",
    "departmentId",
    "position",
    "active",
    "mustChangePassword",
  ];

  return sessionFields.every(
    (field) => currentUser?.[field] === restoredUser?.[field],
  );
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(getStoredAuthenticatedUser);
  const [loginMessage, setLoginMessage] = useState("");
  const sessionVersionRef = useRef(0);

  const isTechnician = isTechnicianUser(currentUser);
  const isAdministrator = isAdministratorUser(currentUser);
  const canCreateTicket = canCreateTicketForUser(currentUser);
  const canDownloadReports = canDownloadReportsForUser(currentUser);
  const dashboardScope = isAdministrator ? "administrator" : isTechnician ? "technician" : "employee";

  useEffect(() => {
    let mounted = true;
    const restoreVersion = sessionVersionRef.current;

    authRestoreSession().then((result) => {
      if (
        !mounted ||
        restoreVersion !== sessionVersionRef.current
      ) {
        return;
      }

      if (result.ok) {
        const restoredUser =
          result.user ?? result.data?.user ?? result.data;
        if (
          restoredUser &&
          !hasSameSessionData(currentUser, restoredUser)
        ) {
          setCurrentUser(restoredUser);
        }
      } else if (result.status === 401) {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      sessionVersionRef.current += 1;
      clearAuthenticatedUser();
      setCurrentUser(null);
      setLoginMessage("Tu sesión expiró. Inicia sesión nuevamente.");
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpiredSession);
    };
  }, []);

  const login = useCallback(async (form) => {
    sessionVersionRef.current += 1;
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
    sessionVersionRef.current += 1;
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

      if (!currentPassword.trim()) {
        return { ok: false, message: "La contrase\u00f1a actual es obligatoria." };
      }

      const cleanPassword = newPassword.trim();

      if (cleanPassword.length < 4) {
        return { ok: false, message: "La nueva contrase\u00f1a debe tener al menos 4 caracteres." };
      }

      if (cleanPassword === currentPassword.trim()) {
        return { ok: false, message: "La nueva contrase\u00f1a debe ser diferente a la temporal o actual." };
      }

      if (cleanPassword !== confirmPassword.trim()) {
        return { ok: false, message: "La confirmaci\u00f3n no coincide." };
      }

      const result = await authChangePassword(
        currentUser.id,
        currentPassword,
        cleanPassword,
        confirmPassword.trim(),
      );

      if (!result.ok) {
        return result;
      }

      replaceCurrentUser(result.data ?? currentUser);

      return result;
    },
    [currentUser, replaceCurrentUser],
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
