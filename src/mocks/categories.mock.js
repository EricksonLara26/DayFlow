export const mockCategories = [
  {
    id: 1,
    name: "Soporte Técnico",
    description: "Atención general de soporte técnico",
    active: true,
  },
  {
    id: 2,
    name: "Redes",
    description: "Conectividad, VPN y servicios de red",
    active: true,
  },
  {
    id: 3,
    name: "Hardware",
    description: "Equipos físicos y periféricos",
    active: true,
  },
  {
    id: 4,
    name: "Software",
    description: "Aplicaciones, licencias e instalaciones",
    active: true,
  },
  {
    id: 5,
    name: "Accesos",
    description: "Permisos, usuarios y carpetas compartidas",
    active: true,
  },
  {
    id: 6,
    name: "Impresoras",
    description: "Impresión y escaneo",
    active: true,
  },
  {
    id: 7,
    name: "Correo",
    description: "Cuentas, buzones y firmas de correo",
    active: true,
  },
  {
    id: 8,
    name: "Otro",
    description: "Solicitudes fuera de las categorías principales",
    active: true,
  },
];

export const TICKET_CATEGORIES = mockCategories.map((category) => category.name);
