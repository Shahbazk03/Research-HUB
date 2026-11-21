import React from "react";
import { ServiceRequestStatus, STATUS_LABELS } from "../../api/types";

const STYLES: Record<string, { cls: string; dot: string }> = {
  NEW: { cls: "badge-info", dot: "bg-sky-500" },
  UNDER_REVIEW: { cls: "badge-navy", dot: "bg-navy-500" },
  QUOTATION_SENT: { cls: "badge-accent", dot: "bg-accent-500" },
  NEEDS_INFORMATION: { cls: "badge-warning", dot: "bg-amber-500" },
  WAITING_FOR_CUSTOMER: { cls: "badge-warning", dot: "bg-amber-500" },
  IN_PROGRESS: { cls: "badge-navy", dot: "bg-navy-600" },
  COMPLETED: { cls: "badge-success", dot: "bg-emerald-500" },
  CANCELLED: { cls: "badge-neutral", dot: "bg-slate-400" },
};

interface StatusBadgeProps {
  status: ServiceRequestStatus;
  size?: "sm" | "md";
  /** Staff see neutral wording ("Awaiting customer"); customers see "Awaiting your response". */
  audience?: "customer" | "staff";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = "md", audience = "customer" }) => {
  const style = STYLES[status] || { cls: "badge-neutral", dot: "bg-slate-400" };
  let label = STATUS_LABELS[status] || status;
  if (audience === "staff") {
    if (status === "WAITING_FOR_CUSTOMER") label = "Awaiting customer";
    if (status === "NEW") label = "New";
  }

  return (
    <span className={`${style.cls} ${size === "sm" ? "text-[11px]" : ""}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
      {label}
    </span>
  );
};
