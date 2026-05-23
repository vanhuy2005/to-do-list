import { useState, useRef, useEffect } from "react";
import { CameraIcon, Trash2Icon, Loader2Icon, UserIcon, XCircleIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import api from "@/lib/axios";

// Generate a high-contrast Pop Art color palette based on username hash
const getPopArtColor = (name) => {
  if (!name) return "bg-[#ffd400]"; // Default bright yellow
  const colors = [
    "bg-[#ffd400]", // Bright yellow
    "bg-[#ff3b57]", // Vibrant coral red
    "bg-[#00c2ff]", // Sky blue
    "bg-[#10b981]", // Emerald green
    "bg-[#a855f7]", // Bright purple
    "bg-[#f97316]", // Dark orange
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export default function AvatarUpload({ avatarUrl, displayName, onAvatarChange }) {
  const [previewUrl, setPreviewUrl] = useState(avatarUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    setPreviewUrl(avatarUrl || "");
  }, [avatarUrl]);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate type (Client-side whitelist)
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error("Định dạng không hợp lệ", {
        description: "Hệ thống chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.",
      });
      event.target.value = "";
      return;
    }

    // Validate size (5MB Whitelist)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast.error("Kích thước file quá lớn", {
        description: "Dung lượng ảnh đại diện không được vượt quá 5MB.",
      });
      event.target.value = "";
      return;
    }

    // Generate optimistic UI preview
    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    setIsUploading(true);

    // Initialize AbortController for cancel capability
    abortControllerRef.current = new AbortController();

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await api.post("/profile/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        signal: abortControllerRef.current.signal,
      });

      const data = response?.data;
      if (response?.success && data?.avatarUrl) {
        toast.success("Tải ảnh lên thành công", {
          description: "Ảnh đại diện của bạn đã được cập nhật.",
        });
        onAvatarChange(data.avatarUrl);
        setPreviewUrl(data.avatarUrl);
      } else {
        throw new Error(response?.message || "Tải ảnh lên thất bại");
      }
    } catch (error) {
      if (error.name === "CanceledError" || error.message === "canceled") {
        toast.info("Đã hủy tải ảnh lên");
      } else {
        console.error("Upload error:", error);
        toast.error("Tải ảnh thất bại", {
          description: error?.response?.data?.error?.message || "Không thể tải ảnh đại diện lên máy chủ.",
        });
        // Revert to original
        setPreviewUrl(avatarUrl || "");
      }
    } finally {
      setIsUploading(false);
      event.target.value = "";
      abortControllerRef.current = null;
    }
  };

  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleDeleteAvatar = async () => {
    setIsDeleting(true);
    try {
      const response = await api.delete("/profile/avatar");
      if (response?.success) {
        toast.success("Đã gỡ ảnh đại diện", {
          description: "Ảnh đại diện đã được xóa thành công.",
        });
        onAvatarChange(null);
        setPreviewUrl("");
      } else {
        throw new Error(response?.message || "Không thể xóa ảnh đại diện");
      }
    } catch (error) {
      console.error("Delete avatar error:", error);
      toast.error("Xóa thất bại", {
        description: error?.response?.data?.error?.message || "Gặp lỗi khi gỡ ảnh đại diện.",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  // Extract initials for fallback display
  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
  };

  const initials = getInitials(displayName);
  const colorClass = getPopArtColor(displayName);

  return (
    <div className="flex flex-col items-center gap-4 rounded-[1.4rem] border-[3px] border-border bg-card p-6 comic-shadow">
      <div className="relative group/avatar cursor-pointer" onClick={handleAvatarClick}>
        {/* Profile Circle */}
        <div className={`relative size-32 overflow-hidden rounded-full border-[4px] border-border shadow-[4px_4px_0px_0px_#000000] transition-transform duration-100 group-active/avatar:scale-95 flex items-center justify-center ${colorClass}`}>
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Profile"
              className="size-full object-cover"
              onError={() => {
                setPreviewUrl("");
              }}
            />
          ) : initials ? (
            <span className="font-heading text-4xl font-extrabold text-foreground tracking-tighter select-none">
              {initials}
            </span>
          ) : (
            <UserIcon className="size-16 text-foreground" />
          )}

          {/* Loading Spinner / Cancel Button */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
              <Loader2Icon className="size-8 text-white animate-spin" />
              <button
                type="button"
                onClick={handleCancelUpload}
                className="mt-1 flex items-center gap-1 rounded bg-[#ff3b57] border-[2px] border-border text-white text-[10px] font-extrabold px-1.5 py-0.5 active:translate-y-px"
              >
                HỦY
              </button>
            </div>
          )}

          {/* Camera Overlay on Hover */}
          {!isUploading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150 flex items-center justify-center">
              <CameraIcon className="size-10 text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" />
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        data-testid="avatar-file-input"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        disabled={isUploading}
        className="hidden"
        // Prompt camera capture directly on smart mobile screens
        capture="user"
      />

      <div className="flex flex-col items-center text-center">
        <h3 className="font-heading text-lg font-black uppercase tracking-tight text-foreground">
          Ảnh đại diện
        </h3>
        <p className="text-xs font-bold text-muted-foreground mt-1 max-w-[200px]">
          Chấp nhận JPEG, PNG, WebP, GIF dung lượng tối đa 5MB.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 w-full max-w-[240px]">
        <Button
          type="button"
          variant="secondary"
          onClick={handleAvatarClick}
          disabled={isUploading}
          className="flex-1 border-[3px] border-border text-xs py-2 shadow-[2px_2px_0px_0px_#000000]"
        >
          TẢI ẢNH LÊN
        </Button>
        
        {avatarUrl && (
          <Button
            type="button"
            variant="primary"
            aria-label="Xóa avatar"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={isUploading}
            className="border-[3px] border-border bg-[#ff3b57] text-white hover:bg-[#ff3b57]/90 text-xs py-2 shadow-[2px_2px_0px_0px_#000000]"
          >
            <Trash2Icon className="size-4" />
          </Button>
        )}
      </div>

      {/* Pop Art styled confirm delete dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="border-[3px] border-border comic-shadow rounded-[1.4rem] bg-[#fffaf0] !p-0 !gap-0 overflow-hidden">
          <DialogHeader className="!m-0 bg-[#ff3b57] text-white px-5 py-4 border-b-[3px] border-border">
            <DialogTitle className="font-heading text-lg font-black uppercase tracking-tight">
              Xác nhận xóa ảnh
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 text-sm font-bold text-foreground">
            <DialogDescription className="text-foreground text-sm font-bold">
              Bạn có chắc chắn muốn xóa ảnh đại diện của mình? Hành động này không thể hoàn tác và ảnh sẽ bị xóa vĩnh viễn khỏi Cloudinary.
            </DialogDescription>
          </div>
          <DialogFooter className="bg-card px-5 py-4 border-t-[3px] border-border flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="border-[3px] border-border shadow-[2px_2px_0px_0px_#000000]"
            >
              HỦY BỎ
            </Button>
            <Button
              type="button"
              variant="primary"
              aria-label="Xác nhận gỡ"
              onClick={handleDeleteAvatar}
              disabled={isDeleting}
              className="border-[3px] border-border bg-[#ff3b57] text-white hover:bg-[#ff3b57]/90 shadow-[2px_2px_0px_0px_#000000]"
            >
              {isDeleting ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                "XÓA NGAY"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
