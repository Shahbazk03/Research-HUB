import React, { useCallback, useEffect, useRef, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { getErrorMessage } from "../../api";
import { safeHref, ServiceRequest, ServiceRequestStatus, STATUS_LABELS } from "../../api/types";
import { EmptyState, ErrorState } from "../ui";

/* -------------------------------------------------------------------------- */
/* Feedback toast                                                             */
/* -------------------------------------------------------------------------- */

export type Notify = (type: "success" | "error", message: string) => void;

interface FeedbackMessage {
  id: number;
  type: "success" | "error";
  message: string;
}

/** Single toast; each new message replaces the previous one and resets its own timer. */
export const useFeedback = () => {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current);
    setFeedback(null);
  }, []);

  const notify = useCallback<Notify>((type, message) => {
    window.clearTimeout(timer.current);
    setFeedback({ id: Date.now(), type, message });
    timer.current = window.setTimeout(() => setFeedback(null), type === "error" ? 8000 : 4000);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { feedback, notify, dismiss };
};

export const FeedbackToast: React.FC<{ feedback: FeedbackMessage | null; onDismiss: () => void }> = ({
  feedback,
  onDismiss,
}) => {
  if (!feedback) return null;
  const isError = feedback.type === "error";
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
      <div
        key={feedback.id}
        role={isError ? "alert" : "status"}
        className={`${isError ? "alert-error" : "alert-success"} pointer-events-auto w-full max-w-md shadow-lift`}
      >
        {isError ? (
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <p className="flex-1 break-words">{feedback.message}</p>
        <button type="button" onClick={onDismiss} className="-mr-1 rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Dismiss message">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/** Standard onError handler that surfaces the server message. */
export const notifyError = (notify: Notify, fallback: string) => (err: unknown) =>
  notify("error", getErrorMessage(err, fallback));

/* -------------------------------------------------------------------------- */
/* Hooks & helpers                                                            */
/* -------------------------------------------------------------------------- */

export const useDebouncedValue = <T,>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const PUBLIC_CACHE_KEYS = [
  "public-services-all",
  "public-services-featured",
  "public-services",
  "public-domains",
  "public-categories",
  "public-faqs",
  "public-settings",
] as const;

/** Invalidate public (customer-facing) caches by prefix after catalogue edits. */
export const invalidatePublic = (qc: QueryClient, keys: readonly string[] = PUBLIC_CACHE_KEYS) => {
  keys.forEach((key) => qc.invalidateQueries({ queryKey: [key] }));
};

export const STATUS_TRANSITIONS: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  NEW: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED", "UNDER_REVIEW", "QUOTATION_SENT"],
  UNDER_REVIEW: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "QUOTATION_SENT", "CANCELLED"],
  QUOTATION_SENT: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED"],
  NEEDS_INFORMATION: ["IN_PROGRESS", "WAITING_FOR_CUSTOMER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED", "NEEDS_INFORMATION"],
  WAITING_FOR_CUSTOMER: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: ["IN_PROGRESS"],
  CANCELLED: ["NEW", "IN_PROGRESS"],
};

export const ALL_STATUSES = Object.keys(STATUS_LABELS) as ServiceRequestStatus[];

/** Neutral, staff-facing wording for a status. */
export const staffStatusLabel = (status: ServiceRequestStatus): string => {
  if (status === "WAITING_FOR_CUSTOMER") return "Awaiting customer";
  if (status === "NEW") return "New";
  return STATUS_LABELS[status] || status;
};

export const getServiceName = (req: Pick<ServiceRequest, "serviceId">): string =>
  typeof req.serviceId === "object" && req.serviceId?.name ? req.serviceId.name : "Service";

export const getRequestTopic = (req: ServiceRequest): string | undefined => {
  const r = req.requirements || {};
  const value = r.research_topic || r.topic || r.title || r.working_title || r.paper_title;
  return value ? String(value) : undefined;
};

export const formatDate = (d?: string): string =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

export const formatDateTime = (d?: string): string =>
  d
    ? new Date(d).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Extract ids from a list that may contain populated documents. */
export const toIdList = (list?: (string | { _id: string })[]): string[] =>
  (list || []).map((item) => (typeof item === "string" ? item : item?._id)).filter(Boolean);

/* -------------------------------------------------------------------------- */
/* Presentational helpers                                                     */
/* -------------------------------------------------------------------------- */

/** Renders a user-supplied URL as a link only when it is http(s); otherwise as plain text. */
export const SafeLink: React.FC<{ url?: string | null; children?: React.ReactNode; className?: string }> = ({
  url,
  children,
  className = "link inline-flex items-center gap-1 break-all",
}) => {
  const href = safeHref(url);
  if (!href) return <span className="break-all text-slate-600">{children ?? url ?? "—"}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children ?? href}
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
};

export const SectionHeader: React.FC<{ title: string; description?: React.ReactNode; actions?: React.ReactNode }> = ({
  title,
  description,
  actions,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-navy-900">{title}</h2>
      {description && <p className="muted mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>
);

export const ReadOnlyNotice: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="alert-info" role="note">
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
    <p>{children ?? "You have read-only access to this section. Contact an administrator to make changes."}</p>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="card space-y-3 p-4" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton h-10 w-full" />
    ))}
  </div>
);

/** Loading / error / empty switch for a data block. */
export const DataState: React.FC<{
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
  isEmpty: boolean;
  emptyTitle: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  rows?: number;
  children: React.ReactNode;
}> = ({ isLoading, isError, error, onRetry, isEmpty, emptyTitle, emptyMessage, emptyAction, rows, children }) => {
  if (isLoading) return <TableSkeleton rows={rows} />;
  if (isError)
    return <ErrorState message={getErrorMessage(error, "Please try again in a few seconds.")} onRetry={onRetry} />;
  if (isEmpty) return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />;
  return <>{children}</>;
};

export const Pager: React.FC<{
  page: number;
  totalPages: number;
  total: number;
  noun: string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}> = ({ page, totalPages, total, noun, onPageChange, disabled }) => {
  if (total === 0) return null;
  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label={`${noun} pagination`}>
      <p className="muted">
        {total.toLocaleString()} {noun}
        {total === 1 ? "" : "s"} · Page {page} of {Math.max(totalPages, 1)}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= totalPages}
        >
          Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export const ActiveBadge: React.FC<{ active: boolean }> = ({ active }) =>
  active ? <span className="badge-success">Active</span> : <span className="badge-neutral">Inactive</span>;

export const CheckboxField: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
}> = ({ label, checked, onChange, description, disabled }) => (
  <label className={`choice ${checked ? "choice-active" : ""} ${disabled ? "cursor-not-allowed opacity-60" : ""}`}>
    <input
      type="checkbox"
      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span className="min-w-0">
      <span className="block font-medium">{label}</span>
      {description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}
    </span>
  </label>
);

/** Checkbox list used as an accessible multi-select. */
export const MultiSelect: React.FC<{
  legend: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
  isLoading?: boolean;
  help?: string;
}> = ({ legend, options, value, onChange, isLoading, help }) => (
  <fieldset>
    <legend className="label">{legend}</legend>
    {isLoading ? (
      <div className="skeleton h-20 w-full" />
    ) : options.length === 0 ? (
      <p className="muted">No options available.</p>
    ) : (
      <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-md border border-slate-200 p-2 sm:grid-cols-2">
        {options.map((opt) => {
          const checked = value.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50 ${
                checked ? "bg-navy-50 text-navy-900" : "text-slate-700"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                checked={checked}
                onChange={(e) =>
                  onChange(e.target.checked ? [...value, opt.value] : value.filter((v) => v !== opt.value))
                }
              />
              <span className="min-w-0 break-words">{opt.label}</span>
            </label>
          );
        })}
      </div>
    )}
    {help && <p className="help">{help}</p>}
  </fieldset>
);
