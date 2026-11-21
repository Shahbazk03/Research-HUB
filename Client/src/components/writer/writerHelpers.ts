import { useEffect, useState } from "react";
import { CLOSED_STAGES, Engagement, EngagementStage, WriterApplicationStatus } from "../../api/writers";
import { formatDate } from "../customer/requestHelpers";

export { formatDate, formatDateTime, humanizeKey } from "../customer/requestHelpers";

/* ------------------------------------------------------------------ */
/* Errors & query options                                              */
/* ------------------------------------------------------------------ */

/** True when the server refused because the writer is not (or no longer) approved. */
export const isNotApprovedError = (err: unknown): boolean => {
  const e = err as any;
  return e?.response?.status === 403 && e?.response?.data?.code === "WRITER_NOT_APPROVED";
};

/** Never retry a 403; retry other failures once (the API may be waking up). */
export const writerRetry = (count: number, err: unknown): boolean => (err as any)?.response?.status !== 403 && count < 1;

/* ------------------------------------------------------------------ */
/* Stages                                                              */
/* ------------------------------------------------------------------ */

export const STAGE_BADGE: Record<EngagementStage, string> = {
  INTERESTED: "badge-info",
  OFFERED: "badge-accent",
  ACCEPTED: "badge-navy",
  SUBMITTED: "badge-info",
  CHANGES_REQUESTED: "badge-warning",
  APPROVED: "badge-success",
  DECLINED: "badge-neutral",
  WITHDRAWN: "badge-neutral",
  NOT_SELECTED: "badge-neutral",
  CANCELLED: "badge-danger",
};

export type WorkGroup = "action" | "progress" | "interest" | "completed" | "closed";

export const WORK_GROUPS: { key: WorkGroup; label: string; description: string; stages: EngagementStage[] }[] = [
  { key: "action", label: "Action needed", description: "Offers to answer and revisions requested by our team.", stages: ["OFFERED", "CHANGES_REQUESTED"] },
  { key: "progress", label: "In progress", description: "Accepted work and submissions under review.", stages: ["ACCEPTED", "SUBMITTED"] },
  { key: "interest", label: "Interest sent", description: "Projects you have proposed for. Our team will get back to you.", stages: ["INTERESTED"] },
  { key: "completed", label: "Completed", description: "Work approved by our team.", stages: ["APPROVED"] },
  { key: "closed", label: "Closed", description: "Declined, withdrawn, not selected or cancelled.", stages: CLOSED_STAGES },
];

export const groupOf = (stage: EngagementStage): WorkGroup =>
  WORK_GROUPS.find((g) => g.stages.includes(stage))?.key ?? "closed";

export const isClosedStage = (stage: EngagementStage) => CLOSED_STAGES.includes(stage);

/** Stages in which the offer deadline is the one that matters to the writer. */
export const DEADLINE_STAGES: EngagementStage[] = ["OFFERED", "ACCEPTED", "CHANGES_REQUESTED"];

export const serviceName = (e: Pick<Engagement, "brief">) => e.brief?.service?.name || "Research project";

/** "5% of the fee is deducted for each started day late, up to 50%." */
export const describePenaltyRule = (perDay?: number, max?: number) => {
  if (!perDay) return "No late-delivery penalty applies.";
  return `${perDay}% of the fee is deducted for each started day late${max ? `, up to ${max}%` : ""}.`;
};

/* ------------------------------------------------------------------ */
/* Application status                                                  */
/* ------------------------------------------------------------------ */

export const APPLICATION_BADGE: Record<WriterApplicationStatus, { cls: string; label: string }> = {
  PENDING: { cls: "badge-warning", label: "Under review" },
  APPROVED: { cls: "badge-success", label: "Approved writer" },
  REJECTED: { cls: "badge-danger", label: "Not approved" },
  SUSPENDED: { cls: "badge-danger", label: "Suspended" },
};

/* ------------------------------------------------------------------ */
/* Values                                                              */
/* ------------------------------------------------------------------ */

export const isFileLike = (v: unknown): v is { url: string; name?: string } =>
  !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as any).url === "string";

/** Plain-text rendering of a requirement value; undefined when empty. */
export const requirementText = (value: unknown): string | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isFileLike(value)) return value.name || "Attached file";
  if (Array.isArray(value)) {
    const parts = value.map(requirementText).filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([, v]) => requirementText(v))
      .filter(Boolean);
    return parts.length ? parts.join("; ") : undefined;
  }
  return String(value);
};

/** Dates may be stored as ISO strings or free text; show what makes sense. */
export const formatLooseDate = (value?: string) => {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? value : formatDate(d);
};

export const formatBytes = (bytes?: number) => {
  if (!bytes) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((p) => p && !/^(dr|prof|mr|ms|mrs)\.?$/i.test(p))
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase() || "W";

/** Re-renders the caller periodically so countdowns stay live. */
export const useNow = (intervalMs = 60_000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
};
