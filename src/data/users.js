export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  TECHNICIAN: "TECHNICIAN",
  SUPERVISOR: "SUPERVISOR",
};

export const initialUsers = [
  {
    id: 1,
    firstName: "Erickson",
    lastName: "Lara",
    username: "elara",
    email: "elara@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    jobTitle: "Tecnico de soporte senior",
    department: "Tecnologia",
  },
  {
    id: 2,
    firstName: "Mariela",
    lastName: "Santos",
    username: "msantos",
    email: "msantos@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    jobTitle: "Tecnica de redes",
    department: "Tecnologia",
  },
  {
    id: 3,
    firstName: "Carlos",
    lastName: "Diaz",
    username: "cdiaz",
    email: "cdiaz@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    jobTitle: "Especialista de infraestructura",
    department: "Tecnologia",
  },
  {
    id: 4,
    firstName: "Ana",
    lastName: "Rojas",
    username: "arojas",
    email: "arojas@empresa.com",
    password: "1234",
    role: ROLES.TECHNICIAN,
    jobTitle: "Analista de soporte",
    department: "Tecnologia",
  },
  {
    id: 5,
    firstName: "Supervisor",
    lastName: "General",
    username: "supervisor",
    email: "supervisor@empresa.com",
    password: "1234",
    role: ROLES.SUPERVISOR,
    jobTitle: "Supervisor de soporte tecnico",
    department: "Tecnologia",
  },
  {
    id: 10,
    firstName: "Juan",
    lastName: "Perez",
    username: "jperez",
    email: "jperez@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
    jobTitle: "Analista de nomina",
    department: "Finanzas",
  },
  {
    id: 11,
    firstName: "Laura",
    lastName: "Mendez",
    username: "lmendez",
    email: "lmendez@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
    jobTitle: "Coordinadora administrativa",
    department: "Administracion",
  },
  {
    id: 12,
    firstName: "Pedro",
    lastName: "Nunez",
    username: "pnunez",
    email: "pnunez@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
    jobTitle: "Asistente de operaciones",
    department: "Operaciones",
  },
  {
    id: 13,
    firstName: "Sofia",
    lastName: "Castillo",
    username: "scastillo",
    email: "scastillo@empresa.com",
    password: "1234",
    role: ROLES.EMPLOYEE,
    jobTitle: "Ejecutiva comercial",
    department: "Ventas",
  },
];

export function getUserFullName(user) {
  if (!user) {
    return "Sin usuario";
  }

  return `${user.firstName} ${user.lastName}`.trim();
}

export function isTechnicianUser(user) {
  return user?.role === ROLES.TECHNICIAN;
}

export function isSupervisorUser(user) {
  return user?.role === ROLES.SUPERVISOR;
}

export function isEmployeeUser(user) {
  return user?.role === ROLES.EMPLOYEE;
}

export function getRoleLabel(role) {
  const labels = {
    [ROLES.EMPLOYEE]: "Empleado",
    [ROLES.TECHNICIAN]: "Tecnico",
    [ROLES.SUPERVISOR]: "Supervisor",
  };

  return labels[role] ?? role;
}
