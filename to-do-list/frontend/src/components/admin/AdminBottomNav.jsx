import { useLocation, Link } from "react-router-dom"; // ✅ thêm Link
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

export default function AdminBottomNav() {
  const location = useLocation();

  const isAdminArea =
    location.pathname.startsWith("/dashboard") ||
    location.pathname === "/profile/edit" ||
    location.pathname === "/settings";

  if (!isAdminArea) return null;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-20 border-t-[3px] border-border bg-background px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
      <nav className="relative mx-auto grid w-full max-w-3xl grid-cols-4 items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;

          // ✅ isActive logic đúng cho cả path và query-based routes
          const isActive = (() => {
            if (item.path.includes("?")) {
              const [basePath, query] = item.path.split("?");
              return (
                location.pathname === basePath &&
                location.search === `?${query}`
              );
            }
            return location.pathname === item.path;
          })();

          return (
            <Link // ✅ Link thay vì <a>
              key={item.path}
              to={item.path} // ✅ to= thay vì href=
              className={cn(
                "flex flex-col items-center gap-1 rounded-md px-1 py-1 text-[10px] leading-none font-bold tracking-normal",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </footer>
  );
}
