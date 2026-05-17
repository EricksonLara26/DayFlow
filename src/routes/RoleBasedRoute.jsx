import { canAccessView } from "../config/permissions";

export default function RoleBasedRoute({ children, currentUser, fallback, view }) {
  return canAccessView(currentUser, view) ? children : fallback;
}
