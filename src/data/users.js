import {
  ROLES,
  getRoleLabel,
  isAdministratorRole,
  isEmployeeRole,
  isTechnicianRole,
} from "../config/roles";

export { ROLES, getRoleLabel };

export function normalizeUser(user) {
  return {
    id: user.id,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    username: user.username ?? "",
    email: user.email ?? "",
    password: user.password,
    role: user.role,
    department: user.department ?? "",
    position: user.position ?? "",
    active: user.active ?? true,
  };
}

export function getUserFullName(user) {
  if (!user) {
    return "Sin usuario";
  }

  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
}

export function isAdministratorUser(user) {
  return isAdministratorRole(user?.role);
}

export function isTechnicianUser(user) {
  return isTechnicianRole(user?.role);
}

export function isEmployeeUser(user) {
  return isEmployeeRole(user?.role);
}
