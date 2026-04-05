import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  Edit3Icon,
  MailIcon,
  MapPinIcon,
  PaletteIcon,
  PencilIcon,
  UserRoundIcon,
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
  todo: "bg-[#fff8dc] text-foreground",
  doing: "bg-[#ffe04d] text-foreground",
  done: "bg-secondary text-foreground",
};

function ProfileSkeleton() {
  return (
    <section className="relative space-y-4 pb-24">
      <Skeleton className="h-104 rounded-[1.8rem]" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-[6.4rem] rounded-2xl" />
        <Skeleton className="h-[6.4rem] rounded-2xl" />
        <Skeleton className="h-[6.4rem] rounded-2xl" />
      </div>
      <Skeleton className="h-56 rounded-[1.6rem]" />
    </section>
  );
}

function LoginPrompt() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center pb-24">
      <Card className="w-full max-w-md rounded-[1.8rem] bg-[#fffaf0]">
        <CardContent className="space-y-4 px-5 py-6 text-center">
          <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full border-[3px] border-border bg-[#ffd400] comic-shadow">
            <UserRoundIcon className="size-8 text-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
              Vui lòng đăng nhập
            </h1>
            <p className="text-sm font-bold text-muted-foreground">
              Bạn cần đăng nhập để xem trang hồ sơ cá nhân.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button asChild className="h-12 rounded-2xl text-base uppercase">
              <Link to="/login">Đăng nhập</Link>
            </Button>

            <Button
              asChild
              variant="secondary"
              className="h-12 rounded-2xl text-base uppercase"
            >
              <Link to="/register">Đăng ký</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
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
  const [profile, setProfile] = useState(null);
  const [taskStats, setTaskStats] = useState({ todo: 0, doing: 0, done: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isUnauthorized, setIsUnauthorized] = useState(!authService.getToken());

  useEffect(() => {
    const token = authService.getToken();

    if (!token) {
      setIsUnauthorized(true);
      setIsLoading(false);
      setProfile(null);
      setTaskStats({ todo: 0, doing: 0, done: 0 });
      return undefined;
    }

    setIsUnauthorized(false);
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
          authService.clearToken();
          setIsUnauthorized(true);
          setProfile(null);
          setTaskStats({ todo: 0, doing: 0, done: 0 });
          setErrorMessage("");
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
        accent: "bg-secondary text-foreground",
      },
      {
        icon: MailIcon,
        label: profile.email,
        accent: "bg-[#fff8dc] text-foreground",
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

  if (isUnauthorized) {
    return <LoginPrompt />;
  }

  return (
    <section className="relative space-y-4 pb-24">
      <div className="overflow-hidden rounded-[1.8rem] border-[3px] border-border bg-card comic-shadow">
        <div className="flex items-center gap-3 border-b-[3px] border-border bg-[#ffd400] px-4 py-3">
          <div className="inline-flex size-10 items-center justify-center rounded-xl border-[3px] border-border bg-card comic-shadow -rotate-12">
            <PaletteIcon className="size-5 text-primary" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[2rem] leading-none font-black uppercase tracking-tight text-foreground">
              Hồ sơ
            </span>
            <span className="-rotate-1 rounded-md border-[3px] border-border bg-primary px-2.5 py-1 text-[1.55rem] leading-none font-black uppercase tracking-tight text-primary-foreground comic-shadow">
              Cá nhân
            </span>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#ff3b57_0%,#ff3b57_44%,#ffffff_44%,#ffffff_100%)] px-4 pb-4 pt-5">
          <div className="rounded-[1.5rem] border-[3px] border-border bg-transparent px-4 pb-5 pt-10">
            <div className="mx-auto flex max-w-sm flex-col items-center text-center">
              <div className="relative">
                <div className="flex size-40 items-center justify-center overflow-hidden rounded-full border-4 border-border bg-[radial-gradient(circle_at_30%_30%,#ffd400_0%,#ff7a59_35%,#1f7bdc_68%,#0d324d_100%)] comic-shadow">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || "User avatar"}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[4rem] font-black uppercase text-white">
                      {getInitials(profile?.displayName)}
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1 inline-flex size-11 items-center justify-center rounded-full border-4 border-border bg-[#ffd400] comic-shadow">
                  <PencilIcon className="size-5 rotate-[-15deg] text-foreground" />
                </div>
              </div>

              <h1 className="mt-5 text-[2.25rem] leading-none font-black uppercase tracking-tight text-foreground">
                {profile?.displayName || "Người dùng"}
              </h1>

              <Badge className="mt-4 h-9 rounded-xl border-[3px] border-border bg-[#00c2ff] px-4 text-base text-white comic-shadow">
                @{profile?.email?.split("@")[0] || "user"}
              </Badge>

              <Button
                asChild
                className="mt-5 h-14 w-full max-w-sm rounded-2xl text-lg uppercase"
              >
                <Link to="/settings">
                  <Edit3Icon className="size-5" />
                  Chỉnh sửa hồ sơ
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {profileStats.map((item) => (
          <Card key={item.label} className={`rounded-2xl ${item.tone}`}>
            <CardContent className="px-3 py-3 text-center">
              <p className="text-[0.6rem] font-black uppercase tracking-wide text-foreground/80">
                {item.label}
              </p>
              <p className="mt-1 text-[2.2rem] leading-none font-black">
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[1.6rem] bg-[#fffaf0]">
        <CardContent className="space-y-4 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.6rem] leading-none font-black uppercase tracking-tight">
              Thông tin chi tiết
            </h2>

            <div className="inline-flex size-7 items-center justify-center rounded-full bg-[#111111]/8">
              <CheckCircle2Icon className="size-4 text-[#b9b9b9]" />
            </div>
          </div>

          <div className="space-y-3">
            {profileDetails.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="flex items-center gap-3">
                  <div
                    className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border ${item.accent} comic-shadow`}
                  >
                    <Icon className="size-5" />
                  </div>

                  <p className="text-base font-black uppercase tracking-tight text-foreground">
                    {item.label}
                  </p>
                </div>
              );
            })}

            <div className="flex items-center gap-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border bg-[#e6f7ff] comic-shadow">
                <ClipboardListIcon className="size-5 text-foreground" />
              </div>

              <p className="text-base font-black uppercase tracking-tight text-foreground">
                Quản lý {taskStats.todo + taskStats.doing + taskStats.done}{" "}
                nhiệm vụ
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border bg-[#f1f5f9] comic-shadow">
                <PaletteIcon className="size-5 text-foreground" />
              </div>

              <p className="text-base font-black uppercase tracking-tight text-foreground">
                {formatLanguage(profile?.preferredLanguage)} /{" "}
                {formatTheme(profile?.themePreference)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border bg-[#ffe4ec] comic-shadow">
                <UserRoundIcon className="size-5 text-foreground" />
              </div>

              <p className="text-base font-black uppercase tracking-tight text-foreground">
                {Array.isArray(profile?.providers) &&
                profile.providers.length > 0
                  ? profile.providers
                      .map((provider) => provider.toUpperCase())
                      .join(", ")
                  : "LOCAL"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Card className="rounded-[1.4rem] bg-[#fff1f2]">
          <CardContent className="px-4 py-4 text-sm font-bold text-[#b42318]">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
