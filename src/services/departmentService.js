import { createCatalogService } from "./catalogServiceFactory";

const departments = createCatalogService({
  resource: "departments",
  singularLabel: "Departamento",
});

export function getDepartmentsSnapshot(filters = {}) {
  return departments.getSnapshot(filters);
}

export function getDepartmentNamesSnapshot() {
  return departments.getNamesSnapshot();
}

export function getDepartments(filters = {}) {
  return departments.list(filters);
}

export function getActiveDepartments(filters = {}) {
  return departments.list({ ...filters, active: true });
}

export function getDepartmentById(id) {
  return departments.retrieve(id);
}

export function createDepartment(payload) {
  return departments.create(payload);
}

export function updateDepartment(id, payload) {
  return departments.update(id, payload);
}

export function deactivateDepartment(id) {
  return departments.deactivate(id);
}

export const deleteDepartment = deactivateDepartment;

export function activateDepartment(id) {
  return departments.activate(id);
}

export function clearDepartmentsCache() {
  departments.clearCache();
}
