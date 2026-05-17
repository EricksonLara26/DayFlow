import {
  ROLES,
  getRoleLabel,
  isAdministratorRole,
  isEmployeeRole,
  isTechnicianRole,
} from "../config/roles";

export { ROLES, getRoleLabel };

export const mockUsers = [
  {
    id: 5,
    nombre: "Administrador Principal",
    usuario: "administrador",
    email: "administrador@empresa.com",
    password: "1234",
    rol: ROLES.ADMINISTRATOR,
    departamento: "Tecnologia",
    cargo: "Administrador del sistema",
    activo: true,
  },
  {
    id: 1,
    nombre: "Erickson Lara",
    usuario: "tecnico",
    email: "tecnico@empresa.com",
    password: "1234",
    rol: ROLES.TECHNICIAN,
    departamento: "Soporte Técnico",
    cargo: "Técnico de soporte senior",
    activo: true,
  },
  {
    id: 10,
    nombre: "Juan Perez",
    usuario: "empleado",
    email: "empleado@empresa.com",
    password: "1234",
    rol: ROLES.EMPLOYEE,
    departamento: "Administración",
    cargo: "Empleado general",
    activo: true,
  },
  {
    id: 2,
    nombre: "Mariela Santos",
    usuario: "msantos",
    email: "msantos@empresa.com",
    password: "1234",
    rol: ROLES.TECHNICIAN,
    departamento: "Tecnologia",
    cargo: "Técnica de redes",
    activo: true,
  },
  {
    id: 3,
    nombre: "Carlos Diaz",
    usuario: "cdiaz",
    email: "cdiaz@empresa.com",
    password: "1234",
    rol: ROLES.TECHNICIAN,
    departamento: "Tecnologia",
    cargo: "Especialista de infraestructura",
    activo: true,
  },
  {
    id: 4,
    nombre: "Ana Rojas",
    usuario: "arojas",
    email: "arojas@empresa.com",
    password: "1234",
    rol: ROLES.TECHNICIAN,
    departamento: "Tecnologia",
    cargo: "Analista de soporte",
    activo: true,
  },
  {
    id: 11,
    nombre: "Laura Mendez",
    usuario: "lmendez",
    email: "lmendez@empresa.com",
    password: "1234",
    rol: ROLES.EMPLOYEE,
    departamento: "Administración",
    cargo: "Coordinadora administrativa",
    activo: true,
  },
  {
    id: 12,
    nombre: "Pedro Nunez",
    usuario: "pnunez",
    email: "pnunez@empresa.com",
    password: "1234",
    rol: ROLES.EMPLOYEE,
    departamento: "Operaciones",
    cargo: "Asistente de operaciones",
    activo: true,
  },
  {
    id: 13,
    nombre: "Sofia Castillo",
    usuario: "scastillo",
    email: "scastillo@empresa.com",
    password: "1234",
    rol: ROLES.EMPLOYEE,
    departamento: "Ventas",
    cargo: "Ejecutiva comercial",
    activo: true,
  },
];

function splitFullName(nombre) {
  const parts = nombre.trim().split(/\s+/);
  const firstName = parts.shift() ?? "";
  const lastName = parts.join(" ");

  return { firstName, lastName };
}

export function normalizeUser(user) {
  const name = user.nombre ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  const { firstName, lastName } = splitFullName(name);
  const role = user.rol ?? user.role;

  return {
    ...user,
    firstName: user.firstName ?? firstName,
    lastName: user.lastName ?? lastName,
    username: user.username ?? user.usuario,
    role,
    jobTitle: user.jobTitle ?? user.cargo,
    department: user.department ?? user.departamento,
    active: user.active ?? user.activo ?? true,
    nombre: name,
    usuario: user.usuario ?? user.username,
    rol: role,
    cargo: user.cargo ?? user.jobTitle,
    departamento: user.departamento ?? user.department,
    activo: user.activo ?? user.active ?? true,
  };
}

export const initialUsers = mockUsers.map(normalizeUser);

export function getUserFullName(user) {
  if (!user) {
    return "Sin usuario";
  }

  return user.nombre ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
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
