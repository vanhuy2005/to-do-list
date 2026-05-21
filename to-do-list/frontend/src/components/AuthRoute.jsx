import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import authService from "@/services/authService";

function AuthBootScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="rounded-[1.75rem] border-4 border-border bg-card px-6 py-8 comic-shadow">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground">
          Đang đồng bộ phiên đăng nhập...
        </p>
      </div>
    </div>
  );
}

export default function AuthRoute({ children }) {
  const [searchParams] = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(authService.isAuthenticated());

  useEffect(() => {
    let isMounted = true;
    const hasOAuthError = searchParams.get("oauth") === "error";

    const hydrate = async () => {
      if (!authService.isAuthenticated() && !hasOAuthError) {
        await authService.hydrateFromSessionCookie();
      }

      if (isMounted) {
        setIsAuthed(authService.isAuthenticated());
        setIsChecking(false);
      }
    };

    hydrate();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  if (isChecking) {
    return <AuthBootScreen />;
  }

  if (isAuthed) {
    return (
      <Navigate
        to={authService.getDefaultRouteByRole(authService.getRole())}
        replace
      />
    );
  }

  return children;
}
