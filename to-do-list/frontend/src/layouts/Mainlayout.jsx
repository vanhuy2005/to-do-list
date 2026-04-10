import { Outlet, useLocation } from "react-router-dom";
import AppBar from "@/components/AppBar";
import AIAssistantWidget from "@/components/AIAssistantWidget";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";

export default function MainLayout() {
  const location = useLocation();
  const isTaskModalRoute = /^\/tasks\/(new|[^/]+|[^/]+\/edit)$/.test(
    location.pathname,
  );

  return (
    <div className="flex flex-col min-h-screen h-dvh bg-background text-foreground">
      <AppBar />

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-auto p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] min-h-0">
        {isTaskModalRoute ? (
          <>
            <HomePage />
            <Outlet />
          </>
        ) : (
          <Outlet />
        )}
      </main>
      <AIAssistantWidget />
      <BottomNav />
    </div>
  );
}
