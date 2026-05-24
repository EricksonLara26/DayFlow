export const mockDepartments = [
  {
    id: 1,
    name: "Tecnologia",
    description: "Area de tecnologia y soporte",
    active: true,
  },
  {
    id: 2,
    name: "Soporte Tecnico",
    description: "Mesa de ayuda y atencion tecnica",
    active: true,
  },
  {
    id: 3,
    name: "Administracion",
    description: "Gestion administrativa interna",
    active: true,
  },
  {
    id: 4,
    name: "Operaciones",
    description: "Operaciones del negocio",
    active: true,
  },
  {
    id: 5,
    name: "Ventas",
    description: "Equipo comercial",
    active: true,
  },
];

export const DEPARTMENT_NAMES = mockDepartments.map((department) => department.name);
