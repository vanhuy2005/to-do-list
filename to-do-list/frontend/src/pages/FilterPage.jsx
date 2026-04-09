import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PlusIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_OPTIONS = [
  { value: "todo", label: "Chưa làm" },
  { value: "doing", label: "Đang làm" },
  { value: "done", label: "Hoàn thành" },
  { value: "canceled", label: "Đã hủy" },
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
    return ["todo", "doing", "done", "canceled"].includes(status)
      ? status
      : "all";
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
  const [showTagInput, setShowTagInput] = useState(false);

  const addTag = (value) => {
    const nextTag = value.trim();
    if (!nextTag || tags.length >= 8) return;
    setTags((current) => normalizeTags([...current, nextTag]));
  };

  const handleTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (tags.length >= 8) return;
      addTag(tagInput);
      setTagInput("");
    }
  };

  const handleApply = () => {
    const params = new URLSearchParams();

    if (["todo", "doing", "done", "canceled"].includes(selectedStatus)) {
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
    // Fixed overlay with safe-area spacing and scrollable viewport on mobile.
    <div className="fixed inset-0 z-100 overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="mx-auto flex min-h-dvh w-full max-w-md items-start justify-center p-4 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom)+5rem)] md:items-center md:pb-4">
        <div className="relative w-full rounded-[2rem] border-[4px] border-border bg-[#fffaf0] comic-shadow-lg flex max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.75rem)] flex-col overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b-[4px] border-border bg-[#ffd400] px-5 py-4">
            <h1 className="text-[1.8rem] leading-none font-black uppercase tracking-tight text-foreground drop-shadow-[2px_2px_0_#ffffff]">
              Bộ lọc công việc
            </h1>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex size-9 items-center justify-center rounded-lg border-[3px] border-border bg-[#00c2ff] text-foreground comic-shadow-sm transition-transform active:translate-y-px"
              aria-label="Đóng"
            >
              <XIcon className="size-5 font-black" strokeWidth={3} />
            </button>
          </div>

          {/* Modal Content */}
          <div className="flex-1 space-y-7 p-6 overflow-y-auto">
            {/* Status Section */}
            <div className="space-y-4">
              <div className="inline-flex origin-bottom-left -rotate-3 border-[3px] border-border bg-[#ffd400] px-3 py-1.5 text-lg font-black uppercase tracking-tight text-foreground comic-shadow-sm">
                Trạng thái
              </div>

              <div className="grid grid-cols-2 gap-4">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = selectedStatus === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedStatus(option.value)}
                      className={`h-12 rounded-[1rem] border-[3px] border-border text-sm font-black uppercase tracking-tight transition-all active:translate-y-[2px] active:shadow-none ${
                        isActive
                          ? "bg-[#ff3b57] text-white comic-shadow-sm border-b-[5px]"
                          : "bg-white text-foreground comic-shadow-sm border-b-[5px] hover:bg-black/5"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Section */}
            <div className="space-y-4">
              <div className="inline-flex origin-bottom-left -rotate-3 border-[3px] border-border bg-[#00c2ff] px-3 py-1.5 text-lg font-black uppercase tracking-tight text-foreground comic-shadow-sm">
                Độ ưu tiên
              </div>

              <div className="flex overflow-hidden rounded-[1.2rem] border-[4px] border-border bg-white comic-shadow-sm">
                {PRIORITY_OPTIONS.map((option) => {
                  const isActive = selectedPriority === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedPriority(option.value)}
                      className={`flex-1 py-3 text-sm font-black uppercase tracking-tight transition-colors border-r-[3px] last:border-r-0 border-border ${
                        isActive
                          ? "bg-[#ff3b57] text-white"
                          : "bg-white text-foreground hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-4">
              <div className="inline-flex origin-bottom-left -rotate-3 border-[3px] border-border bg-[#ff3b57] px-3 py-1.5 text-lg font-black uppercase tracking-tight text-white comic-shadow-sm">
                Thẻ (tags)
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-[2rem] border-[4px] border-border bg-white comic-shadow-sm p-2">
                {tags.map((tag, idx) => (
                  <Badge
                    key={tag}
                    className={`h-10 rounded-full border-[3px] border-border px-3.5 text-[0.8rem] font-black uppercase tracking-wider text-foreground hover:opacity-90 ${idx % 2 === 0 ? "bg-[#ffd400]" : "bg-[#00c2ff]"}`}
                  >
                    #{tag}
                    <button
                      type="button"
                      className="ml-2 -mr-1 inline-flex items-center justify-center font-bold outline-none"
                      onClick={() =>
                        setTags((current) =>
                          current.filter((item) => item !== tag),
                        )
                      }
                      aria-label={`Xóa thẻ ${tag}`}
                    >
                      <XIcon className="size-4" strokeWidth={3} />
                    </button>
                  </Badge>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    if (showTagInput) {
                      if (tagInput.trim()) {
                        addTag(tagInput);
                        setTagInput("");
                      }
                      setShowTagInput(false);
                    } else {
                      setShowTagInput(true);
                    }
                  }}
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-dashed border-border text-foreground transition-colors ${showTagInput ? "bg-[#ffd400] hover:bg-[#ffc000]" : "bg-white hover:bg-black/5"} ${tags.length >= 8 && !showTagInput ? "opacity-30 cursor-not-allowed" : ""}`}
                  disabled={tags.length >= 8 && !showTagInput}
                  title={
                    showTagInput
                      ? "Lưu thẻ"
                      : tags.length >= 8
                        ? "Đã đạt giới hạn 8 thẻ"
                        : "Thêm thẻ mới"
                  }
                >
                  <PlusIcon
                    className={`size-5 transition-transform ${showTagInput ? "rotate-90" : ""}`}
                    strokeWidth={3}
                  />
                </button>

                {showTagInput && (
                  <div className="flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                    <Input
                      autoFocus
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === ",") {
                          event.preventDefault();
                          if (tagInput.trim()) {
                            addTag(tagInput);
                            setTagInput("");
                            setShowTagInput(false);
                          } else {
                            setShowTagInput(false);
                          }
                        } else if (event.key === "Escape") {
                          setTagInput("");
                          setShowTagInput(false);
                        }
                      }}
                      onBlur={() => {
                        if (tagInput.trim()) {
                          addTag(tagInput);
                        }
                        setTagInput("");
                        setShowTagInput(false);
                      }}
                      placeholder="Thêm thẻ..."
                      className="h-9 w-[110px] sm:w-[130px] border-0 border-b-[3px] border-foreground bg-transparent px-1 pb-1 text-sm sm:text-base font-bold text-foreground shadow-none outline-none focus-visible:ring-0 placeholder:font-semibold placeholder:text-muted-foreground/60 rounded-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t-[4px] border-border bg-[#fffaf0] p-5">
            <div className="flex gap-4">
              <button
                type="button"
                className="flex-1 rounded-[1.2rem] border-[3px] border-b-[6px] border-border bg-[#ffd400] py-3 text-[1.1rem] font-black uppercase tracking-tight text-foreground transition-all active:translate-y-[3px] active:border-b-[3px]"
                onClick={handleReset}
              >
                Đặt lại
              </button>

              <button
                type="button"
                className="flex-[1.5] rounded-[1.2rem] border-[3px] border-b-[6px] border-border bg-[#ff3b57] py-3 text-[1.1rem] font-black uppercase tracking-tight text-white transition-all active:translate-y-[3px] active:border-b-[3px]"
                onClick={handleApply}
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
