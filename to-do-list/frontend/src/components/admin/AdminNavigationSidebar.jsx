import { useNavigate, useLocation } from "react-router-dom";
import {
  HomeIcon,
  BarChart2Icon,
  UsersIcon,
  UserRoundIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", label: "Trang chủ", icon: HomeIcon },
  { path: "/dashboard?tab=analytics", label: "Phân tích", icon: BarChart2Icon },
  { path: "/dashboard?tab=users", label: "Người dùng", icon: UsersIcon },
  { path: "/dashboard?tab=profile", label: "Cá nhân", icon: UserRoundIcon },
];

export default function AdminNavigationSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Check if current path is admin area
  const isAdminArea =
    location.pathname.startsWith("/dashboard") ||
    location.pathname === "/profile/edit" ||
    location.pathname === "/settings";

  if (!isAdminArea) {
    return null;
  }

  return (
    <aside className="hidden w-20 shrink-0 flex-col border-r-[3px] border-border bg-card comic-shadow lg:flex">
      <nav
        aria-label="Điều hướng quản trị"
        className="flex flex-1 flex-col items-center gap-1.5 py-5"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === "/dashboard" &&
            (!location.search || location.search === "?tab=home");

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "desktop-hover-lift group relative flex w-14 flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[0.6rem] leading-none font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-black/5 hover:text-foreground",
              )}
            >
              <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
