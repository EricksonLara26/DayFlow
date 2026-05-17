import { ROLES } from "../config/roles";
import { normalizeUser } from "../data/users";

function getNextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

function splitFullName(firstName, lastName) {
  return `${firstName} ${lastName}`.trim();
}

export function createLocalUser(users, form) {
  const role = Object.values(ROLES).includes(form.role) ? form.role : ROLES.EMPLOYEE;
  const nextUser = normalizeUser({
    id: getNextId(users),
    nombre: splitFullName(form.firstName, form.lastName),
    usuario: form.username,
    email: form.email,
    password: form.password,
    rol: role,
    departamento: form.department,
    cargo: form.jobTitle,
    activo: true,
  });

  return [...users, nextUser];
}

export function updateLocalUser(users, userId, changes) {
  return users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    const firstName = changes.firstName ?? user.firstName;
    const lastName = changes.lastName ?? user.lastName;
    const role = changes.role ?? user.role;
    const department = changes.department ?? user.department;
    const jobTitle = changes.jobTitle ?? user.jobTitle;

    return normalizeUser({
      ...user,
      ...changes,
      firstName,
      lastName,
      nombre: splitFullName(firstName, lastName),
      role,
      rol: role,
      department,
      departamento: department,
      jobTitle,
      cargo: jobTitle,
    });
  });
}

export function deactivateLocalUser(users, userId) {
  return updateLocalUser(users, userId, { active: false, activo: false });
}

export function resetLocalUserPassword(users, userId, password = "1234") {
  return updateLocalUser(users, userId, { password });
}
