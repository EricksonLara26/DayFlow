export const ROLES = {
  ADMINISTRATOR: "ADMINISTRADOR",
  TECHNICIAN: "TECNICO",
  EMPLOYEE: "EMPLEADO",
};

export const ROLE_LABELS = {
  [ROLES.ADMINISTRATOR]: "Administrador",
  [ROLES.TECHNICIAN]: "Tecnico",
  [ROLES.EMPLOYEE]: "Empleado",
  ADMINISTRATOR: "Administrador",
  TECHNICIAN: "Tecnico",
  EMPLOYEE: "Empleado",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

export function isAdministratorRole(role) {
  return role === ROLES.ADMINISTRATOR;
}

export function isTechnicianRole(role) {
  return role === ROLES.TECHNICIAN;
}

export function isEmployeeRole(role) {
  return role === ROLES.EMPLOYEE;
}
