// Busca el nombre visible de un bloque usando su id interno.
export function getAreaName(areas, areaId) {
  return areas.find((area) => area.id === areaId)?.name ?? "Sin área";
}

// Convierte el nombre escrito por el usuario en un id estable para nuevos bloques.
export function toAreaId(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `bloque-${Date.now()}`
  );
}
