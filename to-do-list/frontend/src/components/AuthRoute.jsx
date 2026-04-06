import { Navigate } from "react-router-dom";
import authService from "@/services/authService";

export default function AuthRoute({ children }) {
  const token = authService.getToken();

  if (token) {
    // Nếu đã đăng nhập, không cho phép truy cập lại auth route (ví dụ /login, /register)
    return <Navigate to="/" replace />;
  }

  return children;
}
