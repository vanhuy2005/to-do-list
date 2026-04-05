import { Outlet, useLocation } from "react-router-dom";
import AppBar from "@/components/AppBar";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";

export default function MainLayout() {
  const location = useLocation();
  const isTaskModalRoute = /^\/tasks\/(new|[^/]+|[^/]+\/edit)$/.test(
    location.pathname,
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppBar />

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-auto p-4 pb-6">
        {isTaskModalRoute ? (
          <>
            <HomePage />
            <Outlet />
          </>
        ) : (
          <Outlet />
        )}
      </main>
      <BottomNav />
    </div>
  );
}
