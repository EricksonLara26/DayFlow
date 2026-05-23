import { VIEW_IDS } from "../config/permissions";

const TICKET_DETAIL_ROUTE = "detalle-solicitud";

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
  [VIEW_IDS.TICKET_DETAIL]: TICKET_DETAIL_ROUTE,
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

function getRouteFromHash(hash = window.location.hash) {
  return hash.replace(/^#\/?/, "").trim();
}

function getTicketIdFromRoute(route) {
  const match = route.match(new RegExp(`^${TICKET_DETAIL_ROUTE}/(\\d+)$`));
  return match ? Number(match[1]) : null;
}

export function getViewFromHash(hash = window.location.hash) {
  const route = getRouteFromHash(hash);

  if (getTicketIdFromRoute(route)) {
    return VIEW_IDS.TICKET_DETAIL;
  }

  if (route === TICKET_DETAIL_ROUTE) {
    return null;
  }

  return VIEWS_BY_ROUTE[route] ?? null;
}

export function getTicketIdFromHash(hash = window.location.hash) {
  return getTicketIdFromRoute(getRouteFromHash(hash));
}

export function setHashForView(view) {
  const nextHash = `#/${getRouteForView(view)}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}

export function setHashForTicket(ticketId) {
  const nextHash = `#/${TICKET_DETAIL_ROUTE}/${ticketId}`;

  if (window.location.hash !== nextHash) {
    window.location.hash = nextHash;
  }
}
