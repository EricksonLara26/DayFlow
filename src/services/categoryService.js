import { createCatalogService } from "./catalogServiceFactory";

const categories = createCatalogService({
  resource: "categories",
  singularLabel: "Categoría",
});

export function getCategoriesSnapshot(filters = {}) {
  return categories.getSnapshot(filters);
}

export function getCategoryNamesSnapshot() {
  return categories.getNamesSnapshot();
}

export function getCategories(filters = {}) {
  return categories.list(filters);
}

export function getActiveCategories(filters = {}) {
  return categories.list({ ...filters, active: true });
}

export function getCategoryById(id) {
  return categories.retrieve(id);
}

export function createCategory(payload) {
  return categories.create(payload);
}

export function updateCategory(id, payload) {
  return categories.update(id, payload);
}

export function deactivateCategory(id) {
  return categories.deactivate(id);
}

export const deleteCategory = deactivateCategory;

export function activateCategory(id) {
  return categories.activate(id);
}

export function clearCategoriesCache() {
  categories.clearCache();
}
