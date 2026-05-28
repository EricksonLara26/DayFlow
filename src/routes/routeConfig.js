import { VIEW_IDS } from "../config/permissions";

export const LOGIN_PATH = "/login";

export const ROUTES_BY_VIEW = {
  [VIEW_IDS.ACCESS_DENIED]: "/access-denied",
  [VIEW_IDS.AVAILABLE_TICKETS]: "/tickets/available",
  [VIEW_IDS.DASHBOARD]: "/dashboard",
  [VIEW_IDS.HISTORY]: "/tickets/history",
  [VIEW_IDS.INFORMATION]: "/information",
  [VIEW_IDS.MY_TICKETS]: "/tickets/assigned",
  [VIEW_IDS.PROFILE]: "/profile",
  [VIEW_IDS.RANKING]: "/reports/ranking",
  [VIEW_IDS.REPORTS]: "/reports",
  [VIEW_IDS.SETTINGS]: "/settings",
  [VIEW_IDS.TICKET_DETAIL]: "/tickets/:id",
  [VIEW_IDS.TICKETS]: "/tickets",
  [VIEW_IDS.CREATE_TICKET]: "/tickets/new",
  [VIEW_IDS.USERS]: "/users",
};

const STATIC_ROUTES = Object.entries(ROUTES_BY_VIEW).filter(([, path]) => !path.includes(":"));

function normalizePathname(pathname) {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;
}

export function getPathForView(view, params = {}) {
  if (view === VIEW_IDS.TICKET_DETAIL) {
    return params.ticketId ? `/tickets/${params.ticketId}` : ROUTES_BY_VIEW[VIEW_IDS.TICKET_DETAIL];
  }

  return ROUTES_BY_VIEW[view] ?? ROUTES_BY_VIEW[VIEW_IDS.DASHBOARD];
}

export function getRoutePatternForView(view) {
  return getPathForView(view).replace(/^\//, "");
}

export function getViewFromPathname(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  const staticMatch = STATIC_ROUTES.find(([, path]) => path === normalizedPathname);

  if (staticMatch) {
    return staticMatch[0];
  }

  if (/^\/tickets\/[^/]+$/.test(normalizedPathname)) {
    return VIEW_IDS.TICKET_DETAIL;
  }

  return null;
}
