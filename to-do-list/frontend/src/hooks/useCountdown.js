import { useEffect, useMemo, useState } from "react";

/**
 * Tính khoảng cách thời gian giữa now và target.
 * Trả về { days, hours, minutes, totalMs, isOverdue, label }
 */
function computeCountdown(targetISO) {
  if (!targetISO) {
    return { days: 0, hours: 0, minutes: 0, totalMs: 0, isOverdue: false, label: null };
  }

  const target = new Date(targetISO);
  if (Number.isNaN(target.getTime())) {
    return { days: 0, hours: 0, minutes: 0, totalMs: 0, isOverdue: false, label: null };
  }

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);

  const totalMinutes = Math.floor(absDiffMs / (1000 * 60));
  const totalHours = Math.floor(absDiffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let label;

  if (isOverdue) {
    if (days > 0) {
      label = `Quá hạn ${days} ngày ${hours > 0 ? `${hours}h` : ""}`;
    } else if (totalHours > 0) {
      label = `Quá hạn ${totalHours}h ${minutes > 0 ? `${minutes}m` : ""}`;
    } else if (totalMinutes > 0) {
      label = `Quá hạn ${totalMinutes} phút`;
    } else {
      label = "Vừa quá hạn";
    }
  } else {
    if (days > 7) {
      label = `${days} ngày còn lại`;
    } else if (days > 0) {
      label = `${days} ngày ${hours > 0 ? `${hours}h` : ""} còn lại`;
    } else if (totalHours > 0) {
      label = `${totalHours}h ${minutes > 0 ? `${minutes}m` : ""} còn lại`;
    } else if (totalMinutes > 0) {
      label = `${totalMinutes} phút còn lại`;
    } else {
      label = "Sắp hết hạn!";
    }
  }

  return { days, hours, minutes, totalMs: absDiffMs, isOverdue, label };
}

/**
 * Custom hook: đếm ngược real-time, update mỗi 10 giây.
 *
 * @param {string|null} dueDateISO - ISO datetime string hoặc null
 * @returns {{ days, hours, minutes, totalMs, isOverdue, label }}
 */
export default function useCountdown(dueDateISO) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!dueDateISO) return;

    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 10000); // 10 giây

    return () => clearInterval(interval);
  }, [dueDateISO]);

  const result = useMemo(
    () => computeCountdown(dueDateISO),
    [dueDateISO, tick],
  );

  return result;
}
