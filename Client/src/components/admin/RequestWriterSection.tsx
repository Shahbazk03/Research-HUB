import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EyeOff, UserPlus } from "lucide-react";
import { getErrorMessage } from "../../api";
import { adminGetRequestEngagements, CLOSED_STAGES, formatMoney } from "../../api/writers";
import { formatDateTime, Notify } from "./shared";
import { AssignWriterModal } from "./AssignWriterModal";
import { EngagementModal } from "./EngagementModal";
import { DeadlineCountdown, HOLDING_STAGES, StageBadge, useNow, WORKING_STAGES } from "./writerShared";

/**
 * "Writer" block inside the request modal. Renders no <form> or inputs because it
 * sits inside the request form; dialogs open in portals.
 */
export const RequestWriterSection: React.FC<{
  requestId: string;
  requestNumber: string;
  requestStatus: string;
  isAdmin: boolean;
  notify: Notify;
}> = ({ requestId, requestNumber, requestStatus, isAdmin, notify }) => {
  const now = useNow();
  const [assignFor, setAssignFor] = useState<string | null>(null); // writer id, or "" for none preselected
  const [openEngagement, setOpenEngagement] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-request-engagements", requestId],
    queryFn: () => adminGetRequestEngagements(requestId),
  });

  const engagements = data?.engagements || [];
  const holder = engagements.find((e) => HOLDING_STAGES.includes(e.stage));
  const approved = engagements.find((e) => e.stage === "APPROVED");
  const current = holder || approved;
  const interested = engagements.filter((e) => e.stage === "INTERESTED");
  const history = engagements.filter((e) => CLOSED_STAGES.includes(e.stage));
  const requestClosed = requestStatus === "CANCELLED" || requestStatus === "COMPLETED";
  const canAssign = isAdmin && !holder && !approved && !requestClosed;

  if (isLoading) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading writer assignment">
        <div className="skeleton h-14 w-full" />
        <div className="skeleton h-8 w-2/3" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-700">{getErrorMessage(error, "Writer details could not be loaded.")}</p>
        <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 text-xs text-slate-500">
        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        The customer never sees the writer. Writer uploads reach the customer only after an administrator approves them.
      </p>

      {/* Current holder */}
      {current ? (
        <div className="rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-navy-900">{current.writer?.name || "Writer"}</p>
              <p className="text-xs text-slate-500">{[current.writer?.designation, current.writer?.institution].filter(Boolean).join(", ")}</p>
            </div>
            <StageBadge stage={current.stage} className="text-[11px]" />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Fee</dt>
              <dd className="text-navy-900">{formatMoney(current.offer?.fee, current.offer?.currency)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">{current.stage === "APPROVED" ? "Approved" : "Deadline"}</dt>
              <dd>
                {current.stage === "APPROVED" ? (
                  <span className="text-navy-900">{formatDateTime(current.approvedAt)}</span>
                ) : WORKING_STAGES.includes(current.stage) || current.stage === "OFFERED" ? (
                  <DeadlineCountdown deadline={current.offer?.deadline} now={now} />
                ) : (
                  formatDateTime(current.offer?.deadline)
                )}
              </dd>
            </div>
          </dl>
          {current.penalty?.isLate && current.stage !== "APPROVED" && (
            <p className="mt-2 text-xs font-medium text-red-700">
              Running penalty {formatMoney(current.penalty.penaltyAmount, current.offer?.currency)} ({current.penalty.penaltyPct}%)
            </p>
          )}
          {current.stage === "SUBMITTED" && <p className="mt-2 text-xs font-medium text-amber-700">A submission is waiting for review.</p>}
          <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => setOpenEngagement(current._id)}>
            Open assignment
          </button>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-3 text-sm text-slate-500">
          No writer assigned.
          {!requestClosed && " Approved writers can see an anonymised brief of this request and send interest."}
        </p>
      )}

      {/* Interested writers */}
      {interested.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Interested writers ({interested.length})</p>
          <ul className="space-y-2">
            {interested.map((e) => (
              <li key={e._id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button type="button" className="link text-left text-sm" onClick={() => setOpenEngagement(e._id)}>
                      {e.writer?.name || "Writer"}
                    </button>
                    <p className="text-xs text-slate-500">{[e.writer?.designation, e.writer?.institution].filter(Boolean).join(", ")}</p>
                  </div>
                  <p className="text-sm font-medium text-navy-900">
                    {e.proposal?.fee ? formatMoney(e.proposal.fee, e.proposal.currency || "INR") : "No fee stated"}
                    {e.proposal?.days ? <span className="text-slate-500"> · {e.proposal.days} days</span> : null}
                  </p>
                </div>
                {e.proposal?.note && <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap break-words text-xs text-slate-600">{e.proposal.note}</p>}
                {isAdmin && (
                  <button
                    type="button"
                    className="btn-secondary btn-sm mt-2"
                    disabled={Boolean(holder) || Boolean(approved) || requestClosed}
                    title={holder ? "Cancel the current assignment first" : undefined}
                    onClick={() => setAssignFor(e.writer?.id || e.writerId)}
                  >
                    Make offer
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && holder && <p className="help">Cancel the current assignment before offering the work to another writer.</p>}
        </div>
      )}

      {canAssign && (
        <button type="button" className="btn-primary btn-sm" onClick={() => setAssignFor("")}>
          <UserPlus className="h-3.5 w-3.5" aria-hidden="true" /> Assign a writer
        </button>
      )}
      {!isAdmin && !current && <p className="muted">Only administrators can assign writers.</p>}

      {history.length > 0 && (
        <div>
          <button type="button" className="btn-ghost btn-sm -ml-3" aria-expanded={showHistory} onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Hide" : "Show"} past engagements ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-1 divide-y divide-slate-100 rounded-md border border-slate-200">
              {history.map((e) => (
                <li key={e._id}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => setOpenEngagement(e._id)}
                  >
                    <span className="min-w-0 truncate text-navy-900">{e.writer?.name || "Writer"}</span>
                    <StageBadge stage={e.stage} className="text-[11px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {assignFor !== null && (
        <AssignWriterModal
          requestId={requestId}
          requestNumber={requestNumber}
          initialWriterId={assignFor || undefined}
          notify={notify}
          onClose={() => setAssignFor(null)}
        />
      )}
      {openEngagement && (
        <EngagementModal
          engagementId={openEngagement}
          initial={engagements.find((e) => e._id === openEngagement)}
          isAdmin={isAdmin}
          notify={notify}
          onClose={() => setOpenEngagement(null)}
        />
      )}
    </div>
  );
};
