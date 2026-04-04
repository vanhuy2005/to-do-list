import { ActivityIcon, HouseIcon, PlusIcon, SettingsIcon, UserRoundIcon } from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Trang chủ", icon: HouseIcon },
  { to: "/filter", label: "Hoạt động", icon: ActivityIcon },
  { to: "/profile", label: "Cá nhân", icon: UserRoundIcon },
  { to: "/settings", label: "Cài đặt", icon: SettingsIcon },
];

export default function BottomNav({ fixed = true }) {
  return (
    <footer
      className={cn(
        "border-t-[3px] border-border bg-background px-2 py-2",
        fixed ? "fixed inset-x-0 bottom-0 z-20" : "relative rounded-lg border-[3px]"
      )}
    >
      <nav className="relative mx-auto grid w-full max-w-3xl grid-cols-5 items-end gap-1">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-md px-1 py-1 text-[10px] leading-none font-bold tracking-normal",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Icon className="size-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}

        <div className="flex justify-center">
          <Link
            to="/tasks/new"
            aria-label="Thêm"
            className="-mt-20 z-20 inline-flex size-14 rotate-12 items-center justify-center rounded-xl border-[4px] border-border bg-primary text-primary-foreground comic-shadow transition-transform hover:-translate-y-0.5"
          >
            <PlusIcon className="size-8 -rotate-12" strokeWidth={3} />
          </Link>
        </div>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-md px-1 py-1 text-[10px] leading-none font-bold tracking-normal",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <Icon className="size-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </footer>
  );
}
