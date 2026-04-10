import { useState, useMemo, useRef } from "react";
import {
  ZapIcon,
  CalendarIcon,
  TimerIcon,
  XIcon,
  SunriseIcon,
  SunsetIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  format,
  addMinutes,
  addHours,
  addDays,
  nextSaturday,
  nextMonday,
  isSaturday,
  isSunday,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  endOfDay,
} from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "presets", label: "Nhanh", icon: ZapIcon },
  { id: "calendar", label: "Lịch", icon: CalendarIcon },
  { id: "custom", label: "Tùy chỉnh", icon: TimerIcon },
];

const DURATION_UNITS = [
  { value: "minutes", label: "Phút" },
  { value: "hours", label: "Giờ" },
  { value: "days", label: "Ngày" },
];

/**
 * Tính toán các preset thông minh dựa trên thời điểm hiện tại.
 */
function buildPresets() {
  const now = new Date();
  const isWeekend = isSaturday(now) || isSunday(now);
  const showEndOfDay = now.getHours() < 23;

  const tomorrow9am = setMilliseconds(
    setSeconds(setMinutes(setHours(addDays(now, 1), 9), 0), 0),
    0,
  );
  const nextSat = nextSaturday(now);
  const nextSat9am = setMilliseconds(
    setSeconds(setMinutes(setHours(nextSat, 9), 0), 0),
    0,
  );
  const nextMon = nextMonday(now);
  const nextMon9am = setMilliseconds(
    setSeconds(setMinutes(setHours(nextMon, 9), 0), 0),
    0,
  );

  const presets = [
    { id: "30m", label: "30 phút", date: addMinutes(now, 30) },
    { id: "1h", label: "1 giờ", date: addHours(now, 1) },
    { id: "3h", label: "3 giờ", date: addHours(now, 3) },
    { id: "5h", label: "5 giờ", date: addHours(now, 5) },
    { id: "12h", label: "12 giờ", date: addHours(now, 12) },
  ];

  if (showEndOfDay) {
    presets.push({ id: "eod", label: "Cuối ngày", date: endOfDay(now) });
  }

  presets.push({ id: "tom", label: "Mai 9h", date: tomorrow9am });
  presets.push({
    id: "sat",
    label: isWeekend ? "T7 tuần sau" : "Cuối tuần",
    date: nextSat9am,
  });
  presets.push({ id: "mon", label: "T2 tuần sau", date: nextMon9am });

  return presets;
}

/**
 * Format preview dưới dạng "dd/MM/yyyy lúc HH:mm"
 */
function formatPreview(isoString) {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, "dd/MM/yyyy 'lúc' HH:mm", { locale: vi });
}

/**
 * DeadlinePicker — Compact, collapsible deadline selector.
 */
export default function DeadlinePicker({ value, onChange, onClear }) {
  const [activeTab, setActiveTab] = useState("presets");
  const [selectedPresetId, setSelectedPresetId] = useState(null);
  const scrollRef = useRef(null);

  // Calendar + Time state
  const selectedDate = value ? new Date(value) : undefined;
  const [timeHour, setTimeHour] = useState(() => {
    if (value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? 9 : d.getHours();
    }
    return 9;
  });
  const [timeMinute, setTimeMinute] = useState(() => {
    if (value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? 0 : d.getMinutes();
    }
    return 0;
  });

  // Custom duration state
  const [durationAmount, setDurationAmount] = useState(1);
  const [durationUnit, setDurationUnit] = useState("hours");

  const presets = useMemo(() => buildPresets(), []);
  const preview = formatPreview(value);

  const scrollBy = (offset) => {
    scrollRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handlePresetSelect = (preset) => {
    setSelectedPresetId(preset.id);
    onChange(preset.date.toISOString());
  };

  const handleCalendarSelect = (date) => {
    if (!date) return;
    setSelectedPresetId(null);
    const combined = setMilliseconds(
      setSeconds(setMinutes(setHours(date, timeHour), timeMinute), 0),
      0,
    );
    onChange(combined.toISOString());
  };

  const handleTimeChange = (h, m) => {
    setTimeHour(h);
    setTimeMinute(m);
    setSelectedPresetId(null);
    if (selectedDate) {
      const combined = setMilliseconds(
        setSeconds(
          setMinutes(setHours(new Date(selectedDate), h), m),
          0,
        ),
        0,
      );
      onChange(combined.toISOString());
    }
  };

  const handleCustomApply = () => {
    setSelectedPresetId(null);
    const now = new Date();
    let target;
    switch (durationUnit) {
      case "minutes":
        target = addMinutes(now, durationAmount);
        break;
      case "hours":
        target = addHours(now, durationAmount);
        break;
      case "days":
        target = addDays(now, durationAmount);
        break;
      default:
        target = addHours(now, durationAmount);
    }
    onChange(target.toISOString());
  };

  const handleClear = () => {
    setSelectedPresetId(null);
    onClear?.();
  };

  return (
    <div className="space-y-1.5">
      {/* Tab bar */}
      <div className="grid grid-cols-3 gap-0.5 rounded-lg border-[2px] border-border bg-white p-0.5">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[0.62rem] font-black uppercase tracking-tight transition-all",
                isActive
                  ? "bg-[#ff3b57] text-white"
                  : "bg-transparent text-foreground hover:bg-black/5",
              )}
            >
              <tab.icon className="size-3" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ═══ PRESETS TAB — Horizontal scroll ═══ */}
      {activeTab === "presets" && (
        <div className="relative flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => scrollBy(-100)}
            className="shrink-0 rounded-full border-[2px] border-border bg-white p-0.5 hover:bg-black/5"
            aria-label="Cuộn trái"
          >
            <ChevronLeftIcon className="size-3" />
          </button>

          <div
            ref={scrollRef}
            className="flex gap-1 overflow-x-auto"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {presets.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className={cn(
                    "shrink-0 rounded-lg border-[2px] border-b-[3px] border-border px-2.5 py-1 text-[0.62rem] font-black uppercase whitespace-nowrap transition-all active:translate-y-[1px] active:border-b-[2px]",
                    isSelected
                      ? "bg-[#ff3b57] text-white border-[#ff3b57]"
                      : "bg-white text-foreground hover:bg-[#ffd400]/30",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => scrollBy(100)}
            className="shrink-0 rounded-full border-[2px] border-border bg-white p-0.5 hover:bg-black/5"
            aria-label="Cuộn phải"
          >
            <ChevronRightIcon className="size-3" />
          </button>
        </div>
      )}

      {/* ═══ CALENDAR + TIME TAB ═══ */}
      {activeTab === "calendar" && (
        <div className="space-y-1.5">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            locale={vi}
            className="border-0 p-1 shadow-none"
          />

          {/* Time picker — compact */}
          <div className="flex items-center gap-2 rounded-lg border-[2px] border-border bg-[#fffaf0] px-2.5 py-1.5">
            <span className="text-[0.62rem] font-black uppercase text-muted-foreground">
              Giờ:
            </span>
            <input
              type="number"
              min={0}
              max={23}
              value={timeHour}
              onChange={(e) => {
                const h = Math.min(23, Math.max(0, Number.parseInt(e.target.value, 10) || 0));
                handleTimeChange(h, timeMinute);
              }}
              className="h-6 w-9 rounded border-[2px] border-border bg-white px-1 text-center text-xs font-bold outline-none focus:ring-1 focus:ring-primary/30"
            />
            <span className="text-sm font-black">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={timeMinute}
              onChange={(e) => {
                const m = Math.min(59, Math.max(0, Number.parseInt(e.target.value, 10) || 0));
                handleTimeChange(timeHour, m);
              }}
              className="h-6 w-9 rounded border-[2px] border-border bg-white px-1 text-center text-xs font-bold outline-none focus:ring-1 focus:ring-primary/30"
            />
            <div className="ml-auto flex items-center gap-1">
              {timeHour < 12 ? (
                <SunriseIcon className="size-3 text-[#f59e0b]" />
              ) : timeHour < 18 ? (
                <SunsetIcon className="size-3 text-[#f97316]" />
              ) : (
                <MoonIcon className="size-3 text-[#6366f1]" />
              )}
              <span className="text-[0.6rem] font-bold text-muted-foreground">
                {timeHour < 12 ? "Sáng" : timeHour < 18 ? "Chiều" : "Tối"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CUSTOM DURATION TAB ═══ */}
      {activeTab === "custom" && (
        <div className="flex items-center gap-1 rounded-lg border-[2px] border-border bg-white p-1.5">
          <span className="text-[0.6rem] font-black uppercase text-muted-foreground">
            Trong
          </span>
          <input
            type="number"
            min={1}
            max={999}
            value={durationAmount}
            onChange={(e) => {
              const val = Math.max(1, Math.min(999, Number.parseInt(e.target.value, 10) || 1));
              setDurationAmount(val);
            }}
            className="h-7 w-10 rounded border-[2px] border-border bg-[#fffaf0] px-1 text-center text-sm font-black outline-none focus:ring-1 focus:ring-primary/30"
          />
          {DURATION_UNITS.map((unit) => (
            <button
              key={unit.value}
              type="button"
              onClick={() => setDurationUnit(unit.value)}
              className={cn(
                "rounded border-[2px] border-border px-1.5 py-1 text-[0.58rem] font-black uppercase transition-all",
                durationUnit === unit.value
                  ? "bg-[#ff3b57] text-white border-[#ff3b57]"
                  : "bg-white text-foreground hover:bg-black/5",
              )}
            >
              {unit.label}
            </button>
          ))}
          <Button
            type="button"
            size="sm"
            className="ml-auto h-7 px-2.5 text-[0.6rem] font-black uppercase"
            onClick={handleCustomApply}
          >
            OK
          </Button>
        </div>
      )}

      {/* Preview + Clear — compact */}
      {preview && (
        <div className="flex items-center justify-between rounded-md border-[2px] border-dashed border-border bg-[#fffaf0] px-2.5 py-1">
          <span className="text-[0.62rem] font-bold text-foreground">
            ⏰ <span className="font-black">{preview}</span>
          </span>
          {onClear && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex size-4 items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
              aria-label="Xóa hạn chót"
            >
              <XIcon className="size-2.5 text-destructive" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
