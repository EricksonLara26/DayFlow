import {
  VIEW_IDS,
  canAccessView,
  canCreateTicket,
  canCreateUser,
  canDeactivateUser,
  canDownloadReports,
  canEditUser,
  canResetUserPassword,
  getNavigationItems,
} from "../permissions";
import { ROLES } from "../../data/users";

describe("permissions", () => {
  const admin = { id: 1, role: ROLES.ADMINISTRATOR, active: true };
  const tech = { id: 2, role: ROLES.TECHNICIAN, active: true };
  const emp = { id: 3, role: ROLES.EMPLOYEE, active: true };
  const inactiveEmp = { id: 4, role: ROLES.EMPLOYEE, active: false };

  describe("canAccessView", () => {
    test("admin accede a vistas administrativas", () => {
      expect(canAccessView(admin, VIEW_IDS.DASHBOARD)).toBe(true);
      expect(canAccessView(admin, VIEW_IDS.USERS)).toBe(true);
      expect(canAccessView(admin, VIEW_IDS.REPORTS)).toBe(true);
    });

    test("tecnico accede a panel de informacion pero no a usuarios o informes", () => {
      expect(canAccessView(tech, VIEW_IDS.INFORMATION)).toBe(true);
      expect(canAccessView(tech, VIEW_IDS.USERS)).toBe(false);
      expect(canAccessView(tech, VIEW_IDS.REPORTS)).toBe(false);
    });

    test("empleado accede solo a vistas basicas", () => {
      expect(canAccessView(emp, VIEW_IDS.DASHBOARD)).toBe(true);
      expect(canAccessView(emp, VIEW_IDS.CREATE_TICKET)).toBe(true);
      expect(canAccessView(emp, VIEW_IDS.USERS)).toBe(false);
    });

    test("usuario null no accede", () => {
      expect(canAccessView(null, VIEW_IDS.DASHBOARD)).toBe(false);
    });
  });

  describe("getNavigationItems", () => {
    test("admin no muestra metricas duplicadas en la navegacion", () => {
      const items = getNavigationItems(admin);

      expect(items.map((item) => item.id)).toEqual([
        VIEW_IDS.DASHBOARD,
        VIEW_IDS.TICKETS,
        VIEW_IDS.INFORMATION,
        VIEW_IDS.USERS,
        VIEW_IDS.REPORTS,
      ]);
    });

    test("tecnico muestra panel de informacion y no muestra usuarios", () => {
      const items = getNavigationItems(tech);

      expect(items.map((item) => item.id)).toEqual([
        VIEW_IDS.DASHBOARD,
        VIEW_IDS.TICKETS,
        VIEW_IDS.AVAILABLE_TICKETS,
        VIEW_IDS.MY_TICKETS,
        VIEW_IDS.HISTORY,
        VIEW_IDS.INFORMATION,
      ]);
    });

    test("empleado no muestra crear solicitud duplicado en la navegacion", () => {
      const items = getNavigationItems(emp);

      expect(items.map((item) => item.id)).toEqual([VIEW_IDS.DASHBOARD, VIEW_IDS.TICKETS]);
    });
  });

  describe("canCreateTicket", () => {
    test("solo empleado crea solicitudes", () => {
      expect(canCreateTicket(admin)).toBe(false);
      expect(canCreateTicket(tech)).toBe(false);
      expect(canCreateTicket(emp)).toBe(true);
    });
  });

  describe("canCreateUser", () => {
    test("solo admin crea usuarios", () => {
      expect(canCreateUser(admin)).toBe(true);
      expect(canCreateUser(tech)).toBe(false);
      expect(canCreateUser(emp)).toBe(false);
    });
  });

  describe("canEditUser", () => {
    test("admin edita a cualquiera", () => {
      expect(canEditUser(admin, tech)).toBe(true);
      expect(canEditUser(admin, emp)).toBe(true);
    });

    test("tecnico edita solo empleados", () => {
      expect(canEditUser(tech, emp)).toBe(true);
      expect(canEditUser(tech, tech)).toBe(false);
      expect(canEditUser(tech, admin)).toBe(false);
    });

    test("empleado no edita usuarios", () => {
      expect(canEditUser(emp, emp)).toBe(false);
    });
  });

  describe("canDeactivateUser", () => {
    test("admin desactiva a cualquiera excepto a si mismo", () => {
      expect(canDeactivateUser(admin, tech)).toBe(true);
      expect(canDeactivateUser(admin, admin)).toBe(false);
    });

    test("no desactiva usuarios inactivos ni sin permisos", () => {
      expect(canDeactivateUser(admin, inactiveEmp)).toBe(false);
      expect(canDeactivateUser(tech, emp)).toBe(false);
    });
  });

  describe("canResetUserPassword", () => {
    test("admin restablece contrasenas de otros usuarios activos", () => {
      expect(canResetUserPassword(admin, tech)).toBe(true);
      expect(canResetUserPassword(admin, admin)).toBe(false);
    });

    test("tecnico restablece solo empleados activos", () => {
      expect(canResetUserPassword(tech, emp)).toBe(true);
      expect(canResetUserPassword(tech, admin)).toBe(false);
      expect(canResetUserPassword(tech, inactiveEmp)).toBe(false);
    });
  });

  describe("canDownloadReports", () => {
    test("solo admin descarga reportes", () => {
      expect(canDownloadReports(admin)).toBe(true);
      expect(canDownloadReports(tech)).toBe(false);
      expect(canDownloadReports(emp)).toBe(false);
    });
  });
});
