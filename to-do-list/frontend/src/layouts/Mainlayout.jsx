import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="p-4 border-b-[3px] border-border comic-shadow sticky top-0 bg-background z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight">Pop Art To-Do</h1>
      </header>
      <main className="flex-1 p-4 overflow-auto max-w-3xl w-full mx-auto">
        <Outlet />
      </main>
      <footer className="p-4 border-t-[3px] border-border bg-background text-center text-sm comic-shadow-press">
        Bottom Nav Placeholder
      </footer>
    </div>
  );
}
