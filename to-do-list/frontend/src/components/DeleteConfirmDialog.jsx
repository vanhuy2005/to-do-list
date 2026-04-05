import { Loader2Icon, AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting = false,
  taskTitle = "",
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm">
        <DialogHeader className="bg-destructive">
          <DialogTitle className="flex items-center gap-2 text-destructive-foreground">
            <AlertTriangleIcon className="size-5" />
            Xác nhận xóa
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-sm font-bold">Bạn có chắc muốn xóa nhiệm vụ này?</p>
          {taskTitle && (
            <p className="rounded-md border-[3px] border-border bg-card px-3 py-2 text-sm font-black uppercase comic-shadow">
              {taskTitle}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Nhiệm vụ sẽ được chuyển vào thùng rác và có thể khôi phục trong 7 ngày.
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2Icon className="mr-1 size-4 animate-spin" />
                Đang xóa...
              </>
            ) : (
              "Xóa ngay!"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
