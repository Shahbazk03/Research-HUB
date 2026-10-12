import React from "react";
import { ServiceRequestStatus } from "../../api/types";

interface StatusBadgeProps {
  status: ServiceRequestStatus;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md" }) => {
  const configs: Record<
    string,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    NEW: {
      label: "New Submission",
      bg: "bg-sky-500/10",
      text: "text-sky-400",
      dot: "bg-sky-400",
      border: "border-sky-500/20",
    },
    IN_PROGRESS: {
      label: "In Progress",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      dot: "bg-amber-400",
      border: "border-amber-500/20",
    },
    WAITING_FOR_CUSTOMER: {
      label: "Action Needed",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      dot: "bg-purple-400",
      border: "border-purple-500/20",
    },
    NEEDS_INFORMATION: {
      label: "Info Needed",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      dot: "bg-purple-400",
      border: "border-purple-500/20",
    },
    UNDER_REVIEW: {
      label: "Under Review",
      bg: "bg-indigo-500/10",
      text: "text-indigo-400",
      dot: "bg-indigo-400",
      border: "border-indigo-500/20",
    },
    QUOTATION_SENT: {
      label: "Quotation Sent",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      dot: "bg-blue-400",
      border: "border-blue-500/20",
    },
    COMPLETED: {
      label: "Completed",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      dot: "bg-emerald-400",
      border: "border-emerald-500/20",
    },
    CANCELLED: {
      label: "Cancelled",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      dot: "bg-slate-400",
      border: "border-slate-500/20",
    },
  };

  const config = configs[status] || {
    label: status,
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    dot: "bg-slate-400",
    border: "border-slate-500/20",
  };

  const sizeClass =
    size === "sm"
      ? "px-2 py-0.5 text-xs gap-1.5"
      : "px-2.5 py-1 text-xs font-medium gap-2";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${config.bg} ${config.text} ${config.border} ${sizeClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
