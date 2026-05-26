import { mockCategories } from "../mocks";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ok(data, extra = {}) {
  return Promise.resolve({ ok: true, data, ...extra });
}

function fail(message, status = 400) {
  return Promise.resolve({ ok: false, status, message, error: { message, status } });
}

export function getCategoriesSnapshot() {
  return clone(mockCategories);
}

export function getCategoryNamesSnapshot() {
  return getCategoriesSnapshot().map((category) => category.name);
}

export function getCategories() {
  return ok(getCategoriesSnapshot());
}

export function getCategoryById(id) {
  const category = mockCategories.find((currentCategory) => currentCategory.id === Number(id));

  if (!category) {
    return fail("Categoria no encontrada.", 404);
  }

  return ok(clone(category));
}
