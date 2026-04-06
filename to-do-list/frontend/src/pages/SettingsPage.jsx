import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRightIcon,
  FingerprintIcon,
  GlobeIcon,
  LockKeyholeIcon,
  MoonStarIcon,
  PaletteIcon,
  ShieldIcon,
  SunMediumIcon,
  UserRoundIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    accent: "bg-card text-card-foreground",
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
    <section className="space-y-4 pb-24">
      <Skeleton className="h-20 rounded-[1.4rem]" />
      <Skeleton className="h-36 rounded-[1.6rem]" />
      <Skeleton className="h-52 rounded-[1.6rem]" />
      <Skeleton className="h-40 rounded-[1.6rem]" />
    </section>
  );
}

function LoginPrompt() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center pb-24">
      <Card className="w-full max-w-md rounded-[1.8rem] bg-card">
        <CardContent className="space-y-4 px-5 py-6 text-center">
          <div className="mx-auto inline-flex size-16 items-center justify-center rounded-full border-[3px] border-border bg-[#ffd400] comic-shadow">
            <UserRoundIcon className="size-8 text-foreground" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
              Vui lòng đăng nhập
            </h1>
            <p className="text-sm font-bold text-muted-foreground">
              Bạn cần đăng nhập để thay đổi cài đặt cá nhân.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Button asChild className="h-12 rounded-2xl text-base uppercase">
              <Link to="/login">Đăng nhập</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

const formatCount = (value) => (Number.isFinite(value) ? value : 0);

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [avatarUrlDraft, setAvatarUrlDraft] = useState("");
  const [avatarFileName, setAvatarFileName] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(!authService.getToken());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = authService.getToken();

    if (!token) {
      setIsUnauthorized(true);
      setIsLoading(false);
      return undefined;
    }

    setIsUnauthorized(false);
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
        setDisplayNameDraft(profileResponse?.data?.displayName || "");
        setAvatarUrlDraft(profileResponse?.data?.avatarUrl || "");
        setAvatarFileName("");
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
          authService.clearToken();
          setIsUnauthorized(true);
          setProfile(null);
          setDisplayNameDraft("");
          setAvatarUrlDraft("");
          setAvatarFileName("");
          setSessionCount(0);
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
    setDisplayNameDraft(profile?.displayName || "");
  }, [profile?.displayName]);

  useEffect(() => {
    setAvatarUrlDraft(profile?.avatarUrl || "");
  }, [profile?.avatarUrl]);

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("File không hợp lệ", {
        description: "Vui lòng chọn một file ảnh.",
      });
      event.target.value = "";
      return;
    }

    const maxSizeInBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast.error("Ảnh quá lớn", {
        description: "Vui lòng chọn ảnh nhỏ hơn 2MB.",
      });
      event.target.value = "";
      return;
    }

    const fileDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
      reader.readAsDataURL(file);
    });

    setAvatarUrlDraft(fileDataUrl);
    setAvatarFileName(file.name);
  };

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

  const handleSaveDisplayName = async () => {
    const nextDisplayName = displayNameDraft.trim();

    if (nextDisplayName.length < 2 || nextDisplayName.length > 50) {
      toast.error("Tên hiển thị không hợp lệ", {
        description: "Tên hiển thị phải từ 2 đến 50 ký tự.",
      });
      return;
    }

    await saveProfile({ displayName: nextDisplayName });
  };

  const handleSaveAvatar = async () => {
    const nextAvatarUrl = avatarUrlDraft.trim();

    await saveProfile({ avatarUrl: nextAvatarUrl || null });
  };

  const handleClearAvatar = async () => {
    setAvatarUrlDraft("");
    setAvatarFileName("");
    await saveProfile({ avatarUrl: null });
  };

  const linkedProviders = useMemo(() => {
    if (!Array.isArray(profile?.providers) || profile.providers.length === 0) {
      return ["local"];
    }

    return profile.providers;
  }, [profile]);

  if (isLoading) {
    return <SettingsSkeleton />;
  }

  if (isUnauthorized) {
    return <LoginPrompt />;
  }

  return (
    <section className="space-y-4 pb-24">
      <div className="overflow-hidden rounded-[1.8rem] border-[3px] border-border bg-card comic-shadow">
        <div className="flex items-center gap-3 border-b-[3px] border-border bg-[#ffd400] px-4 py-3">
          <div className="inline-flex size-10 items-center justify-center rounded-xl border-[3px] border-border bg-card comic-shadow -rotate-12">
            <PaletteIcon className="size-5 text-primary" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[2rem] leading-none font-black uppercase tracking-tight text-foreground">
              Cài
            </span>
            <span className="-rotate-1 rounded-md border-[3px] border-border bg-primary px-2.5 py-1 text-[1.55rem] leading-none font-black uppercase tracking-tight text-primary-foreground comic-shadow">
              Đặt
            </span>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="space-y-4">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                <SunMediumIcon className="size-5 text-[#00c2ff]" />
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
                      className={`min-h-28 rounded-2xl border-[3px] border-border px-4 py-4 text-left transition-transform active:translate-y-px ${option.accent} ${isActive ? "ring-4 ring-[#111111]/10" : "opacity-90"}`}
                    >
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
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
              <div className="mb-3 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                <ShieldIcon className="size-5 text-primary" />
                Bảo mật
              </div>

              <div className="overflow-hidden rounded-[1.4rem] border-[3px] border-border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b-[3px] border-border px-4 py-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => toast.info("Tính năng đang phát triển")}
                >
                  <div>
                    <p className="text-base font-black uppercase tracking-tight">
                      Liên kết tài khoản
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      Google, Facebook, Apple
                    </p>
                  </div>
                  <ChevronRightIcon className="size-5 shrink-0" />
                </button>

                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b-[3px] border-border px-4 py-4 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() =>
                    toast.info(
                      `Đang có ${formatCount(sessionCount)} thiết bị đăng nhập`,
                    )
                  }
                >
                  <div>
                    <p className="text-base font-black uppercase tracking-tight">
                      Thiết bị đăng nhập
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      Quản lý các phiên hoạt động
                    </p>
                  </div>
                  <ChevronRightIcon className="size-5 shrink-0" />
                </button>

                <div className="flex items-center justify-between px-4 py-4">
                  <div>
                    <p className="text-base font-black uppercase tracking-tight">
                      Khóa ứng dụng (PIN)
                    </p>
                    <p className="text-xs font-bold text-muted-foreground">
                      Bảo vệ danh sách của bạn
                    </p>
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-8 w-14 items-center rounded-full border-[3px] border-border bg-card px-1 transition-colors"
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

            <div>
              <div className="mb-3 flex items-center gap-2 text-xl font-black uppercase tracking-tight">
                <GlobeIcon className="size-5 text-[#f9b000]" />
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
                      className={`flex w-full items-center justify-between rounded-[1.2rem] border-[3px] border-border bg-card px-4 py-4 text-left transition-transform active:translate-y-px ${isActive ? "ring-4 ring-[#111111]/10" : "opacity-95"}`}
                    >
                      <span className="text-base font-black uppercase tracking-tight">
                        {option.label}
                      </span>

                      <span
                        className={`inline-flex size-7 items-center justify-center rounded-full border-[3px] border-border ${isActive ? "bg-primary" : "bg-card"}`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <Card className="rounded-[1.4rem] bg-card">
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex items-center gap-2 text-lg font-black uppercase tracking-tight">
                  <LockKeyholeIcon className="size-5 text-primary" />
                  Tài khoản
                </div>

                <div className="space-y-3 text-sm font-bold text-foreground">
                  <div className="space-y-2 rounded-xl border-[3px] border-border bg-card px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="uppercase">Avatar ảnh</span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          disabled={isSaving}
                          onClick={handleClearAvatar}
                        >
                          Xóa
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="secondary"
                          disabled={isSaving}
                          onClick={handleSaveAvatar}
                        >
                          Lưu
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-border bg-[#ffd400] comic-shadow">
                        {avatarUrlDraft ? (
                          <img
                            src={avatarUrlDraft}
                            alt="Avatar preview"
                            className="size-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <UserRoundIcon className="size-6 text-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          disabled={isSaving}
                          className="h-11 rounded-xl bg-background py-2"
                        />
                        <p className="truncate text-xs font-bold text-muted-foreground">
                          {avatarFileName || "Chọn file ảnh để làm avatar"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl border-[3px] border-border bg-card px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="uppercase">Tên hiển thị</span>
                      <Button
                        type="button"
                        size="xs"
                        variant="secondary"
                        disabled={isSaving}
                        onClick={handleSaveDisplayName}
                      >
                        Lưu
                      </Button>
                    </div>

                    <Input
                      type="text"
                      value={displayNameDraft}
                      onChange={(event) =>
                        setDisplayNameDraft(event.target.value)
                      }
                      disabled={isSaving}
                      placeholder="Nhập tên hiển thị"
                      className="h-11 rounded-xl bg-background uppercase"
                      maxLength={50}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-border bg-card px-3 py-3">
                    <span className="uppercase">Email</span>
                    <span className="max-w-[55%] truncate text-right lowercase">
                      {profile?.email || "---"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl border-[3px] border-border bg-card px-3 py-3">
                    <span className="uppercase">Kết nối</span>
                    <span className="max-w-[55%] truncate text-right uppercase">
                      {linkedProviders
                        .map((provider) => provider.toUpperCase())
                        .join(", ")}
                    </span>
                  </div>
                </div>

                <Button
                  asChild
                  variant="secondary"
                  className="h-12 w-full rounded-2xl text-base uppercase"
                >
                  <Link to="/profile">
                    <UserRoundIcon className="size-5" />
                    Xem hồ sơ
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
