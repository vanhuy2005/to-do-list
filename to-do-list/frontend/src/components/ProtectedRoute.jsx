import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import authService from "@/services/authService";

function AuthBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="rounded-[1.75rem] border-4 border-border bg-card px-6 py-8 comic-shadow">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          Đang khôi phục phiên đăng nhập...
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(!authService.isAuthenticated());

  useEffect(() => {
    let isMounted = true;

    if (authService.isAuthenticated()) {
      setIsChecking(false);
      return undefined;
    }

    authService.hydrateFromSessionCookie().finally(() => {
      if (isMounted) {
        setIsChecking(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isChecking) {
    return <AuthBootScreen />;
  }

  if (!authService.isAuthenticated()) {
    return <Navigate to="/splash" replace state={{ from: location }} />;
  }

  // const role = authService.getRole();
  // const isDashboardPath = location.pathname.startsWith("/dashboard");

  // if (role === "admin" && !isDashboardPath) {
  //   return <Navigate to="/dashboard" replace />;
  // }

  // if (role === "user" && isDashboardPath) {
  //   return <Navigate to="/" replace />;
  // }

  return children;
}
