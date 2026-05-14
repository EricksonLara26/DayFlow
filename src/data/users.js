export const ROLES = {
  ADMIN: "ADMIN",
  TECHNICIAN: "TECHNICIAN",
  EMPLOYEE: "EMPLOYEE",
};

export const initialUsers = [
  {
    id: 1,
    firstName: "Erickson",
    lastName: "Lara",
    username: "elara",
    email: "elara@empresa.com",
    password: "1234",
    role: ROLES.ADMIN,
    completedTickets: 4,
    dismissedTickets: 1,
  },
  {
    id: 2,
    firstName: "Mariela",
    lastName: "Santos",
    username: "msantos",
    email: "msantos@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    completedTickets: 2,
    dismissedTickets: 0,
  },
  {
    id: 3,
    firstName: "Carlos",
    lastName: "Diaz",
    username: "cdiaz",
    email: "cdiaz@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    completedTickets: 6,
    dismissedTickets: 2,
  },
  {
    id: 4,
    firstName: "Ana",
    lastName: "Rojas",
    username: "arojas",
    email: "arojas@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    completedTickets: 1,
    dismissedTickets: 1,
  },
  {
    id: 10,
    firstName: "Juan",
    lastName: "Perez",
    username: "jperez",
    email: "jperez@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
  },
  {
    id: 11,
    firstName: "Laura",
    lastName: "Mendez",
    username: "lmendez",
    email: "lmendez@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
  },
  {
    id: 12,
    firstName: "Pedro",
    lastName: "Nunez",
    username: "pnunez",
    email: "pnunez@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
  },
  {
    id: 13,
    firstName: "Sofia",
    lastName: "Castillo",
    username: "scastillo",
    email: "scastillo@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
  },
];

export function getUserFullName(user) {
  if (!user) {
    return "Sin usuario";
  }

  return `${user.firstName} ${user.lastName}`.trim();
}

export function isTechnicianUser(user) {
  return user?.role === ROLES.ADMIN || user?.role === ROLES.TECHNICIAN;
}

export function getRoleLabel(role) {
  const labels = {
    [ROLES.ADMIN]: "Admin / Tecnico",
    [ROLES.TECHNICIAN]: "Tecnico",
    [ROLES.EMPLOYEE]: "Empleado",
  };

  return labels[role] ?? role;
}
