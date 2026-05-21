import { Navigate } from "react-router-dom";
import authService from "@/services/authService";

export default function AuthRoute({ children }) {
  if (authService.isAuthenticated()) {
    return (
      <Navigate
        to={authService.getDefaultRouteByRole(authService.getRole())}
        replace
      />
    );
  }

  return children;
}
