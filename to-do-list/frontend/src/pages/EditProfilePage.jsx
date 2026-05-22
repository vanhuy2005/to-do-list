import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserRound, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/axios";
import authService from "@/services/authService";
import AvatarUpload from "@/components/settings/AvatarUpload";

function EditProfileSkeleton() {
  return (
    <section className="space-y-6 pb-24 px-4 pt-6 max-w-2xl mx-auto">
      <Skeleton className="h-12 w-32 rounded-xl" />
      <Skeleton className="h-48 rounded-[1.6rem]" />
      <Skeleton className="h-32 rounded-[1.6rem]" />
      <Skeleton className="h-20 rounded-[1.6rem]" />
    </section>
  );
}

export default function EditProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/profile");
        if (!isMounted) return;
        setProfile(response?.data || null);
        setDisplayNameDraft(response?.data?.displayName || "");
      } catch (error) {
        if (!isMounted) return;
        toast.error("Không tải được hồ sơ", {
          description: error?.response?.data?.error?.message || "Không thể tải dữ liệu hồ sơ.",
        });
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

  const saveProfile = async (updates) => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const response = await api.put("/profile", updates);
      const nextProfile = response?.data || null;
      setProfile(nextProfile);
      
      // Update session user details
      if (nextProfile) {
        const currentUser = authService.getUser();
        if (currentUser) {
          currentUser.displayName = nextProfile.displayName;
          currentUser.avatarUrl = nextProfile.avatarUrl;
          authService.setUser(currentUser);
        }
      }

      toast.success("Đã cập nhật hồ sơ thành công");
    } catch (error) {
      toast.error("Cập nhật thất bại", {
        description: error?.response?.data?.error?.message || "Không thể cập nhật hồ sơ.",
      });
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

  if (isLoading) {
    return <EditProfileSkeleton />;
  }

  return (
    <section className="space-y-6 px-4 pt-6 pb-24 max-w-2xl mx-auto lg:px-0 lg:pt-3 lg:pb-8">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={() => navigate("/profile")}
          className="group flex items-center gap-2 rounded-xl border-[3px] border-border bg-card font-black uppercase text-foreground comic-shadow active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all hover:bg-black/5"
        >
          <ArrowLeft className="size-5 transition-transform group-hover:-translate-x-1" />
          Quay lại
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-foreground">
          <UserRound className="size-7 text-primary" />
          Chỉnh sửa hồ sơ
        </div>

        <div className="space-y-4 text-sm font-bold text-foreground">
          {/* Cloudinary-based Avatar Upload component */}
          <div className="rounded-[1.4rem] border-[3px] border-border bg-card p-4 comic-shadow">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground mb-3">Ảnh đại diện</p>
            <AvatarUpload
              avatarUrl={profile?.avatarUrl}
              displayName={profile?.displayName}
              onAvatarChange={(newUrl) => {
                setProfile((prev) => ({ ...prev, avatarUrl: newUrl }));
                const currentUser = authService.getUser();
                if (currentUser) {
                  currentUser.avatarUrl = newUrl;
                  authService.setUser(currentUser);
                }
                toast.success("Đã tải ảnh đại diện lên");
              }}
            />
          </div>

          {/* Display Name Form */}
          <div className="space-y-2 rounded-[1.4rem] border-[3px] border-border bg-card px-5 py-5 comic-shadow">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-base uppercase font-black">
                Tên hiển thị
              </span>
              <Button
                type="button"
                size="default"
                disabled={isSaving}
                onClick={handleSaveDisplayName}
                className="h-10 rounded-xl border-[3px] border-border border-b-[5px] bg-primary text-primary-foreground comic-shadow active:translate-y-0.5 active:shadow-[1px_1px_0_rgba(0,0,0,1)] transition-all font-black uppercase hover:bg-primary/90"
              >
                Lưu thay đổi
              </Button>
            </div>

            <Input
              type="text"
              value={displayNameDraft}
              onChange={(event) => setDisplayNameDraft(event.target.value)}
              disabled={isSaving}
              placeholder="Nhập tên hiển thị mới..."
              className="h-12 rounded-xl bg-background border-[3px] border-border uppercase font-bold focus:ring-primary focus:border-primary"
              maxLength={50}
            />
          </div>

          {/* Email Info Card */}
          <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border-[3px] border-border bg-[#fffaf0] px-5 py-5 comic-shadow">
            <div className="flex items-center gap-3">
              <Mail className="size-6 text-muted-foreground" />
              <span className="text-base uppercase font-black">Email đăng nhập</span>
            </div>
            <span className="truncate text-right lowercase font-black text-muted-foreground select-all bg-card/50 px-3 py-1.5 rounded-lg border-2 border-border/10">
              {profile?.email || "---"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
