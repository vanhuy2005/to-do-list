import { Outlet } from "react-router-dom";

export default function MainLayout() {
  return (
    <div>
      <header>Header</header>

      <main>
        <Outlet />
      </main>

      <footer>Bottom Nav</footer>
    </div>
  );
}