import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2Icon,
  ClipboardListIcon,
  Edit3Icon,
  LogOutIcon,
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
    <section className="relative pb-24">
      {/* Edge-to-edge red block background */}
      <div className="-mx-4 -mt-4 bg-[#ff3b57] border-b-[3px] border-border pb-16 pt-8 text-center px-4 relative z-0">
         {/* Avatar floating between the zones */}
         <div className="absolute left-1/2 bottom-0 translate-y-1/2 -translate-x-1/2 z-10 w-full flex justify-center">
            <div className="relative">
              <div className="flex size-32 items-center justify-center overflow-hidden rounded-full border-[4px] border-border bg-[radial-gradient(circle_at_30%_30%,#ffd400_0%,#ff7a59_35%,#1f7bdc_68%,#0d324d_100%)] comic-shadow">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName || "User avatar"}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-[3rem] font-black uppercase text-white">
                    {getInitials(profile?.displayName)}
                  </div>
                )}
              </div>

              <div className="absolute bottom-0 right-0 inline-flex size-10 items-center justify-center rounded-full border-[3px] border-border bg-[#ffd400] comic-shadow">
                <PencilIcon className="size-5 text-foreground" />
              </div>
            </div>
         </div>
      </div>

      <div className="px-4 space-y-5 pt-20 relative z-0">
        <div className="text-center">
          <h1 className="text-[2.25rem] leading-none font-black uppercase tracking-tight text-foreground">
            {profile?.displayName || "Người dùng"}
          </h1>

          <Badge className="mt-3 h-9 rounded-xl border-[3px] border-border bg-[#00c2ff] px-4 text-base text-white comic-shadow">
            @{profile?.email?.split("@")[0] || "user_id"}
          </Badge>

          <Button
            asChild
            className="mt-5 h-14 w-full rounded-2xl border-[3px] border-border border-b-[6px] text-lg uppercase comic-shadow bg-[#ff3b57] text-white active:border-b-[3px] active:translate-y-[3px]"
          >
            <Link to="/settings">
              Chỉnh sửa hồ sơ
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {profileStats.map((item) => (
            <Card key={item.label} className={`rounded-2xl border-[3px] border-border border-b-[5px] comic-shadow ${item.tone}`}>
              <CardContent className="px-1 py-3 text-center">
                <p className="text-[0.6rem] sm:text-xs font-black uppercase tracking-wide opacity-90">
                  {item.label}
                </p>
                <p className="mt-1 text-[2rem] leading-none font-black">
                  {item.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-[1.6rem] bg-[#fffaf0] border-[3px] border-border comic-shadow">
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
                  <div key={item.label} className="flex items-center gap-3">
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

              <div className="flex items-center gap-3">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border-[3px] border-border bg-[#e6f7ff] comic-shadow">
                  <ClipboardListIcon className="size-5 text-foreground" />
                </div>

                <p className="text-[13px] sm:text-base font-black uppercase tracking-tight text-foreground line-clamp-1">
                  Quản lý {taskStats.todo + taskStats.doing + taskStats.done}{" "}
                  nhiệm vụ
                </p>
              </div>

              <div className="flex items-center gap-3">
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

        {errorMessage ? (
          <Card className="rounded-[1.4rem] bg-[#fff1f2] border-[3px] border-border comic-shadow">
            <CardContent className="px-4 py-4 text-sm font-bold text-[#b42318]">
              {errorMessage}
            </CardContent>
          </Card>
        ) : null}

        {/* Secure Logout Container matching user design */}
        <div className="mt-8 rounded-[1.6rem] border-[4px] border-dashed border-[#ff3b57]/60 p-2 bg-[#ff3b57]/5">
           <Button
              type="button"
              onClick={handleLogout}
              className="h-14 w-full rounded-[1.2rem] border-[3px] border-border border-b-[6px] text-lg uppercase bg-[#ff3b57] text-white comic-shadow active:border-b-[3px] active:translate-y-[3px]"
            >
              <LogOutIcon className="size-5 mr-1" />
              Đăng xuất
            </Button>
        </div>

      </div>
    </section>
  );
}
