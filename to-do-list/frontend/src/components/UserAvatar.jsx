import React, { useState, useEffect } from "react";
import { UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Generate a high-contrast Pop Art color palette based on username hash
const getPopArtColor = (name) => {
  if (!name) return "bg-[#ffd400]"; // Default bright yellow
  const colors = [
    "bg-[#ffd400]", // Bright yellow
    "bg-[#ff3b57]", // Vibrant coral red
    "bg-[#00c2ff]", // Sky blue
    "bg-[#10b981]", // Emerald green
    "bg-[#a855f7]", // Bright purple
    "bg-[#f97316]", // Dark orange
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0].substring(0, 1) + parts[parts.length - 1].substring(0, 1)).toUpperCase();
};

export default function UserAvatar({
  avatarUrl,
  displayName,
  email,
  className,
  sizeClassName = "size-8",
  textClassName = "text-xs font-black uppercase tracking-tight",
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  const identifier = displayName || email || "";
  const initials = getInitials(identifier);
  const colorClass = getPopArtColor(identifier);

  return (
    <div
      className={cn(
        "relative rounded-full border-2 border-border shrink-0 flex items-center justify-center overflow-hidden select-none shadow-[2px_2px_0px_0px_#000000]",
        sizeClassName,
        !avatarUrl || hasError ? colorClass : "bg-card",
        className
      )}
      {...props}
    >
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={identifier}
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : initials ? (
        <span className={cn("text-foreground font-black tracking-tight", textClassName)}>
          {initials}
        </span>
      ) : (
        <UserIcon className="size-1/2 text-foreground" />
      )}
    </div>
  );
}
