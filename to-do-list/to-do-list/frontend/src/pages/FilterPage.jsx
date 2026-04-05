import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS = [
  { value: "todo", label: "Chưa làm", accent: "bg-white text-foreground" },
  {
    value: "doing",
    label: "Đang làm",
    accent: "bg-white text-foreground",
  },
  { value: "done", label: "Hoàn thành", accent: "bg-white text-foreground" },
  {
    value: "canceled",
    label: "Đã hủy",
    accent: "bg-white text-foreground",
    disabled: true,
    note: "Sắp có",
  },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Thấp" },
  { value: "medium", label: "Trung bình" },
  { value: "high", label: "Cao" },
];

const normalizeTags = (values) =>
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter(
      (value, index, array) =>
        array.findIndex(
          (item) => item.toLowerCase() === value.toLowerCase(),
        ) === index,
    )
    .slice(0, 8);

export default function FilterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialStatus = useMemo(() => {
    const status = searchParams.get("status");
    return ["todo", "doing", "done"].includes(status) ? status : "all";
  }, [searchParams]);

  const initialPriority = useMemo(() => {
    const priority = searchParams.get("priority");
    return ["low", "medium", "high"].includes(priority) ? priority : "all";
  }, [searchParams]);

  const initialTags = useMemo(() => {
    const tagQuery = searchParams.get("tag") || "";
    return normalizeTags(tagQuery.split(","));
  }, [searchParams]);

  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [selectedPriority, setSelectedPriority] = useState(initialPriority);
  const [tags, setTags] = useState(initialTags);
  const [tagInput, setTagInput] = useState("");

  const addTag = (value) => {
    const nextTag = value.trim();
    if (!nextTag) return;
    setTags((current) => normalizeTags([...current, nextTag]));
  };

  const handleTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(tagInput);
      setTagInput("");
    }
  };

  const handleApply = () => {
    const params = new URLSearchParams();

    if (["todo", "doing", "done"].includes(selectedStatus)) {
      params.set("status", selectedStatus);
    }

    if (["low", "medium", "high"].includes(selectedPriority)) {
      params.set("priority", selectedPriority);
    }

    if (tags.length > 0) {
      params.set("tag", tags.join(","));
    }

    navigate(params.toString() ? `/?${params.toString()}` : "/");
  };

  const handleReset = () => {
    setSelectedStatus("all");
    setSelectedPriority("all");
    setTags([]);
    setTagInput("");
    navigate("/");
  };

  return (
    <section className="space-y-4 pb-24">
      <div className="overflow-hidden rounded-[1.8rem] border-[3px] border-border bg-card comic-shadow">
        <div className="flex items-center justify-between gap-3 border-b-[3px] border-border bg-[#ffd400] px-4 py-3">
          <h1 className="text-[1.65rem] leading-none font-black uppercase tracking-tight text-foreground drop-shadow-[2px_2px_0_#ffffff]">
            Bộ lọc công việc
          </h1>

          <Button asChild size="icon-sm" variant="secondary" aria-label="Đóng">
            <Link to="/">
              <XIcon className="size-5" />
            </Link>
          </Button>
        </div>

        <CardContent className="space-y-5 px-4 py-4">
          <div className="space-y-3">
            <div className="inline-flex -rotate-2 border-[3px] border-border bg-[#ffd400] px-4 py-2 text-lg font-black uppercase tracking-tight text-foreground comic-shadow">
              Trạng thái
            </div>

            <div className="grid grid-cols-2 gap-3">
              {STATUS_OPTIONS.map((option) => {
                const isActive = selectedStatus === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`rounded-[1.2rem] border-[3px] border-border px-3 py-3 text-sm font-black uppercase tracking-tight transition-transform active:translate-y-px ${isActive ? "bg-primary text-primary-foreground" : option.accent} ${option.disabled ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    <span className="block">{option.label}</span>
                    {option.note ? (
                      <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">
                        {option.note}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex -rotate-2 border-[3px] border-border bg-[#00c2ff] px-4 py-2 text-lg font-black uppercase tracking-tight text-foreground comic-shadow">
              Độ ưu tiên
            </div>

            <div className="grid grid-cols-3 overflow-hidden rounded-[1.2rem] border-[3px] border-border bg-card">
              {PRIORITY_OPTIONS.map((option) => {
                const isActive = selectedPriority === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedPriority(option.value)}
                    className={`px-3 py-4 text-sm font-black uppercase tracking-tight transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-card text-foreground hover:bg-black/5 dark:hover:bg-white/10"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex -rotate-2 border-[3px] border-border bg-primary px-4 py-2 text-lg font-black uppercase tracking-tight text-primary-foreground comic-shadow">
              Thẻ (tags)
            </div>

            <Card className="rounded-[1.4rem] bg-card">
              <CardContent className="space-y-3 px-4 py-4">
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="h-7 rounded-full bg-[#7de2c0] px-3 text-xs text-foreground"
                    >
                      #{tag}
                      <button
                        type="button"
                        className="ml-1 inline-flex size-4 items-center justify-center rounded-full bg-foreground/10 text-foreground"
                        onClick={() =>
                          setTags((current) =>
                            current.filter((item) => item !== tag),
                          )
                        }
                        aria-label={`Xóa thẻ ${tag}`}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <Input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Thêm thẻ..."
                  className="h-11 rounded-xl border-0 bg-transparent px-0 text-base font-semibold text-foreground shadow-none outline-none focus-visible:ring-0"
                />
              </CardContent>
            </Card>
          </div>
        </CardContent>

        <div className="border-t-[3px] border-border bg-card px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="secondary"
              className="h-12 rounded-2xl text-base uppercase"
              onClick={handleReset}
            >
              Đặt lại
            </Button>

            <Button
              type="button"
              className="h-12 rounded-2xl text-base uppercase"
              onClick={handleApply}
            >
              Áp dụng
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
