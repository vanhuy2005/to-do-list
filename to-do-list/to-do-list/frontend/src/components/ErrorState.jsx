import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorState({
  message = "Khong the tai du lieu. Vui long thu lai.",
  onRetry,
}) {
  return (
    <section className="rounded-lg border-[3px] border-border bg-[#ffe4ec] p-4 comic-shadow">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 inline-flex size-8 items-center justify-center rounded-md border-[3px] border-border bg-primary text-primary-foreground">
          <AlertTriangleIcon className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-extrabold">Da co loi xay ra</h3>
          <p className="mt-1 text-xs">{message}</p>

          <div className="mt-3">
            <Button type="button" variant="secondary" onClick={onRetry}>
              Thu lai
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
