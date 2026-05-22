import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import taskService from "@/services/taskService";
import authService from "@/services/authService";
import UserAvatar from "@/components/UserAvatar";
import { toast } from "sonner";
import { SendIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TaskCommentsModal({ open, onOpenChange, taskId, taskTitle }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actualTaskTitle, setActualTaskTitle] = useState(taskTitle || "");
  const [accessLevel, setAccessLevel] = useState(null);

  const currentUser = authService.getUser();
  const currentUserId = currentUser?._id || currentUser?.id;

  const fetchComments = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const res = await taskService.getTaskComments(taskId);
      setComments(res?.data || res || []);
      
      // Also fetch task to update title just in case
      try {
        const taskRes = await taskService.getTaskById(taskId);
        const taskObj = taskRes?.data || taskRes;
        if (taskObj) {
          if (taskObj.title) {
            setActualTaskTitle(taskObj.title);
          }
          if (taskObj.accessLevel) {
            setAccessLevel(taskObj.accessLevel);
          }
        }
      } catch (err) {
        console.error("Failed to fetch task title:", err);
      }
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải bình luận.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && taskId) {
      fetchComments();
    }
  }, [open, taskId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await taskService.createTaskComment(taskId, {
        content: newComment.trim(),
      });
      toast.success("Đã thêm nhận xét!");
      setNewComment("");
      fetchComments();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Không thể thêm nhận xét. Có thể bạn không có quyền.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-md border-4 border-border bg-card p-6 rounded-[2rem] comic-shadow">
        <DialogHeader className="border-b border-border/10 pb-3">
          <DialogTitle className="text-xl font-black uppercase text-foreground flex items-center gap-2">
            <span>💬 Nhận xét nhiệm vụ</span>
          </DialogTitle>
          <div className="text-xs font-black uppercase text-muted-foreground mt-1 truncate">
            {actualTaskTitle}
          </div>
        </DialogHeader>

        {/* Comment list container */}
        <div className="min-h-[200px] max-h-[300px] overflow-y-auto pr-1 py-3 space-y-3 scrollbar-hide">
          {isLoading ? (
            <div className="text-center py-8 text-xs font-bold text-muted-foreground">Đang tải bình luận...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-xs font-bold text-muted-foreground">Chưa có nhận xét nào. Hãy bắt đầu thảo luận!</div>
          ) : (
            comments.map((comment) => {
              const commentUserId = comment.userId?._id || comment.userId;
              const isMe = commentUserId === currentUserId;
              const displayName = comment.userId?.displayName || "Người dùng ẩn danh";
              const avatarUrl = comment.userId?.avatarUrl;
              
              return (
                <div key={comment._id} className={cn("flex gap-2.5 items-start", isMe && "flex-row-reverse")}>
                  {/* Avatar */}
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    displayName={displayName}
                    email={comment.userId?.email}
                    sizeClassName="size-8"
                    textClassName="text-xs font-black"
                  />

                  {/* Speech Bubble */}
                  <div className="max-w-[75%] space-y-1">
                    <div className={cn("text-[9px] font-black uppercase text-muted-foreground px-1", isMe && "text-right")}>
                      {displayName} {isMe && <span className="text-[8px] bg-[#ffd400] text-foreground border border-border px-0.5 rounded">Bạn</span>}
                    </div>
                    <div className={cn(
                      "p-2.5 border-2 border-border rounded-xl text-xs font-bold comic-shadow-sm",
                      isMe ? "bg-[#dbf5ff] text-foreground rounded-tr-none" : "bg-white text-foreground rounded-tl-none"
                    )}>
                      {comment.content}
                    </div>
                    <div className={cn("text-[8px] text-muted-foreground/60 px-1", isMe && "text-right")}>
                      {new Date(comment.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Comment input form / restricted view */}
        {accessLevel === "view" ? (
          <div className="border-t border-border/10 pt-4 text-center py-3 bg-[#ffe4ec] border-2 border-dashed border-[#ff3b57] rounded-xl">
            <p className="text-[10px] font-black uppercase text-[#ff3b57]">
              Bạn chỉ có quyền xem, không thể nhận xét.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitComment} className="border-t border-border/10 pt-3 space-y-3">
            <div className="relative">
              <Textarea
                placeholder="Nhập nhận xét của bạn tại đây..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-16 text-xs font-bold border-2 border-border rounded-xl resize-none pr-12 focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
                rows={2}
              />
              <Button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                size="icon"
                className="absolute right-2 bottom-2 size-8 bg-[#00c2ff] hover:bg-[#00afe6] border-2 border-border text-foreground rounded-lg comic-shadow active:translate-y-0.5"
              >
                <SendIcon className="size-3.5 text-foreground" />
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
