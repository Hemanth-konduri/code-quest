import React from "react";
import { ShieldCheck, Award, Crown, Sparkles } from "lucide-react";

interface MembershipBadgeProps {
  badge?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  badge = "Free",
  size = "sm",
  className = "",
}) => {
  const badgeLower = badge?.toLowerCase() || "free";

  let styles = "bg-gray-100 text-gray-700 border-gray-300";
  let icon = <ShieldCheck className="w-3.5 h-3.5 inline mr-1" />;

  if (badgeLower === "bronze") {
    styles =
      "bg-amber-100 text-amber-900 border-amber-400 font-semibold shadow-xs dark:bg-amber-900/40 dark:text-amber-300";
    icon = <Award className="w-3.5 h-3.5 inline mr-1 text-amber-600 dark:text-amber-400" />;
  } else if (badgeLower === "silver") {
    styles =
      "bg-slate-200 text-slate-800 border-slate-400 font-semibold shadow-xs dark:bg-slate-800 dark:text-slate-200";
    icon = <Award className="w-3.5 h-3.5 inline mr-1 text-slate-600 dark:text-slate-300" />;
  } else if (badgeLower === "gold") {
    styles =
      "bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-yellow-950 border-amber-500 font-bold shadow-sm animate-pulse-subtle";
    icon = <Crown className="w-3.5 h-3.5 inline mr-1 text-yellow-950" />;
  }

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5"
      : size === "md"
      ? "text-sm px-2.5 py-1"
      : "text-base px-3.5 py-1.5";

  return (
    <span
      className={`inline-flex items-center border rounded-full font-medium ${styles} ${sizeClasses} ${className}`}
    >
      {icon}
      {badge}
    </span>
  );
};
