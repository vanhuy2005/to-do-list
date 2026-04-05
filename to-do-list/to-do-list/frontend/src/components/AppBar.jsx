import { useState } from "react";
import {
  RocketIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppBar({ onSettingsClick }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setIsSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-border bg-[#ffd400] px-4 py-3 comic-shadow">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex size-9 items-center justify-center rounded-xl border-[3px] border-border bg-card comic-shadow">
              <RocketIcon className="size-5 text-primary" />
            </div>

            <div className="inline-flex items-center gap-2">
              <span className="text-[1.5rem] leading-none font-black tracking-tight">
                TO-DO
              </span>
              <span className="rounded-md border-[3px] border-border bg-primary px-2 py-0.5 text-xl leading-none font-black text-primary-foreground comic-shadow">
                APP
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isSearchOpen && (
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={handleToggleSearch}
                aria-label="Search"
                className="bg-card"
              >
                <SearchIcon className="size-4" />
              </Button>
            )}

            <Button
              type="button"
              size="icon-sm"
              variant="secondary"
              onClick={onSettingsClick}
              aria-label="Settings"
              className="bg-secondary"
            >
              <SlidersHorizontalIcon className="size-4" />
            </Button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="flex items-center gap-2 rounded-md border-[3px] border-border bg-card px-3 py-2 comic-shadow">
            <SearchIcon className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm kiếm..."
              className="h-6 flex-1 border-0 bg-transparent text-sm font-extrabold outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center justify-center text-primary"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
