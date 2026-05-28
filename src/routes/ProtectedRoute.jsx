import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LOGIN_PATH } from "./routeConfig";

export default function ProtectedRoute({ children, currentUser }) {
  const location = useLocation();

  if (!currentUser) {
    return <Navigate replace state={{ from: location }} to={LOGIN_PATH} />;
  }

  return children ?? <Outlet />;
}
