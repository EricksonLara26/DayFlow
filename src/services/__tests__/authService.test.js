import { ROLES } from "../../data/users";
import {
  clearAuthenticatedUser,
  getStoredAuthenticatedUser,
  sanitizeAuthenticatedUser,
  storeAuthenticatedUser,
} from "../authService";

describe("authService storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("sanitiza usuario y normaliza el rol canónico", () => {
    const sanitized = sanitizeAuthenticatedUser({
      id: 1,
      username: "test",
      email: "test@example.test",
      first_name: "Test",
      last_name: "User",
      role: "ADMINISTRATOR",
      department: 4,
      department_name: "Tecnología",
      position: "Admin",
      is_active: true,
      must_change_password: true,
      password: "no-debe-salir",
    });

    expect(sanitized).toEqual(
      expect.objectContaining({
        firstName: "Test",
        lastName: "User",
        role: ROLES.ADMINISTRATOR,
        department: "Tecnología",
        departmentId: 4,
        active: true,
        mustChangePassword: true,
      }),
    );
    expect(sanitized).not.toHaveProperty("password");
  });

  test("devuelve null para usuario ausente", () => {
    expect(sanitizeAuthenticatedUser(null)).toBeNull();
  });

  test("guarda, recupera y limpia el usuario sin contraseña", () => {
    storeAuthenticatedUser({
      id: 2,
      username: "tecnico",
      email: "tecnico@example.test",
      firstName: "Tania",
      lastName: "Técnica",
      role: ROLES.TECHNICIAN,
      department: "Tecnología",
      active: true,
    });

    const raw = JSON.parse(
      window.localStorage.getItem("dayflow-auth-user"),
    );
    expect(raw).not.toHaveProperty("password");
    expect(getStoredAuthenticatedUser().username).toBe("tecnico");

    clearAuthenticatedUser();
    expect(getStoredAuthenticatedUser()).toBeNull();
  });

  test("elimina una sesión almacenada con rol inválido", () => {
    window.localStorage.setItem(
      "dayflow-auth-user",
      JSON.stringify({ username: "test", role: "INVALID" }),
    );

    expect(getStoredAuthenticatedUser()).toBeNull();
    expect(
      window.localStorage.getItem("dayflow-auth-user"),
    ).toBeNull();
  });
});
