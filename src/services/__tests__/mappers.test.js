import { ROLES } from "../../config/roles";
import {
  backendToFrontend,
  camelToSnake,
  frontendToBackend,
  snakeToCamel,
  ticketAttachmentToFormData,
  ticketBackendToFrontend,
  ticketFrontendToBackend,
  toCanonicalRole,
  toFrontendRole,
  userBackendToFrontend,
  userFrontendToBackend,
} from "../mappers";

describe("mappers de la frontera API", () => {
  test("convierte nombres snake_case y camelCase", () => {
    expect(snakeToCamel("must_change_password")).toBe(
      "mustChangePassword",
    );
    expect(camelToSnake("assignedTechnicianId")).toBe(
      "assigned_technician_id",
    );
  });

  test("convierte estructuras profundas sin mutar el origen", () => {
    const backendPayload = {
      total_tickets: 3,
      nested_items: [
        {
          created_at: "2026-07-27T10:00:00Z",
          role: "TECHNICIAN",
        },
      ],
    };

    const frontendPayload = backendToFrontend(backendPayload);

    expect(frontendPayload).toEqual({
      totalTickets: 3,
      nestedItems: [
        {
          createdAt: "2026-07-27T10:00:00Z",
          role: ROLES.TECHNICIAN,
        },
      ],
    });
    expect(backendPayload.nested_items[0].role).toBe("TECHNICIAN");
  });

  test("normaliza roles españoles y canónicos en ambos sentidos", () => {
    expect(toCanonicalRole("ADMINISTRADOR")).toBe("ADMINISTRATOR");
    expect(toCanonicalRole("TECNICO")).toBe("TECHNICIAN");
    expect(toCanonicalRole("TÉCNICO")).toBe("TECHNICIAN");
    expect(toCanonicalRole("EMPLEADO")).toBe("EMPLOYEE");
    expect(toFrontendRole("ADMINISTRATOR")).toBe(ROLES.ADMINISTRATOR);
    expect(toFrontendRole("TECHNICIAN")).toBe(ROLES.TECHNICIAN);
    expect(toFrontendRole("EMPLOYEE")).toBe(ROLES.EMPLOYEE);

    expect(
      frontendToBackend({
        role: ROLES.ADMINISTRATOR,
        mustChangePassword: true,
      }),
    ).toEqual({
      role: "ADMINISTRATOR",
      must_change_password: true,
    });
  });

  test("mapea usuario del backend al contrato actual del frontend", () => {
    const user = userBackendToFrontend({
      id: 9,
      first_name: "Tania",
      last_name: "Técnica",
      department: 4,
      department_name: "Tecnología",
      role: "TECHNICIAN",
      is_active: true,
      must_change_password: false,
    });

    expect(user).toEqual(
      expect.objectContaining({
        id: 9,
        firstName: "Tania",
        lastName: "Técnica",
        department: "Tecnología",
        departmentId: 4,
        role: ROLES.TECHNICIAN,
        active: true,
        mustChangePassword: false,
      }),
    );
  });

  test("mapea usuario al backend resolviendo departamento por nombre", () => {
    const payload = userFrontendToBackend(
      {
        firstName: "Elena",
        lastName: "Empleada",
        email: "elena@example.test",
        department: "Operaciones",
        role: ROLES.EMPLOYEE,
      },
      {
        departments: [{ id: 6, name: "Operaciones" }],
      },
    );

    expect(payload).toEqual(
      expect.objectContaining({
        first_name: "Elena",
        last_name: "Empleada",
        department: 6,
        role: "EMPLOYEE",
      }),
    );
  });

  test("mapea ticket, comentarios, historial y adjuntos", () => {
    const ticket = ticketBackendToFrontend({
      id: 15,
      title: "Equipo sin red",
      category: 3,
      category_name: "Hardware",
      requester: 8,
      requester_name: "Elena Empleada",
      requester_department: 6,
      requester_department_name: "Operaciones",
      assigned_technician: 9,
      assigned_technician_name: "Tania Técnica",
      due_date: null,
      comments: [
        {
          id: 1,
          author: 8,
          author_name: "Elena Empleada",
          author_role: "EMPLOYEE",
        },
      ],
      attachments: [
        {
          id: 2,
          file_name: "evidencia.pdf",
          mime_type: "application/pdf",
          size_bytes: 128,
          created_at: "2026-07-27T12:00:00Z",
        },
      ],
      history_entries: [
        {
          id: 3,
          actor: 9,
          actor_name: "Tania Técnica",
          action: "Ticket tomado",
        },
      ],
    });

    expect(ticket).toEqual(
      expect.objectContaining({
        category: "Hardware",
        categoryId: 3,
        createdBy: 8,
        assignedTo: 9,
        department: "Operaciones",
        departmentId: 6,
        dueDate: "",
      }),
    );
    expect(ticket.comments[0]).toEqual(
      expect.objectContaining({
        authorId: 8,
        role: ROLES.EMPLOYEE,
      }),
    );
    expect(ticket.evidence).toEqual(
      expect.objectContaining({
        name: "evidencia.pdf",
        size: 128,
        type: "application/pdf",
      }),
    );
    expect(ticket.history[0]).toEqual(
      expect.objectContaining({
        userId: 9,
        userName: "Tania Técnica",
      }),
    );
  });

  test("mapea creación de ticket con ID canónico de categoría", () => {
    const payload = ticketFrontendToBackend(
      {
        title: "Solicitud",
        description: "Descripción",
        category: "Hardware",
        priority: "HIGH",
        dueDate: "",
      },
      {
        categories: [{ id: 3, name: "Hardware" }],
      },
    );

    expect(payload).toEqual({
      title: "Solicitud",
      description: "Descripción",
      category: 3,
      priority: "HIGH",
      due_date: null,
    });
  });

  test("crea FormData sin transformar el archivo ni fijar Content-Type", () => {
    const file = new File(["contenido"], "evidencia.txt", {
      type: "text/plain",
    });
    const formData = ticketAttachmentToFormData({
      file,
      description: "Diagnóstico",
    });

    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("file")).toBe(file);
    expect(formData.get("description")).toBe("Diagnóstico");
    expect(frontendToBackend(formData)).toBe(formData);
  });
});
