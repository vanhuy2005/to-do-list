export default function StatusCounter({
  todo = 0,
  doing = 0,
  done = 0,
}) {
  return (
    <section className="grid grid-cols-3 gap-1.5">
      <article className="relative min-w-0 rounded-lg border-[3px] border-border bg-primary px-2 py-2 lg:px-4 lg:py-3 text-primary-foreground comic-shadow desktop-hover-scale">
        <span className="block truncate whitespace-nowrap text-[9px] lg:text-xs leading-none font-extrabold uppercase tracking-normal">Cần làm</span>
        <p className="mt-1 text-3xl lg:text-4xl leading-none font-black">{String(todo).padStart(2, "0")}</p>
        <span className="absolute top-2.5 right-2.5 h-3.5 w-7 rounded-full bg-primary-foreground/15" />
      </article>

      <article className="min-w-0 rounded-lg border-[3px] border-border bg-secondary px-2 py-2 lg:px-4 lg:py-3 text-foreground comic-shadow desktop-hover-scale">
        <span className="block truncate whitespace-nowrap text-[9px] lg:text-xs leading-none font-extrabold uppercase tracking-normal">Đang làm</span>
        <p className="mt-1 text-3xl lg:text-4xl leading-none font-black">{String(doing).padStart(2, "0")}</p>
      </article>

      <article className="min-w-0 rounded-lg border-[3px] border-border bg-card px-2 py-2 lg:px-4 lg:py-3 text-muted-foreground comic-shadow desktop-hover-scale">
        <span className="block truncate whitespace-nowrap text-[9px] lg:text-xs leading-none font-extrabold uppercase tracking-normal">Hoàn thành</span>
        <p className="mt-1 text-3xl lg:text-4xl leading-none font-black">{String(done).padStart(2, "0")}</p>
      </article>
    </section>
  );
}
