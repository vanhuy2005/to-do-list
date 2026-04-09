import { useMemo, useState } from "react";
import {
  RocketIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const STATUS_LABELS = {
  todo: "Chưa làm",
  doing: "Đang làm",
  done: "Hoàn thành",
  canceled: "Đã hủy",
};

const PRIORITY_LABELS = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
};

const MAX_VISIBLE_TAGS = 3;

const normalizeTags = (tagQuery) => {
  if (!tagQuery) return [];

  return tagQuery
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter(
      (value, index, array) =>
        array.findIndex(
          (item) => item.toLowerCase() === value.toLowerCase(),
        ) === index,
    );
};

const getActiveFilters = (search) => {
  const params = new URLSearchParams(search);

  const status = params.get("status");
  const priority = params.get("priority");
  const tags = normalizeTags(params.get("tag") || "");

  return {
    status: STATUS_LABELS[status]
      ? { value: status, label: STATUS_LABELS[status] }
      : null,
    priority: PRIORITY_LABELS[priority]
      ? { value: priority, label: PRIORITY_LABELS[priority] }
      : null,
    tags,
  };
};

export default function AppBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const currentSearch = useMemo(
    () => new URLSearchParams(location.search).get("search") || "",
    [location.search],
  );
  const isSearchVisible = isSearchOpen || Boolean(currentSearch);

  const activeFilters = useMemo(
    () => getActiveFilters(location.search),
    [location.search],
  );
  const compactTags = activeFilters.tags.slice(0, MAX_VISIBLE_TAGS);
  const hasMoreTags = activeFilters.tags.length > MAX_VISIBLE_TAGS;
  const hasActiveFilterChips =
    location.pathname === "/" &&
    Boolean(
      activeFilters.status ||
      activeFilters.priority ||
      activeFilters.tags.length,
    );

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
    if (isSearchVisible) {
      return;
    }

    setIsSearchOpen(true);
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
    setIsSearchOpen(false);
    updateSearchQuery("");
  };

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-border bg-[#ffd400] px-4 py-2.5 comic-shadow">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
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
            {!isSearchVisible && (
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

        {hasActiveFilterChips && (
          <div className="-mt-0.5 flex flex-wrap items-center gap-1.5">
            {activeFilters.status && (
              <Badge className="h-7 rounded-full bg-[#ff3b57] px-3 text-xs font-black uppercase tracking-wide text-white">
                {activeFilters.status.label}
              </Badge>
            )}

            {activeFilters.priority && (
              <Badge className="h-7 rounded-full bg-[#00c2ff] px-3 text-xs font-black uppercase tracking-wide text-foreground">
                {activeFilters.priority.label}
              </Badge>
            )}

            {compactTags.map((tag, index) => (
              <Badge
                key={`${tag.toLowerCase()}-${index}`}
                className="h-7 max-w-34 rounded-full bg-card px-3 text-xs font-black uppercase tracking-wide text-foreground"
                title={`#${tag}`}
              >
                <span className="truncate">#{tag}</span>
              </Badge>
            ))}

            {hasMoreTags && (
              <Popover key={`${location.pathname}-${location.search}`}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="Xem tất cả tag đã lọc"
                    className="inline-flex h-7 items-center rounded-full border-[3px] border-border bg-card px-3 text-xs leading-none font-black tracking-wide comic-shadow"
                  >
                    ...
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  align="start"
                  className="w-[min(22rem,calc(100vw-2rem))] gap-1.5 p-2"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {activeFilters.tags.map((tag, index) => (
                      <Badge
                        key={`${tag.toLowerCase()}-expanded-${index}`}
                        className="h-7 min-w-0 max-w-full basis-[calc((100%-0.75rem)/3)] rounded-full bg-card px-2 text-[11px] font-black uppercase tracking-wide text-foreground"
                        title={`#${tag}`}
                      >
                        <span className="truncate">#{tag}</span>
                      </Badge>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {isSearchVisible && (
          <div className="flex items-center gap-2 rounded-md border-[3px] border-border bg-card px-3 py-2 comic-shadow">
            <SearchIcon className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={currentSearch}
              onChange={(event) => {
                const nextValue = event.target.value;
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
