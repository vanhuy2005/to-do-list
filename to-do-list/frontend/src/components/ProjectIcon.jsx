import React from "react";
import {
  Folder,
  Rocket,
  Target,
  Laptop,
  Palette,
  Flame,
  Rainbow,
  Lightbulb,
  Brain,
  Briefcase,
  Calendar,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const EMOJI_TO_ICON = {
  "📁": { icon: Folder, color: "text-[#FFD400]", fill: "fill-[#FFD400]/25" },
  "🚀": { icon: Rocket, color: "text-[#FF2D55]", fill: "fill-[#FF2D55]/25" },
  "🎯": { icon: Target, color: "text-[#ff3b57]", fill: "fill-[#ff3b57]/25" },
  "💻": { icon: Laptop, color: "text-[#00C2FF]", fill: "fill-[#00C2FF]/25" },
  "🎨": { icon: Palette, color: "text-[#9d4edd]", fill: "fill-[#9d4edd]/25" },
  "🔥": { icon: Flame, color: "text-[#ff7b00]", fill: "fill-[#ff7b00]/25" },
  "🌈": { icon: Rainbow, color: "text-[#ff0a7b]", fill: "fill-[#ff0a7b]/25" },
  "💡": { icon: Lightbulb, color: "text-[#FFD400]", fill: "fill-[#FFD400]/25" },
  "🧠": { icon: Brain, color: "text-[#ff0a7b]", fill: "fill-[#ff0a7b]/25" },
  "💼": { icon: Briefcase, color: "text-[#7DE228]", fill: "fill-[#7DE228]/25" },
  "📅": { icon: Calendar, color: "text-[#00C2FF]", fill: "fill-[#00C2FF]/25" },
  "🔒": { icon: Lock, color: "text-[#ff3b57]", fill: "fill-[#ff3b57]/25" },
};

export default function ProjectIcon({ emoji, className, ...props }) {
  const iconConfig = EMOJI_TO_ICON[emoji] || EMOJI_TO_ICON["📁"];
  const IconComponent = iconConfig.icon;

  return (
    <IconComponent
      className={cn("size-6 stroke-[2.5] shrink-0", iconConfig.color, iconConfig.fill, className)}
      {...props}
    />
  );
}
