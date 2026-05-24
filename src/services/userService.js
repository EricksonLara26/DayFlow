import { ROLES } from "../config/roles";
import { normalizeUser } from "../data/users";

function getNextId(items) {
  return Math.max(0, ...items.map((item) => Number(item.id) || 0)) + 1;
}

export function createLocalUser(users, form) {
  const role = Object.values(ROLES).includes(form.role) ? form.role : ROLES.EMPLOYEE;
  const nextUser = normalizeUser({
    id: getNextId(users),
    firstName: form.firstName,
    lastName: form.lastName,
    username: form.username,
    email: form.email,
    password: form.password,
    role,
    department: form.department,
    position: form.position,
    active: true,
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
    const position = changes.position ?? user.position;

    return normalizeUser({
      ...user,
      ...changes,
      firstName,
      lastName,
      role,
      department,
      position,
    });
  });
}

export function deactivateLocalUser(users, userId) {
  return updateLocalUser(users, userId, { active: false });
}

export function resetLocalUserPassword(users, userId, password = "1234") {
  return updateLocalUser(users, userId, { password });
}
