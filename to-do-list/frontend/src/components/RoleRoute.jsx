import { Navigate } from "react-router-dom";
import authService from "@/services/authService";

export default function RoleRoute({
  children,
  allowRoles = [],
  fallbackPath,
}) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = authService.getRole();

  if (!allowRoles.includes(role)) {
    return (
      <Navigate
        to={fallbackPath || authService.getDefaultRouteByRole(role)}
        replace
      />
    );
  }

  return children;
}
