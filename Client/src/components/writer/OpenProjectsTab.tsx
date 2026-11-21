import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, FolderSearch, MessageSquare, Paperclip } from "lucide-react";
import { getErrorMessage } from "../../api";
import { CLOSED_STAGES, WriterBrief, expressInterest, formatMoney, getOpenBriefs } from "../../api/writers";
import { EmptyState, ErrorState, Field, Modal, Spinner } from "../ui";
import { Fact, StageBadge } from "./WriterBits";
import { formatDate, formatLooseDate, humanizeKey, isFileLike, isNotApprovedError, requirementText, writerRetry } from "./writerHelpers";

const PAGE_SIZE = 12;

/** Up to `max` short requirement values worth showing on a card. */
const keyRequirements = (brief: WriterBrief, max = 3) =>
  Object.entries(brief.requirements || {})
    .filter(([, v]) => !isFileLike(v) && !(Array.isArray(v) && v.some(isFileLike)))
    .map(([k, v]) => [humanizeKey(k), requirementText(v)] as const)
    .filter((pair): pair is readonly [string, string] => Boolean(pair[1]))
    .slice(0, max);

/* -------------------------------------------------------------------------- */
/* Interest modal                                                             */
/* -------------------------------------------------------------------------- */

const InterestModal: React.FC<{ brief: WriterBrief | null; onClose: () => void; onSent: (brief: WriterBrief, engagementId: string) => void }> = ({
  brief,
  onClose,
  onSent,
}) => {
  const queryClient = useQueryClient();
  const [fee, setFee] = useState("");
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ fee?: string; days?: string }>({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!brief) return;
    const prev = brief.myEngagement?.proposal;
    setFee(prev?.fee ? String(prev.fee) : "");
    setDays(prev?.days ? String(prev.days) : "");
    setNote("");
    setErrors({});
    setServerError("");
  }, [brief]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief) return;
    const feeNum = Number(fee);
    const daysNum = Number(days);
    const next: typeof errors = {};
    if (!fee.trim() || !Number.isFinite(feeNum) || feeNum <= 0) next.fee = "Enter the fee you expect, in rupees.";
    if (!days.trim() || !Number.isInteger(daysNum) || daysNum < 1 || daysNum > 365) next.days = "Enter a whole number of days between 1 and 365.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    setServerError("");
    try {
      const engagement = await expressInterest(brief._id, { fee: Math.round(feeNum), days: daysNum, note: note.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: ["writer-open-briefs"] });
      queryClient.invalidateQueries({ queryKey: ["writer-engagements"] });
      onSent(brief, engagement._id);
    } catch (err) {
      setServerError(getErrorMessage(err, "We couldn't send your interest. Please try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={Boolean(brief)}
      onClose={sending ? () => undefined : onClose}
      title="Express interest"
      subtitle={brief ? `${brief.service?.name || "Research project"} · ${brief.requestNumber}` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button type="submit" form="writer-interest-form" className="btn-primary" disabled={sending}>
            {sending && <Spinner />}
            {sending ? "Sending…" : "Send proposal"}
          </button>
        </>
      }
    >
      <form id="writer-interest-form" onSubmit={submit} noValidate className="space-y-4">
        <p className="text-sm text-slate-600">
          Tell us what you would charge and how long you need. Our team may discuss the terms with you before sending a formal offer with a
          deadline.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your fee (₹)" required error={errors.fee} help="Total amount for the complete work.">
            {(id, d) => (
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-500" aria-hidden="true">
                  ₹
                </span>
                <input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(errors.fee)}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  className={`input pl-8 ${errors.fee ? "input-error" : ""}`}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  placeholder="15000"
                />
              </div>
            )}
          </Field>
          <Field label="Days needed" required error={errors.days} help="Calendar days from acceptance.">
            {(id, d) => (
              <input
                id={id}
                aria-describedby={d}
                aria-invalid={Boolean(errors.days)}
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                step={1}
                className={`input ${errors.days ? "input-error" : ""}`}
                value={days}
                onChange={(e) => setDays(e.target.value)}
                placeholder="14"
              />
            )}
          </Field>
        </div>
        <Field label="Note to the Research Hub team" help="Optional. Relevant experience, approach or questions about the brief.">
          {(id, d) => (
            <textarea
              id={id}
              aria-describedby={d}
              rows={4}
              maxLength={2000}
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </Field>
        <p className="text-xs text-slate-500">
          Customer identity and contact details are never shared with writers. Reference files are shared once you accept an offer.
        </p>
        {serverError && (
          <div className="alert-error" role="alert">
            {serverError}
          </div>
        )}
      </form>
    </Modal>
  );
};

/* -------------------------------------------------------------------------- */
/* Brief card                                                                 */
/* -------------------------------------------------------------------------- */

const BriefCard: React.FC<{ brief: WriterBrief; onInterest: () => void; onOpen: (engagementId: string) => void }> = ({ brief, onInterest, onOpen }) => {
  const mine = brief.myEngagement && !CLOSED_STAGES.includes(brief.myEngagement.stage) ? brief.myEngagement : null;
  const reqs = keyRequirements(brief);
  const deadline = formatLooseDate(brief.customerDeadline);

  return (
    <article className="card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-slate-500">{brief.requestNumber}</p>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug text-navy-900">{brief.service?.name || "Research project"}</h3>
        </div>
        {mine && <StageBadge stage={mine.stage} />}
      </div>

      {brief.discipline && (
        <p className="mt-2">
          <span className="badge-navy">{brief.discipline}</span>
        </p>
      )}

      {brief.brief && <p className="mt-3 line-clamp-3 break-words text-sm text-slate-600">{brief.brief}</p>}

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        {brief.academicLevel && <Fact label="Academic level">{brief.academicLevel}</Fact>}
        {brief.publicationType && <Fact label="Publication type">{brief.publicationType}</Fact>}
        {brief.indexingRequirement && <Fact label="Indexing">{brief.indexingRequirement}</Fact>}
        {brief.wordCount ? <Fact label="Word count">{brief.wordCount.toLocaleString()}</Fact> : null}
        {deadline && <Fact label="Customer deadline">{deadline}</Fact>}
        {reqs.map(([label, value]) => (
          <Fact key={label} label={label} className="col-span-2">
            <span className="line-clamp-2">{value}</span>
          </Fact>
        ))}
      </dl>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Posted {formatDate(brief.createdAt)}
          </span>
          {brief.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-1" title="Files are shared after you accept an offer">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              {brief.attachmentCount} reference file{brief.attachmentCount === 1 ? "" : "s"} (after acceptance)
            </span>
          )}
        </div>

        {mine ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {mine.proposal?.fee ? (
              <p className="text-xs text-slate-600">
                Your proposal: <span className="font-semibold text-navy-900">{formatMoney(mine.proposal.fee)}</span>
                {mine.proposal.days ? ` · ${mine.proposal.days} days` : ""}
              </p>
            ) : (
              <span />
            )}
            <button type="button" className="btn-secondary btn-sm" onClick={() => onOpen(mine._id)}>
              <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
              View conversation
            </button>
          </div>
        ) : (
          <button type="button" className="btn-primary btn-sm mt-3 w-full" onClick={onInterest}>
            I'm interested
          </button>
        )}
      </div>
    </article>
  );
};

/* -------------------------------------------------------------------------- */
/* Tab                                                                        */
/* -------------------------------------------------------------------------- */

export const OpenProjectsTab: React.FC<{
  onOpenEngagement: (id: string) => void;
  notApproved: (message?: string) => React.ReactNode;
}> = ({ onOpenEngagement, notApproved }) => {
  const [page, setPage] = useState(1);
  const [interestFor, setInterestFor] = useState<WriterBrief | null>(null);
  const [sent, setSent] = useState<{ label: string; engagementId: string } | null>(null);

  const query = useQuery({
    queryKey: ["writer-open-briefs", page],
    queryFn: () => getOpenBriefs({ page, limit: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    retry: writerRetry,
  });

  if (query.isError && isNotApprovedError(query.error)) return <>{notApproved(getErrorMessage(query.error))}</>;

  const briefs = query.data?.data || [];
  const totalPages = query.data?.totalPages || 1;
  const total = query.data?.total ?? briefs.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-semibold text-navy-900">Open projects</h2>
          <p className="muted mt-0.5">Anonymised briefs from Research Hub clients that no writer has taken yet.</p>
        </div>
        {query.data && (
          <p className="text-sm text-slate-500">
            {total} open project{total === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {sent && (
        <div className="alert-success" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            Your interest in {sent.label} has been sent. We'll reply in the project conversation.{" "}
            <button type="button" className="font-semibold underline underline-offset-2" onClick={() => onOpenEngagement(sent.engagementId)}>
              View conversation
            </button>
          </div>
          <button type="button" className="text-xs font-medium underline" onClick={() => setSent(null)} aria-label="Dismiss message">
            Dismiss
          </button>
        </div>
      )}

      {query.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading open projects">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3 p-5">
              <div className="skeleton h-3 w-24" />
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-12 w-full" />
              <div className="skeleton h-8 w-full" />
            </div>
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState title="We couldn't load open projects" message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : briefs.length === 0 ? (
        <EmptyState
          icon={<FolderSearch className="h-5 w-5" />}
          title="No open projects right now"
          message="New briefs appear here as clients submit requests. Check back soon — we also contact writers directly when a project matches their expertise."
        />
      ) : (
        <div className={`space-y-5 transition-opacity ${query.isPlaceholderData ? "opacity-60" : ""}`}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {briefs.map((b) => (
              <BriefCard key={b._id} brief={b} onInterest={() => setInterestFor(b)} onOpen={onOpenEngagement} />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
              <p className="muted">
                Page {page} of {totalPages}
                {query.isFetching && <Spinner className="ml-2 inline h-3.5 w-3.5" />}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1 || query.isFetching}
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Previous
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || query.isFetching}
                >
                  Next <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </div>
      )}

      <InterestModal
        brief={interestFor}
        onClose={() => setInterestFor(null)}
        onSent={(b, engagementId) => {
          setInterestFor(null);
          setSent({ label: `${b.service?.name || "the project"} (${b.requestNumber})`, engagementId });
        }}
      />
    </div>
  );
};
