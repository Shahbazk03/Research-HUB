/*
| Shared building blocks for the research-writer admin screens
| (WritersTab, AssignmentsTab, EngagementModal, AssignWriterModal, RequestWriterSection).
*/
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { QueryClient, useQuery } from "@tanstack/react-query";
import { Clock, X } from "lucide-react";
import {
  adminListEngagements,
  adminListWriters,
  describeDeadline,
  ENGAGEMENT_STAGE_LABELS,
  EngagementStage,
  WriterAccount,
  WriterApplicationStatus,
} from "../../api/writers";
import { Modal } from "../ui";
import { formatDateTime } from "./shared";

/* -------------------------------------------------------------------------- */
/* Labels & badges                                                            */
/* -------------------------------------------------------------------------- */

/** Staff-facing wording for each engagement stage. */
export const ADMIN_STAGE_LABELS: Record<EngagementStage, string> = {
  INTERESTED: "Interest received",
  OFFERED: "Offer pending",
  ACCEPTED: "In progress",
  SUBMITTED: "Needs review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  DECLINED: "Declined by writer",
  WITHDRAWN: "Withdrawn",
  NOT_SELECTED: "Not selected",
  CANCELLED: "Cancelled",
};

const STAGE_BADGE: Record<EngagementStage, string> = {
  INTERESTED: "badge-info",
  OFFERED: "badge-warning",
  ACCEPTED: "badge-navy",
  SUBMITTED: "badge-accent",
  CHANGES_REQUESTED: "badge-warning",
  APPROVED: "badge-success",
  DECLINED: "badge-neutral",
  WITHDRAWN: "badge-neutral",
  NOT_SELECTED: "badge-neutral",
  CANCELLED: "badge-neutral",
};

export const StageBadge: React.FC<{ stage: EngagementStage; className?: string }> = ({ stage, className = "" }) => (
  <span className={`${STAGE_BADGE[stage] || "badge-neutral"} whitespace-nowrap ${className}`}>
    {ADMIN_STAGE_LABELS[stage] || ENGAGEMENT_STAGE_LABELS[stage] || stage}
  </span>
);

/** Stages in which a writer holds the request (hidden from other writers). */
export const HOLDING_STAGES: EngagementStage[] = ["OFFERED", "ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED"];
/** Stages in which the writer is working against a deadline. */
export const WORKING_STAGES: EngagementStage[] = ["ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED"];

export const APP_STATUS_LABELS: Record<WriterApplicationStatus, string> = {
  PENDING: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
};

export const AppStatusBadge: React.FC<{ status?: WriterApplicationStatus }> = ({ status = "PENDING" }) => {
  const cls =
    status === "APPROVED"
      ? "badge-success"
      : status === "REJECTED"
        ? "badge-danger"
        : status === "SUSPENDED"
          ? "badge-neutral"
          : "badge-warning";
  return <span className={`${cls} whitespace-nowrap`}>{APP_STATUS_LABELS[status] || status}</span>;
};

export const writerDisplayName = (w: Pick<WriterAccount, "firstName" | "lastName" | "writerProfile">): string =>
  [w.writerProfile?.title, w.firstName, w.lastName].filter(Boolean).join(" ");

/** Public visibility = writer consent AND admin decision. */
export const isOnWebsite = (w: Pick<WriterAccount, "writerProfile">): boolean =>
  Boolean(w.writerProfile?.showOnWebsite && w.writerProfile?.featuredOnWebsite && w.writerProfile?.applicationStatus === "APPROVED");

export const orcidHref = (orcid?: string): string | undefined => {
  if (!orcid) return undefined;
  const value = orcid.trim();
  if (/^https?:\/\//i.test(value)) return value;
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/i.test(value) ? `https://orcid.org/${value}` : undefined;
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/* -------------------------------------------------------------------------- */
/* Deadlines                                                                  */
/* -------------------------------------------------------------------------- */

/** Current time, refreshed every `intervalMs` so countdowns stay accurate. */
export const useNow = (intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
};

/** Deadline countdown: red when overdue, amber when under 48 hours. */
export const DeadlineCountdown: React.FC<{ deadline?: string; now: number; showDate?: boolean }> = ({ deadline, now, showDate = true }) => {
  if (!deadline) return <span className="text-slate-400">—</span>;
  const d = describeDeadline(deadline, now);
  const tone = d.overdue ? "text-red-700" : d.urgent ? "text-amber-700" : "text-slate-600";
  return (
    <span className="inline-flex flex-col">
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {d.text}
      </span>
      {showDate && <span className="text-xs text-slate-500">{formatDateTime(deadline)}</span>}
    </span>
  );
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Value for an <input type="datetime-local"> in the browser's time zone. */
export const toLocalInputValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** Now + N days, rounded up to the next full hour. */
export const daysFromNow = (days: number, from = Date.now()): Date => {
  const d = new Date(from + days * 86_400_000);
  if (d.getMinutes() || d.getSeconds() || d.getMilliseconds()) {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  return d;
};

/* -------------------------------------------------------------------------- */
/* Credentials                                                                */
/* -------------------------------------------------------------------------- */

/** Cryptographically random password with upper, lower, digit and symbol. */
export const generatePassword = (length = 14): string => {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*?-"];
  const all = sets.join("");
  const rand = (max: number) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  };
  const chars = sets.map((s) => s[rand(s.length)]);
  while (chars.length < Math.max(10, length)) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
};

/* -------------------------------------------------------------------------- */
/* Stacked modal                                                              */
/* -------------------------------------------------------------------------- */

type ModalProps = React.ComponentProps<typeof Modal>;

/** Close callbacks of open stacked modals, top-most last. */
const escapeStack: (() => void)[] = [];

const handleEscape = (e: KeyboardEvent) => {
  if (e.key !== "Escape" || escapeStack.length === 0) return;
  // Stop the base Modal listeners (ours and any parent modal) from also closing.
  e.stopPropagation();
  escapeStack[escapeStack.length - 1]();
};

/**
 * Modal rendered into document.body so it can open on top of another modal
 * (modal panels use a transform, which would otherwise trap fixed children).
 * Escape only closes the top-most dialog.
 */
export const StackedModal: React.FC<Omit<ModalProps, "open">> = ({ children, ...props }) => {
  const closeRef = useRef(props.onClose);
  closeRef.current = props.onClose;

  useEffect(() => {
    const entry = () => closeRef.current();
    escapeStack.push(entry);
    if (escapeStack.length === 1) window.addEventListener("keydown", handleEscape, true);
    return () => {
      const idx = escapeStack.lastIndexOf(entry);
      if (idx >= 0) escapeStack.splice(idx, 1);
      if (escapeStack.length === 0) window.removeEventListener("keydown", handleEscape, true);
    };
  }, []);

  return createPortal(
    <Modal open {...props}>
      {children}
      <ScrollLockRepair />
    </Modal>,
    document.body
  );
};

/**
 * The base Modal restores the body overflow it saw on mount. When nested dialogs
 * unmount together, the inner one restores "hidden" last; this runs after both
 * and unlocks scrolling if no dialog is left on screen.
 */
const ScrollLockRepair: React.FC = () => {
  useEffect(
    () => () => {
      if (!document.querySelector(".modal-backdrop")) document.body.style.overflow = "";
    },
    []
  );
  return null;
};

/**
 * Submit handler for forms inside a StackedModal. React events bubble through
 * portals, so without stopPropagation a parent form (e.g. the request modal)
 * would also submit.
 */
export const onFormSubmit =
  (fn: () => void) =>
  (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fn();
  };

/* -------------------------------------------------------------------------- */
/* Layout pieces                                                              */
/* -------------------------------------------------------------------------- */

export const Panel: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  aside,
  children,
  className = "",
}) => (
  <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {aside}
    </div>
    <div className="space-y-4 p-4">{children}</div>
  </section>
);

export const Detail: React.FC<{ label: string; children?: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={`min-w-0 ${className || ""}`}>
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-navy-900">
      {children === undefined || children === null || children === "" ? <span className="text-slate-400">—</span> : children}
    </dd>
  </div>
);

export const ExpertiseChips: React.FC<{ items?: string[]; max?: number }> = ({ items, max }) => {
  const list = items || [];
  if (list.length === 0) return <span className="text-xs text-slate-400">No expertise listed</span>;
  const shown = max ? list.slice(0, max) : list;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((t) => (
        <span key={t} className="badge-neutral max-w-full text-[11px]">
          <span className="truncate">{t}</span>
        </span>
      ))}
      {max && list.length > max && <span className="badge-neutral text-[11px]">+{list.length - max}</span>}
    </span>
  );
};

/** Free-text tag entry: Enter or comma adds a tag. */
export const TagInput: React.FC<{
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  describedBy?: string;
  max?: number;
}> = ({ id, value, onChange, placeholder, describedBy, max = 20 }) => {
  const [draft, setDraft] = useState("");

  const add = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    const next = [...value];
    parts.forEach((p) => {
      if (next.length < max && !next.some((v) => v.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 60));
    });
    onChange(next);
    setDraft("");
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          className="input"
          aria-describedby={describedBy}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={add}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Added expertise">
          {value.map((tag) => (
            <li key={tag} className="badge-navy max-w-full">
              <span className="truncate">{tag}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-navy-100"
                aria-label={`Remove ${tag}`}
                onClick={() => onChange(value.filter((v) => v !== tag))}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Query keys & cache invalidation                                            */
/* -------------------------------------------------------------------------- */

export type EngagementFilter = EngagementStage | "ACTIVE" | "OVERDUE" | "";

export const writersKey = (status: WriterApplicationStatus | "", search: string) => ["admin-writers", status, search] as const;
export const engagementsKey = (stage: EngagementFilter) => ["admin-engagements", stage] as const;

/** Refresh every cache that can show writer / engagement state. */
export const invalidateWriterData = (
  qc: QueryClient,
  opts: { requestId?: string; writerId?: string; engagementId?: string; customerFacing?: boolean } = {}
) => {
  qc.invalidateQueries({ queryKey: ["admin-engagements"] });
  qc.invalidateQueries({ queryKey: ["admin-writers"] });
  if (opts.engagementId) qc.invalidateQueries({ queryKey: ["admin-engagement", opts.engagementId] });
  if (opts.writerId) qc.invalidateQueries({ queryKey: ["admin-writer", opts.writerId] });
  if (opts.requestId) qc.invalidateQueries({ queryKey: ["admin-request-engagements", opts.requestId] });
  else qc.invalidateQueries({ queryKey: ["admin-request-engagements"] });
  if (opts.customerFacing) {
    qc.invalidateQueries({ queryKey: ["admin-requests"] });
    qc.invalidateQueries({ queryKey: ["admin-overview"] });
  }
};

/** Sidebar counts: submissions awaiting review + overdue work, and pending applications. */
export const useWriterBadgeCounts = (enabled = true) => {
  const engagements = useQuery({
    queryKey: engagementsKey("SUBMITTED"),
    queryFn: () => adminListEngagements({ stage: "SUBMITTED" }),
    enabled,
    staleTime: 60_000,
  });
  const writers = useQuery({
    queryKey: writersKey("PENDING", ""),
    queryFn: () => adminListWriters({ status: "PENDING" }),
    enabled,
    staleTime: 60_000,
  });
  const c = engagements.data?.counts;
  return {
    assignments: (c?.SUBMITTED || 0) + (c?.OVERDUE || 0),
    writers: writers.data?.counts?.PENDING || 0,
  };
};
