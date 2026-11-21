import React from "react";
import { Clock, ShieldAlert, Hourglass, UserRoundPen } from "lucide-react";
import { ENGAGEMENT_STAGE_LABELS, EngagementStage, WriterApplicationStatus, describeDeadline } from "../../api/writers";
import { STAGE_BADGE } from "./writerHelpers";

export const StageBadge: React.FC<{ stage: EngagementStage }> = ({ stage }) => (
  <span className={STAGE_BADGE[stage]}>{ENGAGEMENT_STAGE_LABELS[stage] || stage}</span>
);

/** Countdown text: red when overdue, amber inside 48 hours. */
export const DeadlineText: React.FC<{ deadline?: string; now: number; className?: string }> = ({ deadline, now, className = "" }) => {
  const d = describeDeadline(deadline, now);
  const tone = d.overdue ? "text-red-700" : d.urgent ? "text-amber-700" : "text-slate-600";
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${tone} ${className}`}>
      <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {d.text}
    </span>
  );
};

/** Shown in place of work-related tabs while the writer is not approved. */
export const NotApprovedPanel: React.FC<{
  status?: WriterApplicationStatus;
  message?: string;
  onCompleteProfile: () => void;
  onContact: () => void;
}> = ({ status, message, onCompleteProfile, onContact }) => {
  // Without a known status (e.g. the server refused after a status change) show the server's message instead
  const pending = status === "PENDING" || (!status && !message);
  const title = pending
    ? "Your profile is under review"
    : status === "SUSPENDED"
      ? "Your writer account is suspended"
      : status === "REJECTED"
        ? "Your application was not approved"
        : "Projects are not available right now";
  const body = pending
    ? "Our team reviews every writer before sharing projects. Complete your profile — designation, expertise, publications and CV — to speed up the review."
    : status === "SUSPENDED"
      ? "You cannot view or take on projects while your account is suspended. Please contact the Research Hub team for details."
      : status === "REJECTED"
        ? "We are unable to approve your writer profile at this time. If you think this is a mistake, please contact our support team."
        : message || "Please contact the Research Hub team.";

  return (
    <div className="card card-pad flex flex-col items-start gap-4 sm:flex-row" role="status">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          pending ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
        }`}
        aria-hidden="true"
      >
        {pending ? <Hourglass className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-xl font-semibold text-navy-900">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">{body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {pending && (
            <button type="button" className="btn-primary btn-sm" onClick={onCompleteProfile}>
              <UserRoundPen className="h-3.5 w-3.5" aria-hidden="true" />
              Complete your profile
            </button>
          )}
          <button type="button" className={pending ? "btn-secondary btn-sm" : "btn-primary btn-sm"} onClick={onContact}>
            Contact support
          </button>
        </div>
      </div>
    </div>
  );
};

/** Small label/value pair used in briefs and offer cards. */
export const Fact: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className = "" }) => (
  <div className={`min-w-0 ${className}`}>
    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-slate-800">{children}</dd>
  </div>
);
