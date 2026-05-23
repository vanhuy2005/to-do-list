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

export default function BottomNav({ fixed = true }) {
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
    <footer
      className={cn(
        "border-t-[3px] border-border bg-background px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
        fixed
          ? "fixed inset-x-0 bottom-0 z-20 lg:hidden"
          : "relative rounded-lg border-[3px]",
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
                  isActive ? "text-primary" : "text-muted-foreground",
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
          const isProfile = item.to === "/profile";

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-md px-1 py-1 text-[10px] leading-none font-bold tracking-normal",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              {isProfile ? (
                <UserAvatar
                  avatarUrl={currentUser?.avatarUrl}
                  displayName={currentUser?.displayName}
                  email={currentUser?.email}
                  sizeClassName="size-5"
                  className="shadow-[1px_1px_0px_0px_#000000] border border-border"
                />
              ) : (
                <Icon className="size-5" />
              )}
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </footer>
  );
}
