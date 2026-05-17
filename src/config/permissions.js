import { ROLES, isAdministratorRole, isEmployeeRole, isTechnicianRole } from "./roles";

export const VIEW_IDS = {
  ACCESS_DENIED: "access-denied",
  AVAILABLE_TICKETS: "available-tickets",
  DASHBOARD: "dashboard",
  HISTORY: "history",
  INFORMATION: "information",
  MY_TICKETS: "my-tickets",
  PROFILE: "profile",
  RANKING: "ranking",
  REPORTS: "reports",
  TICKET_DETAIL: "ticket-detail",
  TICKETS: "tickets",
  CREATE_TICKET: "create-ticket",
  USERS: "users",
};

export const NAVIGATION_BY_ROLE = {
  [ROLES.ADMINISTRATOR]: [
    { id: VIEW_IDS.DASHBOARD, label: "Inicio" },
    { id: VIEW_IDS.TICKETS, label: "Gestión de solicitudes" },
    { id: VIEW_IDS.INFORMATION, label: "Panel de información" },
    { id: VIEW_IDS.USERS, label: "Gestión de usuarios" },
    { id: VIEW_IDS.RANKING, label: "Métricas" },
    { id: VIEW_IDS.REPORTS, label: "Informes" },
  ],
  [ROLES.TECHNICIAN]: [
    { id: VIEW_IDS.DASHBOARD, label: "Inicio" },
    { id: VIEW_IDS.TICKETS, label: "Todas las solicitudes" },
    { id: VIEW_IDS.AVAILABLE_TICKETS, label: "Solicitudes disponibles" },
    { id: VIEW_IDS.MY_TICKETS, label: "Mis solicitudes" },
    { id: VIEW_IDS.HISTORY, label: "Historial" },
    { id: VIEW_IDS.USERS, label: "Usuarios" },
  ],
  [ROLES.EMPLOYEE]: [
    { id: VIEW_IDS.DASHBOARD, label: "Inicio" },
    { id: VIEW_IDS.CREATE_TICKET, label: "Crear solicitud" },
    { id: VIEW_IDS.TICKETS, label: "Mis solicitudes" },
  ],
};

const VIEW_ROLES = {
  [VIEW_IDS.ACCESS_DENIED]: [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE],
  [VIEW_IDS.AVAILABLE_TICKETS]: [ROLES.TECHNICIAN],
  [VIEW_IDS.DASHBOARD]: [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE],
  [VIEW_IDS.HISTORY]: [ROLES.TECHNICIAN],
  [VIEW_IDS.INFORMATION]: [ROLES.ADMINISTRATOR],
  [VIEW_IDS.MY_TICKETS]: [ROLES.TECHNICIAN],
  [VIEW_IDS.PROFILE]: [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE],
  [VIEW_IDS.RANKING]: [ROLES.ADMINISTRATOR],
  [VIEW_IDS.REPORTS]: [ROLES.ADMINISTRATOR],
  [VIEW_IDS.TICKET_DETAIL]: [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE],
  [VIEW_IDS.TICKETS]: [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE],
  [VIEW_IDS.CREATE_TICKET]: [ROLES.EMPLOYEE],
  [VIEW_IDS.USERS]: [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN],
};

export function getNavigationItems(user) {
  return NAVIGATION_BY_ROLE[user?.role] ?? [];
}

export function canAccessView(user, view) {
  if (!user) {
    return false;
  }

  return (VIEW_ROLES[view] ?? []).includes(user.role);
}

export function getDefaultView(user) {
  return canAccessView(user, VIEW_IDS.DASHBOARD) ? VIEW_IDS.DASHBOARD : VIEW_IDS.ACCESS_DENIED;
}

export function canCreateTicket(user) {
  return isEmployeeRole(user?.role);
}

export function canDownloadReports(user) {
  return isAdministratorRole(user?.role);
}

export function canCreateUser(user) {
  return isAdministratorRole(user?.role);
}

export function canEditUser(actor, targetUser) {
  if (!actor || !targetUser) {
    return false;
  }

  if (isAdministratorRole(actor.role)) {
    return true;
  }

  return isTechnicianRole(actor.role) && isEmployeeRole(targetUser.role);
}

export function canChangeUserRole(actor) {
  return isAdministratorRole(actor?.role);
}

export function canDeactivateUser(actor, targetUser) {
  return Boolean(
    actor &&
      targetUser &&
      isAdministratorRole(actor.role) &&
      actor.id !== targetUser.id &&
      targetUser.active !== false,
  );
}

export function canResetUserPassword(actor, targetUser) {
  if (!actor || !targetUser || actor.id === targetUser.id || targetUser.active === false) {
    return false;
  }

  if (isAdministratorRole(actor.role)) {
    return true;
  }

  return isTechnicianRole(actor.role) && isEmployeeRole(targetUser.role);
}
