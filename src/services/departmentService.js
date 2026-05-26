import { mockDepartments } from "../mocks";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ok(data, extra = {}) {
  return Promise.resolve({ ok: true, data, ...extra });
}

function fail(message, status = 400) {
  return Promise.resolve({ ok: false, status, message, error: { message, status } });
}

export function getDepartmentsSnapshot() {
  return clone(mockDepartments);
}

export function getDepartmentNamesSnapshot() {
  return getDepartmentsSnapshot().map((department) => department.name);
}

export function getDepartments() {
  return ok(getDepartmentsSnapshot());
}

export function getDepartmentById(id) {
  const department = mockDepartments.find((currentDepartment) => currentDepartment.id === Number(id));

  if (!department) {
    return fail("Departamento no encontrado.", 404);
  }

  return ok(clone(department));
}
