import { CalendarDaysIcon, ClockIcon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import useCountdown from "@/hooks/useCountdown";

/**
 * Mức độ urgency dựa trên thời gian còn lại:
 * - overdue: đỏ, pulse animation
 * - critical: < 1 giờ, cam nháy
 * - urgent: < 6 giờ, cam
 * - warning: < 24 giờ, vàng
 * - normal: > 24 giờ, xanh nhạt
 * - none: không có deadline
 */
function getUrgencyLevel(countdown) {
  if (!countdown.label) return "none";
  if (countdown.isOverdue) return "overdue";

  const totalMinutes = Math.floor(countdown.totalMs / (1000 * 60));
  if (totalMinutes < 60) return "critical";
  if (totalMinutes < 360) return "urgent";
  if (totalMinutes < 1440) return "warning";
  return "normal";
}

const urgencyStyles = {
  none: "bg-muted text-muted-foreground",
  normal: "bg-[#e8f5e9] text-[#2e7d32]",
  warning: "bg-[#fff8d6] text-[#b8860b]",
  urgent: "bg-[#fff3e0] text-[#e65100]",
  critical: "bg-[#ffe0b2] text-[#bf360c] animate-pulse",
  overdue: "bg-[#ff3b57] text-white animate-pulse",
};

const urgencyIcons = {
  none: CalendarDaysIcon,
  normal: CalendarDaysIcon,
  warning: ClockIcon,
  urgent: ClockIcon,
  critical: AlertTriangleIcon,
  overdue: AlertTriangleIcon,
};

/**
 * CountdownBadge — hiển thị badge đếm ngược trên TaskCard.
 *
 * @param {string|null} dueDate - ISO datetime string
 * @param {string} [className] - custom classes
 * @param {boolean} [isDone] - nếu task đã done, hiển thị khác
 */
export default function CountdownBadge({ dueDate, className, isDone = false }) {
  const countdown = useCountdown(dueDate);

  if (!dueDate) {
    return (
      <div
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-border px-2.5 py-1 text-[0.68rem] font-black uppercase comic-shadow-sm",
          "bg-muted text-muted-foreground",
          className,
        )}
      >
        <CalendarDaysIcon className="size-3.5" />
        <span className="whitespace-nowrap">Chưa đặt hạn</span>
      </div>
    );
  }

  // Task đã done — hiển thị tĩnh
  if (isDone) {
    const dueDateObj = new Date(dueDate);
    const dueText = dueDateObj.toLocaleDateString("vi-VN");
    return (
      <div
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-border px-2.5 py-1 text-[0.68rem] font-black uppercase comic-shadow-sm",
          "bg-[#d9f99d] text-[#2e7d32]",
          className,
        )}
      >
        <CalendarDaysIcon className="size-3.5" />
        <span className="whitespace-nowrap">Xong • {dueText}</span>
      </div>
    );
  }

  const urgency = getUrgencyLevel(countdown);
  const Icon = urgencyIcons[urgency];

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border-[3px] border-border px-2.5 py-1 text-[0.68rem] font-black uppercase comic-shadow-sm",
        urgencyStyles[urgency],
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span className="whitespace-nowrap">{countdown.label}</span>
    </div>
  );
}
