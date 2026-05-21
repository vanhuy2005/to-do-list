import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import projectService from "@/services/projectService";
import { toast } from "sonner";

export default function ProjectMembersModal({
  open,
  onOpenChange,
  project,
  onMembersUpdated,
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("viewer");
  const [isInviting, setIsInviting] = useState(false);

  const members = project?.members || [];

  async function handleInvite() {
    if (!email.trim()) return;
    setIsInviting(true);
    try {
      await projectService.addMember(project._id, {
        email: email.trim(),
        role,
      });
      toast.success("Đã gửi lời mời");
      setEmail("");
      onMembersUpdated && onMembersUpdated();
    } catch (err) {
      toast.error("Không thể gửi lời mời");
    } finally {
      setIsInviting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Thành viên — {project?.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-bold">Mời theo email</label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="rounded-md border px-2"
              >
                <option value="viewer">Viewer</option>
                <option value="comment">Comment</option>
                <option value="editor">Editor</option>
              </select>
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting ? "Đang..." : "Gửi"}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold">Danh sách thành viên</div>
            <div className="space-y-2 pt-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div>
                    <div className="font-bold">
                      {m.userId?.email || m.userId}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {m.role}
                    </div>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  Chưa có thành viên
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
