import { Outlet, useLocation } from "react-router-dom";
import AppBar from "@/components/AppBar";
import BottomNav from "@/components/BottomNav";
import SidebarNav from "@/components/SidebarNav";
import AdminNavigationSidebar from "@/components/admin/AdminNavigationSidebar";
import AdminBottomNav from "@/components/admin/AdminBottomNav";
import HomePage from "@/pages/HomePage";
import authService from "@/services/authService";

export default function MainLayout() {
  const location = useLocation();
  const isTaskModalRoute = /^\/tasks\/(new|[^/]+|[^/]+\/edit)$/.test(
    location.pathname,
  );
  const isAdmin = authService.getRole() === "admin";

  return (
    <div className="relative flex min-h-screen h-dvh flex-col overflow-x-hidden bg-background text-foreground">
      {/* Comic dots background — desktop only */}
      <div className="comic-dots-bg fixed inset-0 z-0 hidden lg:block" />

      {/* Full-width top app bar */}
      <div className="relative z-20">
        <AppBar />
      </div>

      {/* Sidebar is now below app bar */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {isAdmin ? <AdminNavigationSidebar /> : <SidebarNav />}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="w-full flex-1 overflow-auto scrollbar-hide px-3 py-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:px-5 lg:py-4 lg:pb-8 min-h-0">
            {isTaskModalRoute ? (
              <>
                <HomePage />
                <Outlet />
              </>
            ) : (
              <Outlet />
            )}
          </main>

          {/* Mobile-only BottomNav */}
          {isAdmin ? <AdminBottomNav /> : <BottomNav />}
        </div>
      </div>
    </div>
  );
}
