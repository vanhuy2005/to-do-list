import { Navigate, useLocation } from "react-router-dom";
import authService from "@/services/authService";

export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = authService.getRole();
  const isDashboardPath = location.pathname.startsWith("/dashboard");

  if (role === "admin" && !isDashboardPath) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === "user" && isDashboardPath) {
    return <Navigate to="/" replace />;
  }

  return children;
}
