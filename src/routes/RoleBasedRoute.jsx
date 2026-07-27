import { Navigate } from "react-router";

import { VIEW_IDS, canAccessView } from "../config/permissions";
import { getPathForView } from "./routeConfig";

export default function RoleBasedRoute({ children, currentUser, view }) {
  if (!canAccessView(currentUser, view)) {
    return <Navigate replace to={getPathForView(VIEW_IDS.ACCESS_DENIED)} />;
  }

  return children;
}
