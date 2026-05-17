import { VIEW_IDS } from "../config/permissions";

export const ROUTES_BY_VIEW = {
  [VIEW_IDS.ACCESS_DENIED]: "acceso-denegado",
  [VIEW_IDS.AVAILABLE_TICKETS]: "solicitudes-disponibles",
  [VIEW_IDS.DASHBOARD]: "inicio",
  [VIEW_IDS.HISTORY]: "historial",
  [VIEW_IDS.INFORMATION]: "panel-informacion",
  [VIEW_IDS.MY_TICKETS]: "mis-solicitudes",
  [VIEW_IDS.PROFILE]: "perfil",
  [VIEW_IDS.RANKING]: "metricas",
  [VIEW_IDS.REPORTS]: "informes",
  [VIEW_IDS.TICKET_DETAIL]: "detalle-solicitud",
  [VIEW_IDS.TICKETS]: "solicitudes",
  [VIEW_IDS.CREATE_TICKET]: "crear-solicitud",
  [VIEW_IDS.USERS]: "usuarios",
};

export const VIEWS_BY_ROUTE = Object.fromEntries(
  Object.entries(ROUTES_BY_VIEW).map(([view, route]) => [route, view]),
);

export function getRouteForView(view) {
  return ROUTES_BY_VIEW[view] ?? ROUTES_BY_VIEW[VIEW_IDS.DASHBOARD];
}

export function getViewFromHash(hash = window.location.hash) {
  const route = hash.replace(/^#\/?/, "").trim();

  return VIEWS_BY_ROUTE[route] ?? null;
}

export function setHashForView(view) {
  const nextHash = `#/${getRouteForView(view)}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}
