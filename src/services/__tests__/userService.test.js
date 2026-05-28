import {
  createLocalUser,
  deactivateLocalUser,
  resetLocalUserPassword,
  updateLocalUser,
} from "../userService";
import { ROLES } from "../../data/users";

describe("userService", () => {
  const initialUsers = [
    {
      id: 1,
      username: "user1",
      email: "user1@test.com",
      firstName: "User",
      lastName: "One",
      role: ROLES.EMPLOYEE,
      active: true,
    },
  ];

  describe("createLocalUser", () => {
    test("crea usuario con ID autoincremental", () => {
      const result = createLocalUser(initialUsers, {
        username: "newuser",
        email: "new@test.com",
        firstName: "New",
        lastName: "User",
        role: ROLES.TECHNICIAN,
        position: "Support",
      });

      expect(result.at(-1).id).toBe(2);
      expect(result.at(-1).username).toBe("newuser");
      expect(result.at(-1).position).toBe("Support");
    });

    test("aplica rol default si no viene", () => {
      const result = createLocalUser(initialUsers, {
        username: "newuser",
        email: "new@test.com",
        firstName: "New",
        lastName: "User",
      });

      expect(result.at(-1).role).toBe(ROLES.EMPLOYEE);
    });

    test("mantiene usuarios previos", () => {
      const result = createLocalUser(initialUsers, {
        username: "newuser",
        email: "new@test.com",
        firstName: "New",
        lastName: "User",
      });

      expect(result[0].id).toBe(1);
    });
  });

  describe("updateLocalUser", () => {
    test("actualiza nombre", () => {
      const result = updateLocalUser(initialUsers, 1, { firstName: "Updated", lastName: "Name" });

      expect(result.find((user) => user.id === 1).firstName).toBe("Updated");
      expect(result.find((user) => user.id === 1).lastName).toBe("Name");
      expect(result.find((user) => user.id === 1)).not.toHaveProperty("nombre");
    });

    test("mantiene campos no actualizados", () => {
      const result = updateLocalUser(initialUsers, 1, { firstName: "Updated" });

      expect(result.find((user) => user.id === 1).username).toBe("user1");
    });
  });

  describe("deactivateLocalUser", () => {
    test("marca como inactivo", () => {
      const result = deactivateLocalUser(initialUsers, 1);

      expect(result.find((user) => user.id === 1).active).toBe(false);
    });
  });

  describe("resetLocalUserPassword", () => {
    test("resetea a contrasena default", () => {
      const result = resetLocalUserPassword(initialUsers, 1);

      expect(result.find((user) => user.id === 1).password).toBe("1234");
    });

    test("resetea a contrasena custom", () => {
      const result = resetLocalUserPassword(initialUsers, 1, "newpass");

      expect(result.find((user) => user.id === 1).password).toBe("newpass");
    });

    test("marca cambio obligatorio con contrasena temporal", () => {
      const result = resetLocalUserPassword(initialUsers, 1, "temporal", {
        mustChangePassword: true,
      });
      const updatedUser = result.find((user) => user.id === 1);

      expect(updatedUser.password).toBe("temporal");
      expect(updatedUser.mustChangePassword).toBe(true);
    });
  });
});
