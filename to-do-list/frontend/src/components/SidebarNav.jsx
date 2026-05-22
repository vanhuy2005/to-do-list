import React, { useState, useEffect } from "react";
import {
  ActivityIcon,
  HouseIcon,
  PlusIcon,
  UserRoundIcon,
  GridIcon,
} from "lucide-react";
import { Link, NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import authService from "@/services/authService";
import UserAvatar from "@/components/UserAvatar";

const navItems = [
  { to: "/", label: "Trang chủ", icon: HouseIcon },
  { to: "/projects", label: "Dự án", icon: GridIcon },
  { to: "/activities", label: "Hoạt động", icon: ActivityIcon },
  { to: "/profile", label: "Cá nhân", icon: UserRoundIcon },
];

export default function SidebarNav() {
  const [currentUser, setCurrentUser] = useState(() => authService.getUser());

  useEffect(() => {
    const handleUserChanged = () => {
      setCurrentUser(authService.getUser());
    };
    window.addEventListener("auth_user_changed", handleUserChanged);
    return () => {
      window.removeEventListener("auth_user_changed", handleUserChanged);
    };
  }, []);

  return (
    <aside className="hidden w-20 shrink-0 flex-col border-r-[3px] border-border bg-card comic-shadow lg:flex">
      <nav
        aria-label="Điều hướng chính"
        className="flex flex-1 flex-col items-center gap-1.5 py-5"
      >
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "desktop-hover-lift group relative flex w-14 flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[0.6rem] leading-none font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground",
                )
              }
            >
              <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}

        {/* FAB — Create Task */}
        <div className="my-3">
          <Link
            to="/tasks/new"
            aria-label="Thêm"
            className="desktop-hover-lift inline-flex size-12 items-center justify-center rounded-2xl border-4 border-border bg-primary text-primary-foreground comic-shadow transition-all duration-200 hover:-translate-y-1 hover:shadow-[5px_5px_0_#111111] active:translate-y-0 active:shadow-[2px_2px_0_#111111] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <PlusIcon className="size-6" strokeWidth={3} />
          </Link>
        </div>

        {/* Nav Items — last two */}
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isProfile = item.to === "/profile";

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "desktop-hover-lift group relative flex w-14 flex-col items-center gap-1 rounded-2xl px-1.5 py-2.5 text-[0.6rem] leading-none font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground",
                )
              }
            >
              {isProfile ? (
                <UserAvatar
                  avatarUrl={currentUser?.avatarUrl}
                  displayName={currentUser?.displayName}
                  email={currentUser?.email}
                  sizeClassName="size-6"
                  className="transition-transform duration-200 group-hover:scale-110 shadow-[1px_1px_0px_0px_#000000] border border-border"
                />
              ) : (
                <Icon className="size-5 transition-transform duration-200 group-hover:scale-110" />
              )}
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
