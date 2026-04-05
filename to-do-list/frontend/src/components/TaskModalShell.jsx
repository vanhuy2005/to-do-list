import { useLocation, useNavigate } from "react-router-dom";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function TaskModalShell({
  children,
  closeTo = "/",
  forceCloseTo = false,
  className,
  bodyClassName,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const closeModal = () => {
    if (forceCloseTo || location.key === "default") {
      navigate(closeTo, { replace: true });
      return;
    }

    navigate(-1);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          closeModal();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-3xl overflow-hidden p-0 sm:max-w-3xl",
          className,
        )}
      >
        <div
          className={cn(
            "max-h-[calc(100vh-1rem)] overflow-y-auto bg-background p-4 pb-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
