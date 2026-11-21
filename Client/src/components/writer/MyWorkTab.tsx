import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Briefcase, ChevronRight } from "lucide-react";
import { getErrorMessage } from "../../api";
import { Engagement, formatMoney, getMyEngagements } from "../../api/writers";
import { EmptyState, ErrorState } from "../ui";
import { DeadlineText, StageBadge } from "./WriterBits";
import { DEADLINE_STAGES, WORK_GROUPS, WorkGroup, formatDate, groupOf, isNotApprovedError, serviceName, useNow, writerRetry } from "./writerHelpers";

type Filter = "all" | WorkGroup;

/** Secondary line: what is happening with the deadline right now. */
const TimingInfo: React.FC<{ e: Engagement; now: number }> = ({ e, now }) => {
  if (DEADLINE_STAGES.includes(e.stage) && e.offer?.deadline) return <DeadlineText deadline={e.offer.deadline} now={now} />;
  if (e.stage === "SUBMITTED") {
    const last = e.submissions[e.submissions.length - 1];
    return <span className="text-sm text-slate-600">Submitted {formatDate(last?.submittedAt)}</span>;
  }
  if (e.stage === "APPROVED") return <span className="text-sm text-slate-600">Approved {formatDate(e.approvedAt || e.updatedAt)}</span>;
  if (e.stage === "INTERESTED" && e.proposal?.days) return <span className="text-sm text-slate-600">{e.proposal.days} days proposed</span>;
  return <span className="text-sm text-slate-500">Updated {formatDate(e.updatedAt)}</span>;
};

const feeOf = (e: Engagement) => (e.offer?.fee != null ? { amount: e.offer.fee, label: "Agreed fee" } : e.proposal?.fee != null ? { amount: e.proposal.fee, label: "Your proposal" } : null);

const PenaltyNote: React.FC<{ e: Engagement }> = ({ e }) =>
  e.penalty?.isLate && e.penalty.penaltyAmount > 0 ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
      <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
      Late penalty {formatMoney(e.penalty.penaltyAmount)} ({e.penalty.penaltyPct}%)
    </span>
  ) : null;

const WorkRow: React.FC<{ e: Engagement; now: number; onOpen: () => void }> = ({ e, now, onOpen }) => {
  const fee = feeOf(e);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="card grid w-full gap-3 p-4 text-left transition-colors hover:border-navy-200 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:px-5"
        aria-label={`Open ${serviceName(e)} ${e.brief?.requestNumber || ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={e.stage} />
            {e.brief?.requestNumber && <span className="font-mono text-xs text-slate-500">{e.brief.requestNumber}</span>}
          </div>
          <p className="mt-1.5 break-words font-semibold text-navy-900">{serviceName(e)}</p>
          {e.brief?.discipline && <p className="truncate text-xs text-slate-500">{e.brief.discipline}</p>}
        </div>
        <div className="flex flex-col gap-0.5 sm:items-end">
          <TimingInfo e={e} now={now} />
          <PenaltyNote e={e} />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {fee ? (
            <div className="sm:text-right">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">{fee.label}</p>
              <p className="font-semibold text-navy-900">{formatMoney(fee.amount, e.offer?.currency || e.proposal?.currency)}</p>
            </div>
          ) : (
            <span />
          )}
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        </div>
      </button>
    </li>
  );
};

export const MyWorkTab: React.FC<{
  onOpenEngagement: (id: string) => void;
  onBrowse: () => void;
  notApproved: (message?: string) => React.ReactNode;
}> = ({ onOpenEngagement, onBrowse, notApproved }) => {
  const now = useNow();
  const [filter, setFilter] = useState<Filter>("all");
  const query = useQuery({ queryKey: ["writer-engagements"], queryFn: getMyEngagements, retry: writerRetry });

  const engagements = query.data || [];
  const counts = useMemo(() => {
    const c: Record<WorkGroup, number> = { action: 0, progress: 0, interest: 0, completed: 0, closed: 0 };
    engagements.forEach((e) => (c[groupOf(e.stage)] += 1));
    return c;
  }, [engagements]);

  if (query.isError && isNotApprovedError(query.error)) return <>{notApproved(getErrorMessage(query.error))}</>;

  const groups = WORK_GROUPS.filter((g) => filter === "all" || g.key === filter)
    .map((g) => ({ ...g, items: engagements.filter((e) => groupOf(e.stage) === g.key) }))
    .filter((g) => g.items.length > 0 || filter !== "all");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-900">My work</h2>
        <p className="muted mt-0.5">Proposals, offers and projects you are working on.</p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max gap-2" role="group" aria-label="Filter by stage">
          {([["all", "All", engagements.length], ...WORK_GROUPS.map((g) => [g.key, g.label, counts[g.key]])] as [Filter, string, number][]).map(
            ([key, label, count]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === key ? "border-navy-900 bg-navy-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-navy-300"
                }`}
              >
                {label}
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    filter === key ? "bg-white/20 text-white" : key === "action" && count > 0 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading your work">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="We couldn't load your work" message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : engagements.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-5 w-5" />}
          title="No projects yet"
          message="Browse open projects and send a proposal. Offers from our team will appear here."
          action={
            <button type="button" className="btn-primary btn-sm" onClick={onBrowse}>
              Browse open projects
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`work-group-${g.key}`}>
              <div className="mb-3">
                <h3 id={`work-group-${g.key}`} className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.05em] text-slate-600">
                  {g.label}
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs normal-case tracking-normal text-slate-600">{g.items.length}</span>
                </h3>
                <p className="text-xs text-slate-500">{g.description}</p>
              </div>
              {g.items.length ? (
                <ul className="space-y-2.5">
                  {g.items.map((e) => (
                    <WorkRow key={e._id} e={e} now={now} onOpen={() => onOpenEngagement(e._id)} />
                  ))}
                </ul>
              ) : (
                <p className="panel-muted px-4 py-6 text-center text-sm text-slate-500">Nothing here right now.</p>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
