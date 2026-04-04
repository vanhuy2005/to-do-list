import { Outlet } from "react-router-dom";
import AppBar from "@/components/AppBar";

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <AppBar />

      <main className="mx-auto w-full max-w-3xl flex-1 overflow-auto p-4 pb-6">
        <Outlet />
      </main>
    </div>
  );
}
