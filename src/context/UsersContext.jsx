import { createContext, useCallback, useMemo, useState } from "react";
import {
  canCreateUser,
  canDeactivateUser,
  canDownloadReports,
  canEditUser,
  canResetUserPassword,
} from "../config/permissions";
import { ROLES, isTechnicianUser } from "../data/users";
import {
  createUser as createUserRequest,
  deleteUser as deleteUserRequest,
  getUsers as fetchUsers,
  getUsersSnapshot,
  resetPassword as resetUserPasswordRequest,
  updateUser as updateUserRequest,
} from "../services/userService";
import { useAuth } from "../hooks/useAuth";

export const UsersContext = createContext(null);

function validateEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email) && email.endsWith(".com");
}

export function UsersProvider({ children }) {
  const { currentUser, replaceCurrentUser } = useAuth();
  const [users, setUsers] = useState(() => getUsersSnapshot());

  const refreshUsers = useCallback(async () => {
    const response = await fetchUsers();

    if (response.ok) {
      setUsers(response.data);
    }

    return response;
  }, []);

  const createUser = useCallback(
    async (form) => {
      if (!canCreateUser(currentUser)) {
        return { ok: false, message: "No tienes permisos para crear usuarios." };
      }

      if (users.some((user) => user.username.toLowerCase() === form.username.trim().toLowerCase())) {
        return { ok: false, message: "Ese nombre de usuario ya existe." };
      }

      if (users.some((user) => user.email.toLowerCase() === form.email.trim().toLowerCase())) {
        return { ok: false, message: "Ese correo ya est\u00e1 en uso." };
      }

      const result = await createUserRequest(form);

      if (!result.ok) {
        return result;
      }

      await refreshUsers();

      return { ok: true, message: result.message ?? "Usuario creado correctamente." };
    },
    [currentUser, refreshUsers, users],
  );

  const updateUser = useCallback(
    async (userId, form) => {
      const targetUser = users.find((user) => user.id === userId);

      if (!canEditUser(currentUser, targetUser)) {
        return { ok: false, message: "No tienes permisos para modificar este usuario." };
      }

      const cleanEmail = form.email.trim().toLowerCase();

      if (!validateEmail(cleanEmail)) {
        return { ok: false, message: "El correo debe tener formato v\u00e1lido y terminar en .com." };
      }

      if (users.some((user) => user.id !== userId && user.email.toLowerCase() === cleanEmail)) {
        return { ok: false, message: "Ese correo ya est\u00e1 en uso." };
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

      const response = await updateUserRequest(userId, {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        email: cleanEmail,
        position: cleanPosition,
        department: cleanDepartment,
        role: nextRole,
      });

      if (!response.ok) {
        return response;
      }

      await refreshUsers();

      if (currentUser.id === userId) {
        replaceCurrentUser(response.data);
      }

      return { ok: true, message: response.message ?? "Usuario actualizado correctamente." };
    },
    [currentUser, refreshUsers, replaceCurrentUser, users],
  );

  const deactivateUser = useCallback(
    async (userId) => {
      const targetUser = users.find((user) => user.id === userId);

      if (!canDeactivateUser(currentUser, targetUser)) {
        return { ok: false, message: "No tienes permisos para desactivar este usuario." };
      }

      const result = await deleteUserRequest(userId);

      if (!result.ok) {
        return result;
      }

      await refreshUsers();

      return { ok: true, message: result.message ?? "Usuario desactivado correctamente." };
    },
    [currentUser, refreshUsers, users],
  );

  const resetPassword = useCallback(
    async (userId, temporaryPassword) => {
      const targetUser = users.find((user) => user.id === userId);

      if (!canResetUserPassword(currentUser, targetUser)) {
        return { ok: false, message: "No tienes permisos para restablecer esta contrase\u00f1a." };
      }

      const cleanTemporaryPassword = temporaryPassword?.trim() ?? "";

      if (cleanTemporaryPassword.length < 4) {
        return { ok: false, message: "La contrase\u00f1a temporal debe tener al menos 4 caracteres." };
      }

      const result = await resetUserPasswordRequest(userId, cleanTemporaryPassword, {
        mustChangePassword: true,
      });

      if (!result.ok) {
        return result;
      }

      await refreshUsers();

      return { ok: true, message: result.message ?? "Contrase\u00f1a temporal asignada correctamente." };
    },
    [currentUser, refreshUsers, users],
  );

  const authorizeTechnicianReport = useCallback(
    ({ technicianId }) => {
      if (!canDownloadReports(currentUser)) {
        return { ok: false, message: "Solo el administrador puede descargar informes." };
      }

      const technician = users.find((user) => user.id === Number(technicianId) && isTechnicianUser(user));

      if (!technician) {
        return { ok: false, message: "Selecciona un t\u00e9cnico v\u00e1lido." };
      }

      return { ok: true };
    },
    [currentUser, users],
  );

  const value = useMemo(
    () => ({
      authorizeTechnicianReport,
      createUser,
      deactivateUser,
      refreshUsers,
      resetPassword,
      updateUser,
      users,
    }),
    [
      authorizeTechnicianReport,
      createUser,
      deactivateUser,
      refreshUsers,
      resetPassword,
      updateUser,
      users,
    ],
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}
