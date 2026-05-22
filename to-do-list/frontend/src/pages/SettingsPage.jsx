import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRightIcon,
  GlobeIcon,
  LockKeyholeIcon,
  MoonStarIcon,
  PaletteIcon,
  ShieldIcon,
  SunMediumIcon,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import AvatarUpload from "@/components/settings/AvatarUpload";
import NotificationSection from "@/components/settings/NotificationSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/axios";
import authService from "@/services/authService";

const themeOptions = [
  {
    value: "light",
    label: "Sáng",
    icon: SunMediumIcon,
    accent: "bg-[#ffd400] text-foreground",
  },
  {
    value: "dark",
    label: "Tối",
    icon: MoonStarIcon,
    accent: "bg-background text-foreground",
  },
];

const languageOptions = [
  {
    value: "vi",
    label: "Tiếng Việt",
  },
  {
    value: "en",
    label: "English",
  },
];

function SettingsSkeleton() {
  return (
    <section className="space-y-6 px-4 pt-6 pb-24">
      <Skeleton className="h-40 rounded-[1.6rem]" />
      <Skeleton className="h-52 rounded-[1.6rem]" />
      <Skeleton className="h-40 rounded-[1.6rem]" />
    </section>
  );
}

const formatCount = (value) => (Number.isFinite(value) ? value : 0);

export default function SettingsPage({ setActiveTab }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isAdmin = authService.getRole() === "admin";

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      setIsLoading(true);

      try {
        const [profileResponse, sessionsResponse] = await Promise.all([
          api.get("/profile"),
          api.get("/profile/sessions"),
        ]);

        if (!isMounted) {
          return;
        }

        const profileData = profileResponse?.data || null;
        setProfile(profileData);
        if (profileData) {
          const currentUser = authService.getUser();
          if (currentUser) {
            authService.setUser({
              ...currentUser,
              providers: profileData.providers,
            });
          }
        }
        setSessionCount(
          Array.isArray(sessionsResponse?.data)
            ? sessionsResponse.data.length
            : 0,
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (error?.response?.status === 401) {
          return;
        }

        toast.error("Không tải được cài đặt", {
          description:
            error?.response?.data?.error?.message ||
            "Không thể tải dữ liệu cài đặt từ cơ sở dữ liệu.",
        });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const themePreference = profile?.themePreference;

    if (themePreference === "dark") {
      document.documentElement.classList.add("dark");
    } else if (themePreference === "light") {
      document.documentElement.classList.remove("dark");
    }
  }, [profile?.themePreference]);

  useEffect(() => {
    const oauthStatus = searchParams.get("oauth");
    if (!oauthStatus) {
      return;
    }

    if (oauthStatus === "link-success") {
      const refreshLinkedAccount = async () => {
        await authService.hydrateFromSessionCookie();

        try {
          const profileResponse = await api.get("/profile");
          const profileData = profileResponse?.data || null;

          if (profileData) {
            setProfile(profileData);
          }

          toast.success("Liên kết tài khoản Google thành công!");
        } catch {
          toast.success("Liên kết tài khoản Google thành công!");
        }
      };

      refreshLinkedAccount();
    } else if (oauthStatus === "link-error") {
      toast.error("Liên kết tài khoản Google thất bại. Vui lòng thử lại.");
    }

    navigate(window.location.pathname, { replace: true });
  }, [searchParams, navigate]);

  const activeLanguage = profile?.preferredLanguage || "vi";
  const activeTheme = profile?.themePreference || "light";
  const hasGoogleLinked = profile?.providers?.includes("google");

  const saveProfile = async (updates) => {
    if (!profile?.id) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.put("/profile", updates);
      const nextProfile = response?.data || null;
      setProfile(nextProfile);

      if (nextProfile?.themePreference === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }

      toast.success("Đã lưu cài đặt");
    } catch (error) {
      const nextMessage =
        error?.response?.data?.error?.message ||
        "Không thể lưu cài đặt. Vui lòng thử lại.";
      toast.error("Lưu thất bại", { description: nextMessage });
    } finally {
      setIsSaving(false);
    }
  };



  const handleLinkGoogle = () => {
    if (!authService.isAuthenticated()) {
      toast.error("Không thể liên kết Google", {
        description: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
      });
      return;
    }

    authService.linkGoogleAccount().catch((error) => {
      toast.error(
        error?.message || "Không thể liên kết Google. Vui lòng thử lại.",
      );
    });
  };

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <section className="space-y-8 px-4 pt-6 pb-24 lg:space-y-5 lg:px-0 lg:pt-3 lg:pb-8">
      {isAdmin && (
        <div className="flex items-center">
          <Button
            variant="outline"
            onClick={() =>
              setActiveTab ? setActiveTab("home") : navigate("/dashboard")
            }
            className="group flex items-center gap-2 rounded-xl border-[3px] border-border bg-card font-black uppercase text-foreground comic-shadow active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all hover:bg-black/5"
          >
            <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
            Quay lại
          </Button>
        </div>
      )}
      <div className="space-y-8 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0">
        <div className="space-y-8 lg:col-span-5 lg:space-y-5">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <PaletteIcon className="size-6 text-[#00c2ff]" />
              Giao diện
            </div>

            <div className="grid grid-cols-2 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = activeTheme === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      saveProfile({ themePreference: option.value })
                    }
                    className={`min-h-28 rounded-[1.2rem] border-[3px] border-border border-b-[5px] px-4 py-4 text-center transition-all active:translate-y-[2px] active:border-b-[3px] lg:hover:scale-[1.03] lg:hover:shadow-[4px_4px_0_#111111] ${option.accent} ${
                      isActive ? "comic-shadow opacity-100" : "opacity-90"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Icon className="size-8" />
                      <span className="text-lg font-black uppercase tracking-tight">
                        {option.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <ShieldIcon className="size-6 text-[#ff3b57]" />
              Bảo mật
            </div>

            <div className="overflow-hidden rounded-[1.4rem] border-[3px] border-border border-b-[5px] bg-card comic-shadow">
              <button
                type="button"
                className="flex w-full items-center justify-between border-b-[3px] border-border px-5 py-5 text-left transition-all active:bg-black/5 dark:active:bg-white/10 lg:hover:bg-black/3"
                onClick={() =>
                  toast.info(
                    `Đang có ${formatCount(sessionCount)} thiết bị đăng nhập`,
                  )
                }
              >
                <div>
                  <p className="mb-1 text-[1.1rem] leading-none font-black uppercase tracking-tight">
                    Thiết bị đăng nhập
                  </p>
                  <p className="text-[0.8rem] font-bold text-muted-foreground">
                    Quản lý các phiên hoạt động
                  </p>
                </div>
                <ChevronRightIcon className="size-6 shrink-0" />
              </button>

              <div className="flex items-center justify-between px-5 py-5">
                <div>
                  <p className="mb-1 text-[1.1rem] leading-none font-black uppercase tracking-tight">
                    Khóa ứng dụng (PIN)
                  </p>
                  <p className="text-[0.8rem] font-bold text-muted-foreground">
                    Bảo vệ danh sách của bạn
                  </p>
                </div>

                <button
                  type="button"
                  className="inline-flex h-8 w-14 items-center rounded-full border-[3px] border-border bg-card px-1 transition-colors comic-shadow-sm"
                  onClick={() =>
                    toast.info("Khóa PIN sẽ được kích hoạt ở bản tiếp theo")
                  }
                  aria-label="Khóa ứng dụng"
                >
                  <span className="size-5 rounded-full border-[3px] border-border bg-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 lg:col-span-7 lg:space-y-5">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <GlobeIcon className="size-6 text-[#ffd400]" />
              Ngôn ngữ
            </div>

            <div className="space-y-3">
              {languageOptions.map((option) => {
                const isActive = activeLanguage === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      saveProfile({ preferredLanguage: option.value })
                    }
                    className={`flex w-full items-center justify-between rounded-[1.2rem] border-[3px] border-b-[5px] border-border bg-card px-5 py-4 text-left transition-all active:translate-y-[2px] active:border-b-[3px] lg:hover:scale-[1.02] lg:hover:shadow-[4px_4px_0_#111111] ${
                      isActive ? "comic-shadow" : "opacity-95"
                    }`}
                  >
                    <span className="text-[1.1rem] font-black uppercase tracking-tight">
                      {option.label}
                    </span>

                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-full border-[3px] border-border ${
                        isActive ? "bg-[#ff3b57]" : "bg-card"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <LockKeyholeIcon className="size-6 text-primary" />
              Tài khoản liên kết
            </div>

            <div className="flex flex-col gap-3 rounded-[1.2rem] border-[3px] border-border bg-card px-4 py-4 comic-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="inline-flex size-10 items-center justify-center rounded-xl border-[2.5px] border-border bg-white shrink-0">
                    <svg className="size-5" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.97 11.97 0 0 0 12 .909a11.966 11.966 0 0 0-8.91 4.148l2.176 4.708z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.455 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.418a5.55 5.55 0 0 1-2.4 3.645l2.173 4.71a11.983 11.983 0 0 0 7.264-10.564z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M3.09 5.057L5.266 9.765a7.062 7.062 0 0 1 6.734-4.856c1.69 0 3.218.6 4.418 1.582L19.91 3A11.97 11.97 0 0 0 12 .909c-3.236 0-6.19 1.282-8.91 4.148z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.091a11.758 11.758 0 0 0 8.018-2.927l-2.173-4.71A7.018 7.018 0 0 1 12 19.091c-3.864 0-7.073-2.618-8.245-6.136L1.582 17.68A11.96 11.96 0 0 0 12 23.091z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-black">Google</p>
                    <p className="text-xs font-bold text-muted-foreground">
                      {hasGoogleLinked ? "Đã liên kết" : "Chưa liên kết"}
                    </p>
                  </div>
                </div>
                {hasGoogleLinked ? (
                  <span className="rounded-lg border-[2px] border-border bg-[#34A853]/10 px-3 py-1.5 text-xs font-black uppercase text-[#34A853]">
                    Đã liên kết
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleLinkGoogle}
                    className="border-[2px] bg-white text-foreground comic-shadow-sm hover:bg-[#fff6d6]"
                  >
                    Liên kết
                  </Button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      <NotificationSection />
    </section>
  );
}
