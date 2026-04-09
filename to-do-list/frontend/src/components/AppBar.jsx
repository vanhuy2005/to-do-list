import { useEffect, useState } from "react";
import {
  RocketIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";

export default function AppBar({ onSettingsClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    const currentSearch = new URLSearchParams(location.search).get("search") || "";
    setSearchValue(currentSearch);
    if (currentSearch) {
      setIsSearchOpen(true);
    }
  }, [location.search]);

  const pageTitle = () => {
    switch (location.pathname) {
      case "/profile":
        return { pre: "HỒ SƠ", post: "CÁ NHÂN" };
      case "/settings":
        return { pre: "CÀI", post: "ĐẶT" };
      case "/activities":
        return { pre: "NHẬT KÍ", post: "HOẠT ĐỘNG" };
      default:
        return { pre: "TO-DO", post: "APP" };
    }
  };

  const title = pageTitle();

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const updateSearchQuery = (value) => {
    const params = new URLSearchParams(location.search);
    const normalized = value.trim();

    if (normalized) {
      params.set("search", normalized);
    } else {
      params.delete("search");
    }

    const nextSearch = params.toString();
    
    let targetPath = location.pathname;
    // Logically redirect to HomePage if searching from unsupported pages (Profile, Settings)
    if (targetPath !== "/" && targetPath !== "/activities") {
      targetPath = "/";
    }

    navigate(
      {
        pathname: targetPath,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  };

  const handleClearSearch = () => {
    setSearchValue("");
    setIsSearchOpen(false);
    updateSearchQuery("");
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
              <span className="text-[1.5rem] leading-none font-black tracking-tight uppercase">
                {title.pre}
              </span>
              <span className="rounded-md border-[3px] border-border bg-primary px-2 py-0.5 text-xl leading-none font-black text-primary-foreground comic-shadow uppercase">
                {title.post}
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
              asChild
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label="Filter"
              className="bg-[#00c2ff]"
            >
              <Link to="/filter">
                <SlidersHorizontalIcon className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="flex items-center gap-2 rounded-md border-[3px] border-border bg-card px-3 py-2 comic-shadow">
            <SearchIcon className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={searchValue}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSearchValue(nextValue);
                updateSearchQuery(nextValue);
              }}
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
