import {
  HomeIcon,
  BarChart2Icon,
  UsersIcon,
  UserRoundIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { id: "home", label: "Trang chủ", icon: HomeIcon },
  { id: "analytics", label: "Phân tích", icon: BarChart2Icon },
  { id: "users", label: "Người dùng", icon: UsersIcon },
  { id: "profile", label: "Cá nhân", icon: UserRoundIcon },
];

export default function AdminSidebarNav({ activeTab, setActiveTab }) {
  return (
    <aside className="hidden w-20 shrink-0 flex-col border-r-[3px] border-border bg-card comic-shadow lg:flex">
      <nav
        aria-label="Điều hướng quản trị"
        className="flex flex-1 flex-col items-center gap-1.5 py-5"
      >
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "desktop-hover-lift group relative flex w-14 flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[0.6rem] leading-none font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                activeTab === item.id
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
