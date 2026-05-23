import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import authService from "@/services/authService";

export default function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate(authService.getDefaultRouteByRole(authService.getRole()), {
        replace: true,
      });
    }
  }, [navigate]);

  return (
    <div className="relative h-dvh overflow-hidden bg-background p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(255,45,85,0.16),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(0,194,255,0.18),transparent_36%),radial-gradient(circle_at_38%_88%,rgba(255,214,10,0.24),transparent_34%)]" />
      <div className="pointer-events-none absolute -left-24 top-16 hidden h-56 w-56 rounded-full border-[6px] border-border/25 bg-[#ffd60a]/45 lg:block" />
      <div className="pointer-events-none absolute -right-16 bottom-12 hidden h-44 w-44 -rotate-12 rounded-[2rem] border-[6px] border-border/25 bg-[#00c2ff]/40 lg:block" />

      <main className="relative mx-auto flex h-full w-full max-w-4xl flex-col items-center justify-center text-center">
        <img
          src="/logo-tasket.png"
          alt="Tasket"
          className="mx-auto max-h-[50dvh] w-full max-w-140 object-contain"
        />

        <Button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-8 h-13 rounded-full border-[3px] border-border bg-primary px-10 text-base font-black tracking-wide text-primary-foreground comic-shadow active:translate-y-1 sm:h-14 sm:px-14 sm:text-lg"
        >
          Bắt đầu ngay
        </Button>
      </main>
    </div>
  );
}
