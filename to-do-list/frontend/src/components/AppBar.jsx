import { useEffect, useMemo, useState } from "react";
import {
  BrushIcon,
  RocketIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  XIcon,
  MailIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "@/lib/axios";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const STATUS_LABELS = {
  todo: "Cần làm",
  doing: "Đang làm",
  done: "Hoàn thành",
  canceled: "Đã hủy",
};

const PRIORITY_LABELS = {
  low: "Thấp",
  medium: "Vừa",
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
  const [invitations, setInvitations] = useState({ projects: [], tasks: [] });
  const [activeTab, setActiveTab] = useState("projects");

  const fetchInvitations = async () => {
    try {
      const res = await api.get("/invitations/me");
      if (res && res.success) {
        setInvitations(res.data || { projects: [], tasks: [] });
      }
    } catch (err) {
      console.error("Error fetching invitations:", err);
    }
  };

  useEffect(() => {
    fetchInvitations();
    const interval = setInterval(fetchInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAcceptProject = async (idOrToken) => {
    try {
      const res = await api.post(`/projects/invitations/${idOrToken}/accept`);
      if (res && res.success) {
        setInvitations((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p._id !== idOrToken),
        }));
        window.dispatchEvent(new CustomEvent("project_joined"));
      }
    } catch (err) {
      alert("Chấp nhận lời mời thất bại: " + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleDeclineProject = async (idOrToken) => {
    try {
      const res = await api.post(`/projects/invitations/${idOrToken}/decline`);
      if (res && res.success) {
        setInvitations((prev) => ({
          ...prev,
          projects: prev.projects.filter((p) => p._id !== idOrToken),
        }));
      }
    } catch (err) {
      alert("Từ chối lời mời thất bại: " + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleAcceptTask = async (idOrToken) => {
    try {
      const res = await api.post(`/tasks/invitations/${idOrToken}/accept`);
      if (res && res.success) {
        setInvitations((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t._id !== idOrToken),
        }));
        window.dispatchEvent(new CustomEvent("task_joined"));
      }
    } catch (err) {
      alert("Chấp nhận lời mời thất bại: " + (err.response?.data?.error?.message || err.message));
    }
  };

  const handleDeclineTask = async (idOrToken) => {
    try {
      const res = await api.post(`/tasks/invitations/${idOrToken}/decline`);
      if (res && res.success) {
        setInvitations((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t._id !== idOrToken),
        }));
      }
    } catch (err) {
      alert("Từ chối lời mời thất bại: " + (err.response?.data?.error?.message || err.message));
    }
  };

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
  const isActivitiesPage = location.pathname === "/activities";
  const isCleanupPanelOpen =
    new URLSearchParams(location.search).get("cleanup") === "1";

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

    // Always return to first page when changing search text.
    params.delete("page");

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

  const navigateWithCurrentPath = (params) => {
    const nextSearch = params.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  };

  const handleRemoveFilterByKey = (key) => {
    const params = new URLSearchParams(location.search);
    params.delete(key);
    params.delete("page");
    navigateWithCurrentPath(params);
  };

  const handleRemoveTag = (tagToRemove) => {
    const params = new URLSearchParams(location.search);
    const currentTags = normalizeTags(params.get("tag") || "");
    const nextTags = currentTags.filter(
      (tag) => tag.toLowerCase() !== tagToRemove.toLowerCase(),
    );

    if (nextTags.length > 0) {
      params.set("tag", nextTags.join(","));
    } else {
      params.delete("tag");
    }

    params.delete("page");

    navigateWithCurrentPath(params);
  };

  const handleToggleCleanupPanel = () => {
    if (!isActivitiesPage) {
      return;
    }

    const params = new URLSearchParams(location.search);
    if (isCleanupPanelOpen) {
      params.delete("cleanup");
    } else {
      params.set("cleanup", "1");
    }

    navigateWithCurrentPath(params);
  };

  return (
    <header className="sticky top-0 z-20 border-b-[3px] border-border bg-[#ffd400] px-3 py-2.5">
      <div className="flex w-full flex-col gap-2 lg:gap-2.5">
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
            {isActivitiesPage && (
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={handleToggleCleanupPanel}
                aria-label="Bật tắt dọn nhật ký"
                className={cn(
                  "transition-all duration-200 lg:hover:scale-110 lg:hover:shadow-[3px_3px_0_#111111]",
                  isCleanupPanelOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-card",
                )}
              >
                <BrushIcon className="size-4" />
              </Button>
            )}

            {!isSearchVisible && (
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                onClick={handleToggleSearch}
                aria-label="Search"
                className="bg-card transition-all duration-200 lg:hover:scale-110 lg:hover:shadow-[3px_3px_0_#111111]"
              >
                <SearchIcon className="size-4" />
              </Button>
            )}

            {/* Popover Mail/Inbox for Invitations */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  aria-label="Invitations"
                  onClick={fetchInvitations}
                  className="relative bg-[#ff5c5c] transition-all duration-200 lg:hover:scale-110 lg:hover:shadow-[3px_3px_0_#111111]"
                >
                  <MailIcon className="size-4 text-white" />
                  {(invitations.projects.length + invitations.tasks.length) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-border bg-[#ff3b57] px-1 text-[9px] font-black text-white">
                      {invitations.projects.length + invitations.tasks.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0 border-[3px] border-border bg-card comic-shadow rounded-xl">
                <div className="flex border-b-[3px] border-border">
                  <button
                    type="button"
                    onClick={() => setActiveTab("projects")}
                    className={cn(
                      "flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-all duration-150 border-r-[3px] border-border",
                      activeTab === "projects" ? "bg-primary text-primary-foreground font-black" : "bg-card hover:bg-muted"
                    )}
                  >
                    Dự án ({invitations.projects.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tasks")}
                    className={cn(
                      "flex-1 py-2 text-center text-xs font-black uppercase tracking-wider transition-all duration-150",
                      activeTab === "tasks" ? "bg-primary text-primary-foreground font-black" : "bg-card hover:bg-muted"
                    )}
                  >
                    Nhiệm vụ ({invitations.tasks.length})
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                  {activeTab === "projects" ? (
                    invitations.projects.length === 0 ? (
                      <p className="text-center py-4 text-xs font-bold text-muted-foreground">Không có lời mời dự án nào</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {invitations.projects.map((invite) => (
                          <div key={invite._id} className="p-2 border-[3px] border-border bg-[#fafafa] rounded-lg flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-lg">{invite.projectId?.emoji || "📁"}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black truncate">{invite.projectId?.name || "Dự án hợp tác"}</p>
                                <p className="text-[10px] text-muted-foreground truncate">Mời bởi: {invite.invitedBy?.displayName || invite.invitedBy?.email}</p>
                              </div>
                            </div>
                            {invite.projectId?.description && (
                              <p className="text-[10px] text-muted-foreground bg-white p-1 border border-border rounded italic">{invite.projectId.description}</p>
                            )}
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-black border-2 border-border bg-white"
                                onClick={() => handleDeclineProject(invite._id)}
                              >
                                Từ chối
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-[10px] font-black border-2 border-border bg-primary text-primary-foreground"
                                onClick={() => handleAcceptProject(invite._id)}
                              >
                                Đồng ý
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    invitations.tasks.length === 0 ? (
                      <p className="text-center py-4 text-xs font-bold text-muted-foreground">Không có lời mời chia sẻ nhiệm vụ nào</p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {invitations.tasks.map((invite) => (
                          <div key={invite._id} className="p-2 border-[3px] border-border bg-[#fafafa] rounded-lg flex flex-col gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 justify-between">
                                <span className={cn(
                                  "text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-border uppercase",
                                  invite.taskId?.priority === "high" ? "bg-red-100 text-red-700" :
                                  invite.taskId?.priority === "medium" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"
                                )}>
                                  Ưu tiên: {invite.taskId?.priority === "high" ? "Cao" : invite.taskId?.priority === "medium" ? "Vừa" : "Thấp"}
                                </span>
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-border bg-purple-100 text-purple-700 uppercase">
                                  Quyền: {invite.permission === "editor" ? "Chỉnh sửa" : invite.permission === "comment" ? "Nhận xét" : "Xem"}
                                </span>
                              </div>
                              <p className="text-xs font-black truncate mt-1">{invite.taskId?.title || "Nhiệm vụ hợp tác"}</p>
                              <p className="text-[10px] text-muted-foreground truncate">Chia sẻ bởi: {invite.invitedBy?.displayName || invite.invitedBy?.email}</p>
                            </div>
                            {invite.taskId?.description && (
                              <p className="text-[10px] text-muted-foreground bg-white p-1 border border-border rounded italic">{invite.taskId.description}</p>
                            )}
                            <div className="flex items-center justify-end gap-1.5 mt-1">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] font-black border-2 border-border bg-white"
                                onClick={() => handleDeclineTask(invite._id)}
                              >
                                Từ chối
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-[10px] font-black border-2 border-border bg-primary text-primary-foreground"
                                onClick={() => handleAcceptTask(invite._id)}
                              >
                                Đồng ý
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Button
              asChild
              type="button"
              size="icon-sm"
              variant="secondary"
              aria-label="Filter"
              className="bg-[#00c2ff] transition-all duration-200 lg:hover:scale-110 lg:hover:shadow-[3px_3px_0_#111111]"
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
              <Badge className="h-7 max-w-38 rounded-full bg-[#ff3b57] pr-1 pl-3 text-xs font-black uppercase tracking-wide text-white">
                <span className="truncate">{activeFilters.status.label}</span>
                <button
                  type="button"
                  className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white/80 text-foreground hover:bg-black/5"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRemoveFilterByKey("status");
                  }}
                  aria-label="Xóa lọc trạng thái"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            )}

            {activeFilters.priority && (
              <Badge className="h-7 max-w-38 rounded-full bg-[#00c2ff] pr-1 pl-3 text-xs font-black uppercase tracking-wide text-foreground">
                <span className="truncate">{activeFilters.priority.label}</span>
                <button
                  type="button"
                  className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white/80 hover:bg-black/5"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRemoveFilterByKey("priority");
                  }}
                  aria-label="Xóa lọc ưu tiên"
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            )}

            {compactTags.map((tag, index) => (
              <Badge
                key={`${tag.toLowerCase()}-${index}`}
                className="h-7 max-w-38 rounded-full bg-card pr-1 pl-3 text-xs font-black uppercase tracking-wide text-foreground"
                title={`#${tag}`}
              >
                <span className="truncate">#{tag}</span>
                <button
                  type="button"
                  className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white/80 hover:bg-black/5"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  aria-label={`Xóa tag ${tag}`}
                >
                  <XIcon className="size-3" />
                </button>
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
                        className="h-7 min-w-0 max-w-full basis-[calc((100%-0.75rem)/3)] rounded-full bg-card pr-1 pl-2 text-[11px] font-black uppercase tracking-wide text-foreground"
                        title={`#${tag}`}
                      >
                        <span className="truncate">#{tag}</span>
                        <button
                          type="button"
                          className="ml-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-border bg-white/80 hover:bg-black/5"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleRemoveTag(tag);
                          }}
                          aria-label={`Xóa tag ${tag}`}
                        >
                          <XIcon className="size-3" />
                        </button>
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
