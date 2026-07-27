import {
  activateCategory,
  clearCategoriesCache,
  createCategory,
  deactivateCategory,
  getCategories,
  getCategoryNamesSnapshot,
  updateCategory,
} from "../categoryService";
import {
  clearDepartmentsCache,
  getDepartmentById,
  getDepartmentNamesSnapshot,
  getDepartments,
} from "../departmentService";
import {
  clearAccessToken,
  setAccessToken,
} from "../tokenStorage";

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => "application/json",
    },
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(""),
  };
}

function catalog(overrides = {}) {
  return {
    id: 4,
    name: "Hardware",
    description: "Equipos físicos",
    active: true,
    created_at: "2026-07-27T12:00:00Z",
    updated_at: "2026-07-27T12:00:00Z",
    ...overrides,
  };
}

describe("departmentService y categoryService API", () => {
  beforeEach(() => {
    clearCategoriesCache();
    clearDepartmentsCache();
    clearAccessToken();
    window.sessionStorage.clear();
    setAccessToken("access-catalogs", "2099-01-01T00:00:00Z");
    global.fetch = jest.fn();
  });

  afterEach(() => {
    clearCategoriesCache();
    clearDepartmentsCache();
    clearAccessToken();
    jest.restoreAllMocks();
    delete global.fetch;
  });

  test("lista departamentos paginados y ofrece solo nombres activos", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        count: 2,
        next: null,
        previous: null,
        results: [
          catalog({ id: 2, name: "Tecnología" }),
          catalog({ id: 3, name: "Archivado", active: false }),
        ],
      }),
    );

    const result = await getDepartments({ active: "all" });

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        createdAt: "2026-07-27T12:00:00Z",
      }),
    );
    expect(result.pagination.count).toBe(2);
    expect(getDepartmentNamesSnapshot()).toEqual(["Tecnología"]);

    const requestUrl = new URL(fetch.mock.calls[0][0]);
    expect(requestUrl.searchParams.get("active")).toBe("all");
    expect(requestUrl.searchParams.get("page_size")).toBe("100");
  });

  test("consulta un departamento por ID y conserva 404", async () => {
    fetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Departamento no encontrado.",
            fields: {},
          },
          404,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(catalog({ id: 2, name: "Tecnología" })),
      );

    const missing = await getDepartmentById(99);
    const found = await getDepartmentById(2);

    expect(missing.status).toBe(404);
    expect(found.data.name).toBe("Tecnología");
  });

  test("crea, edita, desactiva y reactiva una categoría", async () => {
    fetch
      .mockResolvedValueOnce(
        jsonResponse(catalog({ id: 9, name: "Telefonía" }), 201),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          catalog({
            id: 9,
            name: "Telefonía",
            description: "Extensiones",
          }),
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          message: "Elemento desactivado correctamente.",
          data: catalog({
            id: 9,
            name: "Telefonía",
            active: false,
          }),
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          message: "Elemento activado correctamente.",
          data: catalog({ id: 9, name: "Telefonía" }),
        }),
      );

    const created = await createCategory({
      name: " Telefonía ",
      description: " Comunicaciones ",
    });
    const updated = await updateCategory(9, {
      description: "Extensiones",
    });
    const deactivated = await deactivateCategory(9);
    const activated = await activateCategory(9);

    expect(created.status).toBe(201);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      name: "Telefonía",
      description: "Comunicaciones",
    });
    expect(updated.data.description).toBe("Extensiones");
    expect(deactivated.data.active).toBe(false);
    expect(activated.data.active).toBe(true);
    expect(getCategoryNamesSnapshot()).toEqual(["Telefonía"]);
    expect(fetch.mock.calls[2][0]).toContain(
      "/categories/9/deactivate/",
    );
    expect(fetch.mock.calls[3][0]).toContain(
      "/categories/9/activate/",
    );
  });

  test("lista categorías activas para formularios", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        count: 1,
        next: null,
        previous: null,
        results: [catalog()],
      }),
    );

    const result = await getCategories();

    expect(result.data).toHaveLength(1);
    expect(getCategoryNamesSnapshot()).toEqual(["Hardware"]);
  });
});
