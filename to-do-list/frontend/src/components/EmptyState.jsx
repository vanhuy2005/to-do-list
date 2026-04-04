import { InboxIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function EmptyState({
  title = "Chua co cong viec nao",
  description = "Bat dau tao task dau tien de quan ly tien do.",
  ctaLabel = "Tao task moi",
  onCta,
}) {
  return (
    <section className="rounded-lg border-[3px] border-dashed border-border bg-card p-5 text-center comic-shadow">
      <div className="mx-auto mb-3 inline-flex size-10 items-center justify-center rounded-md border-[3px] border-border bg-secondary">
        <InboxIcon className="size-5" />
      </div>

      <h3 className="text-sm font-extrabold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>

      <div className="mt-4">
        <Button type="button" onClick={onCta}>{ctaLabel}</Button>
      </div>
    </section>
  );
}
