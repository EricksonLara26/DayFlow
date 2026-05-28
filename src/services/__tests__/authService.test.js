import {
  clearAuthenticatedUser,
  getStoredAuthenticatedUser,
  login,
  sanitizeAuthenticatedUser,
  storeAuthenticatedUser,
} from "../authService";
import { ROLES } from "../../data/users";

describe("authService", () => {
  const testUsers = [
    {
      id: 1,
      username: "admin",
      email: "admin@test.com",
      password: "1234",
      firstName: "Admin",
      lastName: "User",
      role: ROLES.ADMINISTRATOR,
      active: true,
    },
    {
      id: 2,
      username: "tecnico",
      email: "tech@test.com",
      password: "1234",
      firstName: "Tech",
      lastName: "User",
      role: ROLES.TECHNICIAN,
      active: true,
    },
    {
      id: 3,
      username: "inactive",
      email: "inactive@test.com",
      password: "1234",
      firstName: "In",
      lastName: "Active",
      role: ROLES.EMPLOYEE,
      active: false,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
  });

  describe("login", () => {
    test("autentica con username", () => {
      const result = login({ identifier: "admin", password: "1234" }, testUsers);

      expect(result.ok).toBe(true);
      expect(result.user.username).toBe("admin");
    });

    test("autentica con email", () => {
      const result = login({ identifier: "admin@test.com", password: "1234" }, testUsers);

      expect(result.ok).toBe(true);
      expect(result.user.email).toBe("admin@test.com");
    });

    test("autentica con nombre completo", () => {
      const result = login({ identifier: "Admin User", password: "1234" }, testUsers);

      expect(result.ok).toBe(true);
    });

    test("rechaza contrasena incorrecta", () => {
      const result = login({ identifier: "admin", password: "wrong" }, testUsers);

      expect(result.ok).toBe(false);
      expect(result.message).toContain("incorrectas");
    });

    test("rechaza usuario inactivo", () => {
      const result = login({ identifier: "inactive", password: "1234" }, testUsers);

      expect(result.ok).toBe(false);
      expect(result.message).toContain("inactivo");
    });

    test("busca sin distinguir mayusculas", () => {
      const result = login({ identifier: "ADMIN", password: "1234" }, testUsers);

      expect(result.ok).toBe(true);
    });
  });

  describe("sanitizeAuthenticatedUser", () => {
    test("mapea campos de sesion", () => {
      const user = {
        id: 1,
        username: "test",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
        role: ROLES.ADMINISTRATOR,
        department: "IT",
        position: "Admin",
        active: true,
        mustChangePassword: true,
      };
      const sanitized = sanitizeAuthenticatedUser(user);

      expect(sanitized.username).toBe("test");
      expect(sanitized.role).toBe(ROLES.ADMINISTRATOR);
      expect(sanitized.firstName).toBe("Test");
      expect(sanitized.lastName).toBe("User");
      expect(sanitized.position).toBe("Admin");
      expect(sanitized.mustChangePassword).toBe(true);
      expect(sanitized).not.toHaveProperty("nombre");
      expect(sanitized).not.toHaveProperty("rol");
    });

    test("devuelve null para usuario null", () => {
      expect(sanitizeAuthenticatedUser(null)).toBeNull();
    });
  });

  describe("persistencia en localStorage", () => {
    const user = {
      id: 1,
      username: "test",
      email: "test@test.com",
      firstName: "Test",
      lastName: "User",
      role: ROLES.ADMINISTRATOR,
      department: "IT",
      position: "Admin",
      active: true,
    };

    test("guarda usuario", () => {
      storeAuthenticatedUser(user);

      const stored = JSON.parse(localStorage.getItem("dayflow-auth-user"));
      expect(stored.username).toBe("test");
    });

    test("recupera usuario guardado", () => {
      storeAuthenticatedUser(user);

      const retrieved = getStoredAuthenticatedUser();
      expect(retrieved.username).toBe("test");
    });

    test("limpia usuario guardado", () => {
      storeAuthenticatedUser(user);
      clearAuthenticatedUser();

      expect(getStoredAuthenticatedUser()).toBeNull();
    });

    test("rechaza rol invalido", () => {
      localStorage.setItem("dayflow-auth-user", JSON.stringify({ username: "test", role: "INVALID" }));

      expect(getStoredAuthenticatedUser()).toBeNull();
      expect(localStorage.getItem("dayflow-auth-user")).toBeNull();
    });
  });
});
