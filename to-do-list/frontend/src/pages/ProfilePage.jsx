import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  LogOutIcon,
  MailIcon,
  MapPinIcon,
  PaletteIcon,
  PencilIcon,
  UserRoundIcon,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/axios";
import authService from "@/services/authService";
import taskService from "@/services/taskService";

const STAT_TONES = {
  todo: "bg-card text-foreground",
  doing: "bg-[#ffd400] text-foreground",
  done: "bg-[#00c2ff] text-foreground",
};

function ProfileSkeleton() {
  return (
    <section className="relative space-y-4 pb-24">
      <Skeleton className="h-56 rounded-none" />
      <div className="px-4 space-y-4 -mt-10">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[6.4rem] rounded-2xl" />
          <Skeleton className="h-[6.4rem] rounded-2xl" />
          <Skeleton className="h-[6.4rem] rounded-2xl" />
        </div>
        <Skeleton className="h-56 rounded-[1.6rem]" />
      </div>
    </section>
  );
}

const formatDate = (value) => {
  if (!value) {
    return "Chưa cập nhật";
  }

  try {
    return new Date(value).toLocaleDateString("vi-VN");
  } catch {
    return "Chưa cập nhật";
  }
};

const getInitials = (name) => {
  if (!name) return "U";

  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const formatRole = (role) => (role === "admin" ? "ADMIN" : "USER");

const formatLanguage = (language) =>
  language === "en" ? "English" : "Tiếng Việt";

const formatTheme = (theme) => (theme === "dark" ? "Dark" : "Light");

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [taskStats, setTaskStats] = useState({ todo: 0, doing: 0, done: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatarUrl]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [profileResponse, todoResponse, doingResponse, doneResponse] =
          await Promise.all([
            api.get("/profile"),
            taskService.getTasks({ page: 1, limit: 1, status: "todo" }),
            taskService.getTasks({ page: 1, limit: 1, status: "doing" }),
            taskService.getTasks({ page: 1, limit: 1, status: "done" }),
          ]);

        if (!isMounted) {
          return;
        }

        setProfile(profileResponse?.data || null);
        setTaskStats({
          todo: todoResponse?.data?.pagination?.total || 0,
          doing: doingResponse?.data?.pagination?.total || 0,
          done: doneResponse?.data?.pagination?.total || 0,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.response?.status === 401) {
          return;
        }

        const nextMessage =
          error?.response?.data?.error?.message ||
          "Không thể tải dữ liệu hồ sơ từ cơ sở dữ liệu.";
        setErrorMessage(nextMessage);
        setProfile(null);
        setTaskStats({ todo: 0, doing: 0, done: 0 });
        toast.error("Không tải được hồ sơ", { description: nextMessage });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn("Logout endpoint error ignored:", e);
    } finally {
      authService.clearToken();
      navigate("/login");
    }
  };

  const profileDetails = useMemo(() => {
    if (!profile) {
      return [];
    }

    return [
      {
        icon: MapPinIcon,
        label: `Tạo lúc ${formatDate(profile.createdAt)}`,
        accent: "bg-[#ffd400] text-foreground",
      },
      {
        icon: UserRoundIcon,
        label: formatRole(profile.role),
        accent: "bg-[#00c2ff] text-white",
      },
      {
        icon: MailIcon,
        label: profile.email,
        accent: "bg-[#ff3b57] text-white",
      },
    ];
  }, [profile]);

  const profileStats = useMemo(
    () => [
      {
        label: "Cần làm",
        value: taskStats.todo,
        tone: STAT_TONES.todo,
      },
      {
        label: "Đang làm",
        value: taskStats.doing,
        tone: STAT_TONES.doing,
      },
      {
        label: "Hoàn thành",
        value: taskStats.done,
        tone: STAT_TONES.done,
      },
    ],
    [taskStats],
  );

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <section className="relative space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
      {/* Mobile cover */}
      <div className="-mx-3 -mt-3 relative z-0 border-b-[3px] border-border bg-[#ff3b57] px-4 pb-14 pt-6 text-center lg:hidden">
        <div className="absolute top-4 right-4 z-10">
          <Link
            to="/settings"
            className="flex size-10 items-center justify-center rounded-xl border-[3px] border-border bg-white text-foreground comic-shadow active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all"
          >
            <Settings className="size-5" />
          </Link>
        </div>
        <div className="absolute left-1/2 bottom-0 flex w-full -translate-x-1/2 translate-y-1/2 justify-center">
          <div className="relative">
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border-[4px] border-border bg-[radial-gradient(circle_at_30%_30%,#ffd400_0%,#ff7a59_35%,#1f7bdc_68%,#0d324d_100%)] comic-shadow">
              {profile?.avatarUrl && !avatarError ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || "User avatar"}
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[2.6rem] font-black uppercase text-white">
                  {getInitials(profile?.displayName)}
                </div>
              )}
            </div>

            <div className="absolute bottom-0 right-0 inline-flex size-9 items-center justify-center rounded-full border-[3px] border-border bg-[#ffd400] comic-shadow">
              <PencilIcon className="size-4 text-foreground" />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop compact header */}
      <div className="hidden items-center justify-between gap-4 rounded-[1.8rem] border-[3px] border-border bg-[#ff3b57] px-5 py-4 text-white comic-shadow lg:flex">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative">
            <div className="flex size-24 items-center justify-center overflow-hidden rounded-full border-[4px] border-border bg-[radial-gradient(circle_at_30%_30%,#ffd400_0%,#ff7a59_35%,#1f7bdc_68%,#0d324d_100%)] comic-shadow">
              {profile?.avatarUrl && !avatarError ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName || "User avatar"}
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="flex size-full items-center justify-center text-[2.4rem] font-black uppercase text-white">
                  {getInitials(profile?.displayName)}
                </div>
              )}
            </div>

            <div className="absolute bottom-0 right-0 inline-flex size-8 items-center justify-center rounded-full border-[3px] border-border bg-[#ffd400] comic-shadow">
              <PencilIcon className="size-4 text-foreground" />
            </div>
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-[2rem] leading-none font-black uppercase tracking-tight">
              {profile?.displayName || "Người dùng"}
            </h1>
            <Badge className="mt-2 h-8 rounded-xl border-[3px] border-border bg-[#00c2ff] px-3 text-sm text-white comic-shadow">
              @{profile?.email?.split("@")[0] || "user_id"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="h-12 rounded-xl border-[3px] border-border border-b-[5px] bg-card px-6 text-base uppercase text-foreground comic-shadow transition-all duration-200 hover:bg-card/95 lg:hover:scale-[1.02] lg:hover:shadow-[5px_5px_0_#111111]"
          >
            <Link to="/profile/edit">Chỉnh sửa hồ sơ</Link>
          </Button>
          <Link
            to="/settings"
            className="flex size-12 items-center justify-center rounded-xl border-[3px] border-border bg-card text-foreground comic-shadow hover:scale-[1.02] hover:shadow-[3.5px_3.5px_0_#111111] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Settings className="size-6" />
          </Link>
        </div>
      </div>

      <div className="space-y-4 pt-16 lg:space-y-4 lg:pt-0">
        <div className="text-center lg:hidden">
          <h1 className="text-[2.1rem] leading-none font-black uppercase tracking-tight text-foreground">
            {profile?.displayName || "Người dùng"}
          </h1>

          <Badge className="mt-3 h-9 rounded-xl border-[3px] border-border bg-[#00c2ff] px-4 text-base text-white comic-shadow">
            @{profile?.email?.split("@")[0] || "user_id"}
          </Badge>

          <Button
            asChild
            className="mt-4 h-12 w-full rounded-2xl border-[3px] border-border border-b-[6px] bg-[#ff3b57] text-base uppercase text-white comic-shadow active:border-b-[3px] active:translate-y-[3px]"
          >
            <Link to="/profile/edit">Chỉnh sửa hồ sơ</Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 lg:gap-3">
          {profileStats.map((item) => (
            <Card
              key={item.label}
              className={`rounded-2xl border-[3px] border-border border-b-[5px] comic-shadow desktop-hover-scale ${item.tone}`}
            >
              <CardContent className="px-1 py-3 text-center">
                <p className="text-[0.6rem] sm:text-xs font-black uppercase tracking-wide opacity-90">
                  {item.label}
                </p>
                <p className="mt-1 text-[2rem] lg:text-[2.2rem] leading-none font-black">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
          <Card className="rounded-[1.6rem] border-[3px] border-border bg-[#fffaf0] comic-shadow desktop-hover-lift lg:col-span-2">
            <CardContent className="space-y-4 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[1.3rem] leading-none font-black uppercase tracking-tight">
                  Thông tin chi tiết
                </h2>

                <div className="inline-flex size-7 items-center justify-center rounded-full bg-[#111111]/10">
                  <CheckCircle2Icon className="size-4 text-[#777]" />
                </div>
              </div>

              <div className="space-y-3">
                {profileDetails.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.label}
                      className="desktop-hover-scale flex items-center gap-3 rounded-xl px-1 py-1 transition-transform duration-200"
                    >
                      <div
                        className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border ${item.accent} comic-shadow`}
                      >
                        <Icon className="size-5" />
                      </div>

                      <p className="text-[13px] sm:text-base font-black uppercase tracking-tight text-foreground line-clamp-1">
                        {item.label}
                      </p>
                    </div>
                  );
                })}

                <div className="desktop-hover-scale flex items-center gap-3 rounded-xl px-1 py-1 transition-transform duration-200">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border bg-[#e6f7ff] comic-shadow">
                    <ClipboardListIcon className="size-5 text-foreground" />
                  </div>

                  <p className="text-[13px] sm:text-base font-black uppercase tracking-tight text-foreground line-clamp-1">
                    Quản lý {taskStats.todo + taskStats.doing + taskStats.done}{" "}
                    nhiệm vụ
                  </p>
                </div>

                <div className="desktop-hover-scale flex items-center gap-3 rounded-xl px-1 py-1 transition-transform duration-200">
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border bg-[#f1f5f9] comic-shadow">
                    <PaletteIcon className="size-5 text-foreground" />
                  </div>

                  <p className="text-[13px] sm:text-base font-black uppercase tracking-tight text-foreground line-clamp-1">
                    {formatLanguage(profile?.preferredLanguage)} /{" "}
                    {formatTheme(profile?.themePreference)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {errorMessage ? (
              <Card className="rounded-[1.4rem] border-[3px] border-border bg-[#fff1f2] comic-shadow">
                <CardContent className="px-4 py-4 text-sm font-bold text-[#b42318]">
                  {errorMessage}
                </CardContent>
              </Card>
            ) : null}

            <Card className="rounded-[1.4rem] border-[3px] border-border bg-card comic-shadow desktop-hover-lift">
              <CardContent className="space-y-2 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Tổng quan nhanh
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border-[3px] border-border bg-[#fff3bf] px-2 py-2 text-center">
                    <p className="text-[0.58rem] font-black uppercase">
                      Vai trò
                    </p>
                    <p className="text-xs font-black uppercase">
                      {formatRole(profile?.role)}
                    </p>
                  </div>
                  <div className="rounded-xl border-[3px] border-border bg-[#dbf5ff] px-2 py-2 text-center">
                    <p className="text-[0.58rem] font-black uppercase">
                      Ngôn ngữ
                    </p>
                    <p className="text-xs font-black uppercase line-clamp-1">
                      {formatLanguage(profile?.preferredLanguage)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-[1.6rem] border-[4px] border-dashed border-[#ff3b57]/60 bg-[#ff3b57]/5 p-2">
              <Button
                type="button"
                onClick={handleLogout}
                className="h-14 w-full rounded-[1.2rem] border-[3px] border-border border-b-[6px] bg-[#ff3b57] text-lg uppercase text-white comic-shadow active:border-b-[3px] active:translate-y-[3px] transition-all duration-200 lg:hover:scale-[1.02] lg:hover:shadow-[5px_5px_0_#111111]"
              >
                <LogOutIcon className="mr-1 size-5" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
