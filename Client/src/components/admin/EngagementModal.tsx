import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, ExternalLink, FileText, Send, Undo2, UserCheck } from "lucide-react";
import { getErrorMessage } from "../../api";
import {
  adminCancelEngagement,
  adminGetEngagement,
  adminGetRequestEngagements,
  adminReleaseToCustomer,
  adminReviewSubmission,
  adminSendEngagementMessage,
  adminUpdatePayout,
  CLOSED_STAGES,
  Engagement,
  EngagementSubmission,
  formatMoney,
} from "../../api/writers";
import { Field, Spinner } from "../ui";
import { formatDate, formatDateTime, Notify, SafeLink, staffStatusLabel } from "./shared";
import { ServiceRequestStatus } from "../../api/types";
import { AssignWriterModal } from "./AssignWriterModal";
import {
  DeadlineCountdown,
  Detail,
  ExpertiseChips,
  formatFileSize,
  invalidateWriterData,
  onFormSubmit,
  Panel,
  StackedModal,
  StageBadge,
  useNow,
  WORKING_STAGES,
} from "./writerShared";

const humanize = (v?: string) => (v ? v.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : undefined);

/* -------------------------------------------------------------------------- */
/* Submissions                                                                */
/* -------------------------------------------------------------------------- */

const SubmissionItem: React.FC<{ s: EngagementSubmission; index: number; deadline?: string }> = ({ s, index, deadline }) => {
  const late = deadline ? new Date(s.submittedAt).getTime() > new Date(deadline).getTime() : false;
  return (
    <li className="rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Version {index + 1}</p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <SafeLink url={s.fileUrl} className="link inline-flex min-w-0 items-center gap-1 break-all">
              {s.fileName || "Submission"}
            </SafeLink>
            {s.fileSize ? <span className="shrink-0 text-xs text-slate-500">({formatFileSize(s.fileSize)})</span> : null}
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>Submitted {formatDateTime(s.submittedAt)}</p>
          {deadline && (late ? <span className="badge-danger mt-1 text-[11px]">After deadline</span> : <span className="badge-success mt-1 text-[11px]">On time</span>)}
        </div>
      </div>
      {s.note && (
        <p className="mt-2 whitespace-pre-wrap break-words rounded bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700">
          <span className="font-medium text-slate-500">Writer's note: </span>
          {s.note}
        </p>
      )}
      {s.review ? (
        <div className={`mt-2 rounded-md border px-2.5 py-2 text-sm ${s.review.decision === "APPROVED" ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
          <p className="flex flex-wrap items-center gap-2 text-xs">
            <span className={s.review.decision === "APPROVED" ? "badge-success" : "badge-warning"}>
              {s.review.decision === "APPROVED" ? "Approved" : "Changes requested"}
            </span>
            {s.review.decision === "APPROVED" &&
              (s.review.releasedToCustomer ? <span className="badge-navy">Sent to customer</span> : <span className="badge-neutral">Not yet sent to customer</span>)}
            <span className="text-slate-600">
              {s.review.reviewerName ? `${s.review.reviewerName} · ` : ""}
              {formatDateTime(s.review.reviewedAt)}
            </span>
          </p>
          {s.review.notes && <p className="mt-1 whitespace-pre-wrap break-words text-slate-700">{s.review.notes}</p>}
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-amber-700">Awaiting your review</p>
      )}
    </li>
  );
};

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export const EngagementModal: React.FC<{
  engagementId: string;
  initial?: Engagement;
  isAdmin: boolean;
  notify: Notify;
  onClose: () => void;
  /** When provided, shows "Open request" (the caller closes this dialog and opens the request). */
  onOpenRequest?: (requestId: string, requestNumber: string) => void | Promise<void>;
}> = ({ engagementId, initial, isAdmin, notify, onClose, onOpenRequest }) => {
  const queryClient = useQueryClient();
  const now = useNow();
  const threadEnd = useRef<HTMLLIElement>(null);

  const { data: eng, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-engagement", engagementId],
    queryFn: () => adminGetEngagement(engagementId),
    placeholderData: initial,
  });

  const requestId = eng?.requestId || eng?.request?.id;
  const briefQuery = useQuery({
    queryKey: ["admin-request-engagements", requestId],
    queryFn: () => adminGetRequestEngagements(requestId!),
    enabled: Boolean(requestId),
  });
  const brief = briefQuery.data?.request;

  /* ------------------------------- state --------------------------------- */
  const [decision, setDecision] = useState<"APPROVED" | "CHANGES_REQUESTED">("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [releaseNow, setReleaseNow] = useState(true);
  const [customerNote, setCustomerNote] = useState("");
  const [releaseNote, setReleaseNote] = useState("");
  const [message, setMessage] = useState("");
  const [counter, setCounter] = useState(false);
  const [counterFee, setCounterFee] = useState("");
  const [counterDays, setCounterDays] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [penaltyInput, setPenaltyInput] = useState("");
  const [payoutNote, setPayoutNote] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (eng?.payout) {
      setPenaltyInput(String(eng.payout.penaltyAmount ?? 0));
      setPayoutNote(eng.payout.note || "");
    }
  }, [eng?.payout?.penaltyAmount, eng?.payout?.note]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ block: "nearest" });
  }, [eng?.messages?.length]);

  /* ----------------------------- mutations ------------------------------- */
  const applyResult = (updated: Engagement, customerFacing = false) => {
    queryClient.setQueryData(["admin-engagement", engagementId], updated);
    invalidateWriterData(queryClient, {
      requestId: updated.requestId,
      writerId: updated.writerId || updated.writer?.id,
      customerFacing,
    });
  };

  const messageMutation = useMutation({
    mutationFn: (payload: { text?: string; proposedFee?: number; proposedDays?: number }) => adminSendEngagementMessage(engagementId, payload),
    onSuccess: (updated) => {
      applyResult(updated);
      setMessage("");
      setCounter(false);
      setCounterFee("");
      setCounterDays("");
      notify("success", "Message sent to the writer.");
    },
    onError: (err) => notify("error", getErrorMessage(err, "The message could not be sent.")),
  });

  const reviewMutation = useMutation({
    mutationFn: () =>
      adminReviewSubmission(engagementId, {
        decision,
        notes: reviewNotes.trim() || undefined,
        releaseToCustomer: decision === "APPROVED" ? releaseNow : undefined,
        customerNote: decision === "APPROVED" && releaseNow ? customerNote.trim() || undefined : undefined,
      }),
    onSuccess: (updated) => {
      const released = decision === "APPROVED" && releaseNow;
      applyResult(updated, released);
      setReviewNotes("");
      setCustomerNote("");
      notify(
        "success",
        decision === "APPROVED"
          ? released
            ? "Submission approved and sent to the customer."
            : "Submission approved. It has not been sent to the customer yet."
          : "Changes requested. The writer has been notified."
      );
    },
    onError: (err) => notify("error", getErrorMessage(err, "The review could not be saved.")),
  });

  const releaseMutation = useMutation({
    mutationFn: () => adminReleaseToCustomer(engagementId, releaseNote.trim() || undefined),
    onSuccess: (updated) => {
      applyResult(updated, true);
      setReleaseNote("");
      notify("success", "The approved file is now the customer's final deliverable.");
    },
    onError: (err) => notify("error", getErrorMessage(err, "The file could not be sent to the customer.")),
  });

  const cancelMutation = useMutation({
    mutationFn: () => adminCancelEngagement(engagementId, cancelReason.trim() || undefined),
    onSuccess: (updated) => {
      const wasInterest = eng?.stage === "INTERESTED";
      applyResult(updated);
      setCancelling(false);
      setCancelReason("");
      notify("success", wasInterest ? "The writer's interest was dismissed." : "Assignment cancelled. The request is open for reassignment.");
    },
    onError: (err) => notify("error", getErrorMessage(err, "The assignment could not be cancelled.")),
  });

  const payoutMutation = useMutation({
    mutationFn: (vars: { payload: { status?: "PAID" | "UNPAID"; penaltyAmount?: number; note?: string }; success: string }) =>
      adminUpdatePayout(engagementId, vars.payload),
    onSuccess: (updated, vars) => {
      applyResult(updated);
      notify("success", vars.success);
    },
    onError: (err) => notify("error", getErrorMessage(err, "The payout could not be updated.")),
  });

  const busy =
    messageMutation.isPending || reviewMutation.isPending || releaseMutation.isPending || cancelMutation.isPending || payoutMutation.isPending;

  /* ------------------------------ derived -------------------------------- */
  const messages = useMemo(
    () => [...(eng?.messages || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [eng?.messages]
  );

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  if (!eng) {
    return (
      <StackedModal onClose={handleClose} size="xl" title="Assignment">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading">
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-700">{isError ? getErrorMessage(error, "The assignment could not be loaded.") : "Assignment not found."}</p>
            <button type="button" className="btn-secondary btn-sm" onClick={() => refetch()}>
              Try again
            </button>
          </div>
        )}
      </StackedModal>
    );
  }

  const offer = eng.offer;
  const currency = offer?.currency || eng.proposal?.currency || "INR";
  const closed = CLOSED_STAGES.includes(eng.stage);
  const canCancel = !closed && eng.stage !== "APPROVED";
  const latest = eng.submissions[eng.submissions.length - 1];
  const awaitingReview = eng.stage === "SUBMITTED" && latest && !latest.review;
  const approvedSubmission = [...eng.submissions].reverse().find((s) => s.review?.decision === "APPROVED");
  const notReleased = eng.stage === "APPROVED" && approvedSubmission && !approvedSubmission.review?.releasedToCustomer;
  const requestNumber = eng.request?.requestNumber || brief?.requestNumber || "Request";
  const serviceName = eng.request?.serviceName || brief?.service?.name;
  const showCountdown = WORKING_STAGES.includes(eng.stage) || eng.stage === "OFFERED";

  const sendMessage = () => {
    const text = message.trim();
    const payload: { text?: string; proposedFee?: number; proposedDays?: number } = {};
    if (text) payload.text = text;
    if (counter) {
      if (counterFee !== "") {
        const f = Number(counterFee);
        if (!(f > 0)) return notify("error", "The proposed fee must be greater than zero.");
        payload.proposedFee = Math.round(f);
      }
      if (counterDays !== "") {
        const d = Number(counterDays);
        if (!(Number.isInteger(d) && d >= 1 && d <= 365)) return notify("error", "Proposed days must be a whole number between 1 and 365.");
        payload.proposedDays = d;
      }
    }
    if (!payload.text && payload.proposedFee === undefined && payload.proposedDays === undefined) {
      return notify("error", "Write a message or propose terms before sending.");
    }
    messageMutation.mutate(payload);
  };

  const submitReview = () => {
    if (decision === "CHANGES_REQUESTED" && !reviewNotes.trim()) {
      notify("error", "Tell the writer what needs to change.");
      return;
    }
    const confirmText =
      decision === "APPROVED"
        ? releaseNow
          ? "Approve this submission and send it to the customer as their final deliverable?"
          : "Approve this submission? The payout will be calculated now. The file will not be sent to the customer yet."
        : "Send this file back to the writer with your requested changes?";
    if (window.confirm(confirmText)) reviewMutation.mutate();
  };

  const savePenalty = () => {
    const p = Number(penaltyInput);
    const max = offer?.fee || 0;
    if (!(Number.isFinite(p) && p >= 0 && p <= max)) {
      notify("error", `The penalty must be between 0 and ${formatMoney(max, currency)}.`);
      return;
    }
    payoutMutation.mutate({ payload: { penaltyAmount: Math.round(p), note: payoutNote }, success: "Payout updated." });
  };

  const openRequest = async () => {
    if (!onOpenRequest || !requestId) return;
    setOpening(true);
    try {
      await onOpenRequest(requestId, requestNumber);
    } finally {
      setOpening(false);
    }
  };

  const penaltyValue = Number(penaltyInput);
  const payablePreview = offer && Number.isFinite(penaltyValue) ? Math.max(0, offer.fee - Math.round(penaltyValue)) : undefined;

  return (
    <StackedModal
      onClose={handleClose}
      size="xl"
      title={`${requestNumber}${serviceName ? ` · ${serviceName}` : ""}`}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <StageBadge stage={eng.stage} className="text-[11px]" />
          <span>{eng.writer?.name || "Writer"}</span>
          {offer && <span>· {formatMoney(offer.fee, currency)}</span>}
        </span>
      }
      footer={
        <button type="button" className="btn-secondary btn-sm" onClick={handleClose} disabled={busy}>
          Close
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* ------------------------------ left ------------------------------ */}
        <div className="min-w-0 space-y-5 lg:col-span-3">
          {eng.stage === "INTERESTED" && (
            <Panel title="Writer's proposal">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Detail label="Proposed fee">{eng.proposal?.fee ? formatMoney(eng.proposal.fee, eng.proposal.currency || "INR") : undefined}</Detail>
                <Detail label="Proposed time">{eng.proposal?.days ? `${eng.proposal.days} days` : undefined}</Detail>
                <Detail label="Sent">{eng.proposal?.proposedAt ? formatDateTime(eng.proposal.proposedAt) : formatDateTime(eng.createdAt)}</Detail>
                {eng.proposal?.note && (
                  <Detail label="Note" className="sm:col-span-3">
                    <span className="whitespace-pre-wrap">{eng.proposal.note}</span>
                  </Detail>
                )}
              </dl>
              {isAdmin && (
                <button type="button" className="btn-primary btn-sm" onClick={() => setAssignOpen(true)} disabled={busy}>
                  <UserCheck className="h-3.5 w-3.5" aria-hidden="true" /> Make offer to this writer
                </button>
              )}
            </Panel>
          )}

          <Panel
            title="Submissions"
            aside={eng.submissions.length > 0 ? <span className="text-xs text-slate-500">{eng.submissions.length} file{eng.submissions.length === 1 ? "" : "s"}</span> : null}
          >
            {eng.submissions.length === 0 ? (
              <p className="muted">
                {eng.stage === "ACCEPTED" ? "The writer is working on this paper. Their upload will appear here for your review." : "No files have been submitted."}
              </p>
            ) : (
              <ol className="space-y-3">
                {eng.submissions.map((s, i) => (
                  <SubmissionItem key={s._id || `${s.fileUrl}-${i}`} s={s} index={i} deadline={offer?.deadline} />
                ))}
              </ol>
            )}

            <div className="alert-info" role="note">
              <p>Nothing the writer uploads reaches the customer until an administrator approves it.</p>
            </div>

            {awaitingReview &&
              (isAdmin ? (
                <form className="space-y-3 border-t border-slate-200 pt-4" onSubmit={onFormSubmit(submitReview)} aria-label="Review the latest submission">
                  <p className="text-sm font-semibold text-navy-900">Review version {eng.submissions.length}</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Decision">
                    <label className={`choice ${decision === "APPROVED" ? "choice-active" : ""}`}>
                      <input
                        type="radio"
                        name="review-decision"
                        className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-navy-700 focus:ring-navy-500"
                        checked={decision === "APPROVED"}
                        onChange={() => setDecision("APPROVED")}
                      />
                      <span>
                        <span className="block font-medium">Approve</span>
                        <span className="block text-xs text-slate-500">Accept the work and calculate the payout.</span>
                      </span>
                    </label>
                    <label className={`choice ${decision === "CHANGES_REQUESTED" ? "choice-active" : ""}`}>
                      <input
                        type="radio"
                        name="review-decision"
                        className="mt-0.5 h-4 w-4 shrink-0 border-slate-300 text-navy-700 focus:ring-navy-500"
                        checked={decision === "CHANGES_REQUESTED"}
                        onChange={() => setDecision("CHANGES_REQUESTED")}
                      />
                      <span>
                        <span className="block font-medium">Request changes</span>
                        <span className="block text-xs text-slate-500">Send it back to the writer with notes.</span>
                      </span>
                    </label>
                  </div>

                  <Field
                    label={decision === "APPROVED" ? "Note to the writer (optional)" : "What needs to change"}
                    required={decision === "CHANGES_REQUESTED"}
                  >
                    {(id) => (
                      <textarea
                        id={id}
                        rows={3}
                        maxLength={3000}
                        className="input"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder={decision === "APPROVED" ? "Thank the writer or record any remarks" : "Be specific so the writer can revise quickly"}
                      />
                    )}
                  </Field>

                  {decision === "APPROVED" && (
                    <>
                      <label className={`choice ${releaseNow ? "choice-active" : ""}`}>
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                          checked={releaseNow}
                          onChange={(e) => setReleaseNow(e.target.checked)}
                        />
                        <span>
                          <span className="block font-medium">Send this file to the customer now</span>
                          <span className="block text-xs text-slate-500">
                            It becomes the customer's final deliverable. Untick to send it later from this screen.
                          </span>
                        </span>
                      </label>
                      {releaseNow && (
                        <Field label="Note to the customer (optional)" help="Shown with the deliverable. The writer's identity is never shared.">
                          {(id, describedBy) => (
                            <textarea
                              id={id}
                              aria-describedby={describedBy}
                              rows={2}
                              maxLength={2000}
                              className="input"
                              value={customerNote}
                              onChange={(e) => setCustomerNote(e.target.value)}
                            />
                          )}
                        </Field>
                      )}
                    </>
                  )}

                  <button
                    type="submit"
                    className={decision === "APPROVED" ? "btn-primary btn-sm" : "btn-danger-outline btn-sm"}
                    disabled={busy || (decision === "CHANGES_REQUESTED" && !reviewNotes.trim())}
                  >
                    {reviewMutation.isPending ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : decision === "APPROVED" ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {decision === "APPROVED" ? (releaseNow ? "Approve and send to customer" : "Approve") : "Request changes"}
                  </button>
                </form>
              ) : (
                <p className="muted">An administrator will review this submission.</p>
              ))}

            {notReleased && (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="alert-warning" role="note">
                  <p>This work is approved but has not been sent to the customer.</p>
                </div>
                {isAdmin && (
                  <form className="space-y-3" onSubmit={onFormSubmit(() => {
                    if (window.confirm("Send the approved file to the customer as their final deliverable?")) releaseMutation.mutate();
                  })}>
                    <Field label="Note to the customer (optional)">
                      {(id) => (
                        <textarea id={id} rows={2} maxLength={2000} className="input" value={releaseNote} onChange={(e) => setReleaseNote(e.target.value)} />
                      )}
                    </Field>
                    <button type="submit" className="btn-primary btn-sm" disabled={busy}>
                      {releaseMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />} Send to customer
                    </button>
                  </form>
                )}
              </div>
            )}
          </Panel>

          {/* ------------------------- conversation ------------------------- */}
          <Panel title="Conversation with the writer">
            {messages.length === 0 ? (
              <p className="muted">No messages yet.</p>
            ) : (
              <ol className="max-h-[28rem] space-y-3 overflow-y-auto pr-1" aria-label="Messages">
                {messages.map((m, i) => {
                  const mine = m.from === "ADMIN";
                  return (
                    <li key={m._id || `${m.createdAt}-${i}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`w-full max-w-[92%] rounded-lg border p-3 sm:max-w-[85%] ${mine ? "border-navy-200 bg-navy-50" : "border-slate-200 bg-white"}`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                          <p className="text-xs font-semibold text-navy-900">
                            {m.authorName || (mine ? "Research Hub team" : eng.writer?.name || "Writer")}
                            <span className={`ml-2 ${mine ? "badge-navy" : "badge-neutral"} text-[10px]`}>{mine ? "Staff" : "Writer"}</span>
                          </p>
                          <p className="text-[11px] text-slate-500">{formatDateTime(m.createdAt)}</p>
                        </div>
                        {m.text && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{m.text}</p>}
                        {(m.proposedFee || m.proposedDays) && (
                          <p className="mt-2 flex flex-wrap gap-1.5">
                            {m.proposedFee ? <span className="badge-accent text-[11px]">Proposed fee {formatMoney(m.proposedFee, currency)}</span> : null}
                            {m.proposedDays ? (
                              <span className="badge-accent text-[11px]">
                                Proposed {m.proposedDays} day{m.proposedDays === 1 ? "" : "s"}
                              </span>
                            ) : null}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
                <li ref={threadEnd} aria-hidden="true" />
              </ol>
            )}

            {isAdmin ? (
              <form className="space-y-3 border-t border-slate-200 pt-4" onSubmit={onFormSubmit(sendMessage)}>
                <Field label="Message the writer" help="Only the writer and staff can see this conversation.">
                  {(id, describedBy) => (
                    <textarea
                      id={id}
                      aria-describedby={describedBy}
                      rows={3}
                      maxLength={3000}
                      className="input"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Discuss scope, fee or timeline"
                    />
                  )}
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-navy-700 focus:ring-navy-500"
                    checked={counter}
                    onChange={(e) => setCounter(e.target.checked)}
                  />
                  Include a counter-proposal
                </label>
                {counter && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label={`Proposed fee (${currency})`}>
                      {(id) => (
                        <input id={id} type="number" min="1" step="1" inputMode="numeric" className="input" value={counterFee} onChange={(e) => setCounterFee(e.target.value)} />
                      )}
                    </Field>
                    <Field label="Proposed days">
                      {(id) => (
                        <input id={id} type="number" min="1" max="365" step="1" inputMode="numeric" className="input" value={counterDays} onChange={(e) => setCounterDays(e.target.value)} />
                      )}
                    </Field>
                  </div>
                )}
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary btn-sm" disabled={busy}>
                    {messageMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />} Send
                  </button>
                </div>
              </form>
            ) : null}
          </Panel>
        </div>

        {/* ------------------------------ right ----------------------------- */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Panel
            title="Request"
            aside={
              onOpenRequest && requestId ? (
                <button type="button" className="btn-ghost btn-sm" onClick={openRequest} disabled={opening || busy}>
                  {opening ? <Spinner className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />} Open request
                </button>
              ) : null
            }
          >
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Detail label="Reference">
                <span className="font-mono text-xs font-semibold">{requestNumber}</span>
              </Detail>
              <Detail label="Request status">{eng.request?.status ? staffStatusLabel(eng.request.status as ServiceRequestStatus) : undefined}</Detail>
              <Detail label="Service" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                {serviceName}
              </Detail>
              {brief && (
                <>
                  <Detail label="Discipline">{brief.discipline}</Detail>
                  <Detail label="Academic level">{brief.academicLevel}</Detail>
                  <Detail label="Publication type">{brief.publicationType}</Detail>
                  <Detail label="Word count">{brief.wordCount ? Number(brief.wordCount).toLocaleString() : undefined}</Detail>
                  <Detail label="Citation style">{brief.citationStyle}</Detail>
                  <Detail label="Indexing">{brief.indexingRequirement}</Detail>
                </>
              )}
              <Detail label="Customer deadline">
                {eng.request?.customerDeadline || brief?.customerDeadline ? formatDate(eng.request?.customerDeadline || brief?.customerDeadline) : "Flexible"}
              </Detail>
            </dl>
          </Panel>

          <Panel title="Writer">
            <dl className="grid grid-cols-1 gap-3">
              <Detail label="Name">{eng.writer?.name}</Detail>
              <Detail label="Designation & institution">{[eng.writer?.designation, eng.writer?.institution].filter(Boolean).join(", ")}</Detail>
              <Detail label="Email">
                {eng.writer?.email && (
                  <a className="link break-all" href={`mailto:${eng.writer.email}`}>
                    {eng.writer.email}
                  </a>
                )}
              </Detail>
              <Detail label="Expertise">
                <ExpertiseChips items={eng.writer?.expertise} />
              </Detail>
            </dl>
          </Panel>

          <Panel title="Offer terms">
            {offer ? (
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Detail label="Agreed fee">{formatMoney(offer.fee, currency)}</Detail>
                <Detail label="Offered">{formatDateTime(offer.offeredAt)}</Detail>
                <Detail label="Deadline" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  {showCountdown ? <DeadlineCountdown deadline={offer.deadline} now={now} /> : formatDateTime(offer.deadline)}
                </Detail>
                <Detail label="Late penalty" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                  {offer.penaltyPerDayPct}% per day, maximum {offer.maxPenaltyPct}%
                </Detail>
                {eng.acceptedAt && <Detail label="Accepted by writer">{formatDateTime(eng.acceptedAt)}</Detail>}
                {offer.notes && (
                  <Detail label="Notes" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <span className="whitespace-pre-wrap">{offer.notes}</span>
                  </Detail>
                )}
                {eng.penalty && eng.penalty.isLate && eng.stage !== "APPROVED" && (
                  <div className="alert-error sm:col-span-2 lg:col-span-1 xl:col-span-2" role="note">
                    <p>
                      Running penalty: {eng.penalty.lateDays} day{eng.penalty.lateDays === 1 ? "" : "s"} late, {eng.penalty.penaltyPct}% ({formatMoney(eng.penalty.penaltyAmount, currency)}).
                      Payable now {formatMoney(eng.penalty.payableAmount, currency)}.
                    </p>
                  </div>
                )}
              </dl>
            ) : (
              <p className="muted">No offer has been sent to this writer.</p>
            )}
            {eng.stage === "OFFERED" && <p className="text-xs text-amber-700">Waiting for the writer to accept or decline.</p>}
            {closed && eng.closedReason && (
              <p className="text-sm text-slate-600">
                <span className="font-medium">Closed: </span>
                {eng.closedReason}
              </p>
            )}
            {isAdmin && eng.stage === "OFFERED" && (
              <button type="button" className="btn-secondary btn-sm" onClick={() => setAssignOpen(true)} disabled={busy}>
                Revise offer
              </button>
            )}
          </Panel>

          {eng.stage === "APPROVED" && eng.payout && offer && (
            <Panel
              title="Writer payout"
              aside={eng.payout.status === "PAID" ? <span className="badge-success text-[11px]">Paid</span> : <span className="badge-warning text-[11px]">Unpaid</span>}
            >
              <dl className="grid grid-cols-2 gap-3">
                <Detail label="Agreed fee">{formatMoney(offer.fee, currency)}</Detail>
                <Detail label="Late days">{String(eng.payout.lateDays ?? 0)}</Detail>
                <Detail label="Penalty">{formatMoney(eng.payout.penaltyAmount ?? 0, currency)}</Detail>
                <Detail label="Payable">
                  <span className="font-semibold">{formatMoney(eng.payout.payableAmount ?? offer.fee, currency)}</span>
                </Detail>
                {eng.payout.paidAt && <Detail label="Paid on">{formatDateTime(eng.payout.paidAt)}</Detail>}
                {eng.approvedAt && <Detail label="Approved on">{formatDateTime(eng.approvedAt)}</Detail>}
                {!isAdmin && eng.payout.note && (
                  <Detail label="Note" className="col-span-2">
                    {eng.payout.note}
                  </Detail>
                )}
              </dl>
              <p className="help mt-0">Lateness is measured at the time of the approved submission.</p>
              {isAdmin && (
                <form className="space-y-3 border-t border-slate-200 pt-3" onSubmit={onFormSubmit(savePenalty)}>
                  <Field label={`Penalty override (${currency})`} help={`Between 0 and ${formatMoney(offer.fee, currency)}.${payablePreview !== undefined ? ` Payable would be ${formatMoney(payablePreview, currency)}.` : ""}`}>
                    {(id, describedBy) => (
                      <input
                        id={id}
                        aria-describedby={describedBy}
                        type="number"
                        min="0"
                        max={offer.fee}
                        step="1"
                        inputMode="numeric"
                        className="input"
                        value={penaltyInput}
                        onChange={(e) => setPenaltyInput(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field label="Payout note">
                    {(id) => (
                      <textarea id={id} rows={2} maxLength={1000} className="input" value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} placeholder="e.g. Paid via bank transfer, UTR …" />
                    )}
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-secondary btn-sm" disabled={busy}>
                      {payoutMutation.isPending && <Spinner className="h-3.5 w-3.5" />} Save
                    </button>
                    {eng.payout.status === "PAID" ? (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        disabled={busy}
                        onClick={() =>
                          window.confirm("Mark this payout as unpaid?") &&
                          payoutMutation.mutate({ payload: { status: "UNPAID", note: payoutNote }, success: "Payout marked as unpaid." })
                        }
                      >
                        Mark unpaid
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={busy}
                        onClick={() =>
                          window.confirm(`Mark ${formatMoney(eng.payout?.payableAmount ?? offer.fee, currency)} as paid to ${eng.writer?.name || "the writer"}?`) &&
                          payoutMutation.mutate({ payload: { status: "PAID", note: payoutNote }, success: "Payout marked as paid." })
                        }
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Mark paid
                      </button>
                    )}
                  </div>
                </form>
              )}
            </Panel>
          )}

          {isAdmin && canCancel && (
            <Panel title={eng.stage === "INTERESTED" ? "Dismiss interest" : "Cancel assignment"}>
              {cancelling ? (
                <form
                  className="space-y-3"
                  onSubmit={onFormSubmit(() => {
                    if (window.confirm("Cancel this assignment? The writer will be told and the request re-opens for other writers.")) cancelMutation.mutate();
                  })}
                >
                  <Field label="Reason" help="Shared with the writer.">
                    {(id, describedBy) => (
                      <textarea
                        id={id}
                        aria-describedby={describedBy}
                        rows={2}
                        maxLength={1000}
                        className="input"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                      />
                    )}
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-danger btn-sm" disabled={busy}>
                      {cancelMutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />} Confirm cancellation
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setCancelling(false)} disabled={busy}>
                      Keep
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <p className="muted">
                    {eng.stage === "INTERESTED"
                      ? "Close this writer's interest without making an offer."
                      : "Withdraw the work from this writer so you can reassign it. Any submitted files stay on record."}
                  </p>
                  <button type="button" className="btn-danger-outline btn-sm" onClick={() => setCancelling(true)} disabled={busy}>
                    <Ban className="h-3.5 w-3.5" aria-hidden="true" /> {eng.stage === "INTERESTED" ? "Dismiss" : "Cancel assignment"}
                  </button>
                </>
              )}
            </Panel>
          )}
        </div>
      </div>

      {assignOpen && requestId && (
        <AssignWriterModal
          requestId={requestId}
          requestNumber={requestNumber}
          initialWriterId={eng.writerId || eng.writer?.id}
          notify={notify}
          onClose={() => {
            setAssignOpen(false);
            queryClient.invalidateQueries({ queryKey: ["admin-engagement", engagementId] });
          }}
        />
      )}
    </StackedModal>
  );
};
