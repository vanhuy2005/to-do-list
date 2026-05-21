import { useEffect, useState } from "react";
import {
  ChevronRightIcon,
  GlobeIcon,
  MoonStarIcon,
  PaletteIcon,
  ShieldIcon,
  SunMediumIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/axios";
import NotificationSection from "@/components/settings/NotificationSection";

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
    <section className="space-y-6 pb-24 px-4 pt-6">
      <Skeleton className="h-40 rounded-[1.6rem]" />
      <Skeleton className="h-52 rounded-[1.6rem]" />
      <Skeleton className="h-40 rounded-[1.6rem]" />
    </section>
  );
}

const formatCount = (value) => (Number.isFinite(value) ? value : 0);

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

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

        setProfile(profileResponse?.data || null);
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



  const activeLanguage = profile?.preferredLanguage || "vi";
  const activeTheme = profile?.themePreference || "light";

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



  if (isLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <section className="space-y-8 px-4 pt-6 pb-24 lg:space-y-5 lg:px-0 lg:pt-3 lg:pb-8">
      {/* Desktop compact split layout */}
      <div className="space-y-8 lg:grid lg:grid-cols-12 lg:gap-5 lg:space-y-0">
        {/* Column 1: Theme + Security */}
        <div className="space-y-8 lg:space-y-5 lg:col-span-5">
          {/* Settings Theme */}
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

          {/* Security — still in column 1 */}
          <div>
            <div className="mb-4 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
              <ShieldIcon className="size-6 text-[#ff3b57]" />
              Bảo mật
            </div>

            <div className="overflow-hidden rounded-[1.4rem] border-[3px] border-border bg-card comic-shadow border-b-[5px]">
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
                  <p className="text-[1.1rem] leading-none font-black uppercase tracking-tight mb-1">
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
                  <p className="text-[1.1rem] leading-none font-black uppercase tracking-tight mb-1">
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
          {/* End column 1 */}
        </div>

        {/* Column 2: Language + Account */}
        <div className="space-y-8 lg:space-y-5 lg:col-span-7">
          {/* Language */}
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

          {/* End col2 */}
        </div>
        {/* End 2-column grid */}
      </div>

      {/* Overdue notifications configuration and timeline log */}
      <NotificationSection />
    </section>
  );
}
