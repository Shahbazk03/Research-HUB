import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Search, Send, X } from "lucide-react";
import { getErrorMessage } from "../../api";
import { adminAssignWriter, adminGetRequestEngagements, adminListWriters, Engagement, formatMoney } from "../../api/writers";
import { Field, Spinner } from "../ui";
import { Notify, useDebouncedValue } from "./shared";
import {
  daysFromNow,
  ExpertiseChips,
  HOLDING_STAGES,
  invalidateWriterData,
  onFormSubmit,
  StackedModal,
  toLocalInputValue,
  writerDisplayName,
  writersKey,
} from "./writerShared";

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];
const QUICK_DAYS = [3, 7, 14];

interface Candidate {
  id: string;
  name: string;
  email: string;
  institution?: string;
  designation?: string;
  expertise: string[];
  proposal?: Engagement["proposal"];
  active?: number;
  completed?: number;
}

/**
 * Offer a request to a writer: fee, deadline and late-penalty terms.
 * Re-opening it for the writer who already holds a pending offer revises that offer.
 */
export const AssignWriterModal: React.FC<{
  requestId: string;
  requestNumber?: string;
  initialWriterId?: string;
  notify: Notify;
  onClose: () => void;
}> = ({ requestId, requestNumber, initialWriterId, notify, onClose }) => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [writerId, setWriterId] = useState(initialWriterId || "");
  const [fee, setFee] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [deadline, setDeadline] = useState(() => toLocalInputValue(daysFromNow(7)));
  const [perDay, setPerDay] = useState("5");
  const [maxPct, setMaxPct] = useState("50");
  const [notes, setNotes] = useState("");
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const engagementsQuery = useQuery({
    queryKey: ["admin-request-engagements", requestId],
    queryFn: () => adminGetRequestEngagements(requestId),
  });
  const writersQuery = useQuery({
    queryKey: writersKey("APPROVED", search),
    queryFn: () => adminListWriters({ status: "APPROVED", search: search || undefined }),
  });

  const engagements = engagementsQuery.data?.engagements || [];
  const holder = engagements.find((e) => HOLDING_STAGES.includes(e.stage));
  const refNumber = requestNumber || engagementsQuery.data?.request?.requestNumber;

  const interested: Candidate[] = useMemo(
    () =>
      engagements
        .filter((e) => (e.stage === "INTERESTED" || (e.stage === "OFFERED" && e.proposal)) && e.writer)
        .map((e) => ({
          id: e.writer!.id,
          name: e.writer!.name,
          email: e.writer!.email,
          institution: e.writer!.institution,
          designation: e.writer!.designation,
          expertise: e.writer!.expertise || [],
          proposal: e.proposal,
        })),
    [engagements]
  );

  const term = search.toLowerCase();
  const interestedShown = term
    ? interested.filter((c) => [c.name, c.email, c.institution, ...c.expertise].some((v) => v?.toLowerCase().includes(term)))
    : interested;
  const interestedIds = new Set(interested.map((c) => c.id));
  const others: Candidate[] = (writersQuery.data?.data || [])
    .filter((w) => !interestedIds.has(w.id))
    .map((w) => ({
      id: w.id,
      name: writerDisplayName(w),
      email: w.email,
      institution: w.institution,
      designation: w.writerProfile?.designation,
      expertise: w.writerProfile?.expertise || [],
      active: w.stats?.active,
      completed: w.stats?.completed,
    }));

  const allCandidates = [...interested, ...others];
  const selected = allCandidates.find((c) => c.id === writerId);

  // Prefill terms from the writer's proposal, or from a pending offer being revised.
  useEffect(() => {
    if (!writerId || prefilledFor === writerId || !engagementsQuery.data) return;
    const eng = engagements.find((e) => e.writerId === writerId || e.writer?.id === writerId);
    if (eng?.stage === "OFFERED" && eng.offer) {
      setFee(String(eng.offer.fee));
      setCurrency(eng.offer.currency || "INR");
      setDeadline(toLocalInputValue(new Date(eng.offer.deadline)));
      setPerDay(String(eng.offer.penaltyPerDayPct));
      setMaxPct(String(eng.offer.maxPenaltyPct));
      setNotes(eng.offer.notes || "");
    } else if (eng?.proposal) {
      if (eng.proposal.fee) setFee(String(eng.proposal.fee));
      if (eng.proposal.currency) setCurrency(eng.proposal.currency);
      if (eng.proposal.days) setDeadline(toLocalInputValue(daysFromNow(eng.proposal.days)));
    }
    setPrefilledFor(writerId);
  }, [writerId, prefilledFor, engagementsQuery.data, engagements]);

  /* ------------------------------ validation ------------------------------ */

  const feeNum = Number(fee);
  const perDayNum = perDay === "" ? 5 : Number(perDay);
  const maxNum = maxPct === "" ? 50 : Number(maxPct);
  const deadlineDate = deadline ? new Date(deadline) : null;
  const errors = {
    writer: !writerId ? "Choose a writer." : undefined,
    fee: !(Number.isFinite(feeNum) && feeNum > 0) ? "Enter an agreed fee greater than zero." : undefined,
    deadline:
      !deadlineDate || Number.isNaN(deadlineDate.getTime())
        ? "Choose a deadline."
        : deadlineDate.getTime() <= Date.now()
          ? "The deadline must be in the future."
          : undefined,
    perDay: !(perDayNum >= 0 && perDayNum <= 100) ? "Enter a percentage between 0 and 100." : undefined,
    maxPct: !(maxNum >= 0 && maxNum <= 100) ? "Enter a percentage between 0 and 100." : undefined,
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const holderConflict = holder && holder.writerId !== writerId && holder.writer?.id !== writerId ? holder : undefined;
  const holderLocked = holder && !holderConflict && holder.stage !== "OFFERED";
  const revising = holder && !holderConflict && holder.stage === "OFFERED";

  const mutation = useMutation({
    mutationFn: () =>
      adminAssignWriter(requestId, {
        writerId,
        fee: Math.round(feeNum),
        currency,
        deadline: deadlineDate!.toISOString(),
        penaltyPerDayPct: perDayNum,
        maxPenaltyPct: maxNum,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (eng) => {
      invalidateWriterData(queryClient, { requestId, writerId, engagementId: eng?._id });
      notify(
        "success",
        `${revising ? "Revised offer" : "Offer"} sent to ${selected?.name || "the writer"}. The request is hidden from other writers while they decide.`
      );
      onClose();
    },
    onError: (err) => notify("error", getErrorMessage(err, "The offer could not be sent.")),
  });

  const submit = () => {
    setSubmitted(true);
    if (hasErrors || holderConflict || holderLocked) return;
    mutation.mutate();
  };

  const exampleFee = feeNum > 0 ? feeNum : 10000;
  const exampleDays = 2;
  const examplePct = Math.min(maxNum, perDayNum * exampleDays);

  const renderCandidate = (c: Candidate) => {
    const checked = c.id === writerId;
    return (
      <li key={c.id}>
        <label className={`choice ${checked ? "choice-active" : ""}`}>
          <input
            type="radio"
            name="assign-writer"
            className="mt-1 h-4 w-4 shrink-0 border-slate-300 text-navy-700 focus:ring-navy-500"
            checked={checked}
            onChange={() => setWriterId(c.id)}
          />
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold text-navy-900">{c.name}</span>
              {c.active !== undefined && (
                <span className="text-[11px] text-slate-500">
                  {c.active} active · {c.completed || 0} completed
                </span>
              )}
            </span>
            <span className="block text-xs text-slate-500">
              {[c.designation, c.institution].filter(Boolean).join(", ") || c.email}
            </span>
            <ExpertiseChips items={c.expertise} max={5} />
            {c.proposal && (c.proposal.fee || c.proposal.days || c.proposal.note) && (
              <span className="block rounded-md bg-sky-50 px-2.5 py-1.5 text-xs text-sky-900">
                Proposal: {c.proposal.fee ? formatMoney(c.proposal.fee, c.proposal.currency || "INR") : "fee not stated"}
                {c.proposal.days ? ` in ${c.proposal.days} day${c.proposal.days === 1 ? "" : "s"}` : ""}
                {c.proposal.note && <span className="mt-0.5 block whitespace-pre-wrap break-words text-sky-800">{c.proposal.note}</span>}
              </span>
            )}
          </span>
        </label>
      </li>
    );
  };

  return (
    <StackedModal
      onClose={() => !mutation.isPending && onClose()}
      size="lg"
      title={revising ? "Revise offer" : "Assign a writer"}
      subtitle={refNumber ? `Request ${refNumber}` : undefined}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <button
            type="submit"
            form="assign-writer-form"
            className="btn-primary btn-sm"
            disabled={mutation.isPending || Boolean(holderConflict) || Boolean(holderLocked)}
          >
            {mutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
            {revising ? "Send revised offer" : "Send offer"}
          </button>
        </>
      }
    >
      <form id="assign-writer-form" noValidate className="space-y-5" onSubmit={onFormSubmit(submit)}>
        <div className="alert-info" role="note">
          <EyeOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            The customer never sees who writes their paper. The writer sees an anonymised brief, and nothing they submit reaches
            the customer until you approve it.
          </p>
        </div>

        {holderConflict && (
          <div className="alert-warning" role="alert">
            <p>
              {holderConflict.writer?.name || "Another writer"} currently holds this request ({holderConflict.stage === "OFFERED" ? "offer pending" : "work in progress"}).
              Cancel that assignment before offering it to someone else.
            </p>
          </div>
        )}
        {holderLocked && (
          <div className="alert-warning" role="alert">
            <p>This writer has already accepted the work, so the terms can no longer be changed here.</p>
          </div>
        )}
        {revising && (
          <div className="alert-warning" role="note">
            <p>This writer has not responded yet. Sending again replaces the pending offer with the terms below.</p>
          </div>
        )}

        {/* ---------------------------- writer picker ---------------------------- */}
        <fieldset>
          <legend className="label label-required">Writer</legend>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search approved writers"
              placeholder="Search name, institution or expertise"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className="input pl-9 pr-9"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-navy-900"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto rounded-md border border-slate-200 p-2" aria-busy={writersQuery.isFetching}>
            {engagementsQuery.isLoading || writersQuery.isLoading ? (
              <div className="space-y-2" role="status" aria-label="Loading writers">
                <div className="skeleton h-16 w-full" />
                <div className="skeleton h-16 w-full" />
              </div>
            ) : writersQuery.isError ? (
              <p className="px-2 py-3 text-sm text-red-700">{getErrorMessage(writersQuery.error, "Writers could not be loaded.")}</p>
            ) : (
              <>
                {interestedShown.length > 0 && (
                  <div>
                    <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Expressed interest</p>
                    <ul className="space-y-2">{interestedShown.map(renderCandidate)}</ul>
                  </div>
                )}
                {others.length > 0 && (
                  <div>
                    <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {interestedShown.length > 0 ? "Other approved writers" : "Approved writers"}
                    </p>
                    <ul className="space-y-2">{others.map(renderCandidate)}</ul>
                  </div>
                )}
                {interestedShown.length === 0 && others.length === 0 && (
                  <p className="px-2 py-3 text-sm text-slate-500">
                    {search ? "No approved writers match this search." : "There are no approved writers yet. Approve an application or create a writer login first."}
                  </p>
                )}
              </>
            )}
          </div>
          {submitted && errors.writer && <p className="error-text">{errors.writer}</p>}
        </fieldset>

        {/* ------------------------------- terms -------------------------------- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
          <Field label="Agreed fee" required help="Paid to the writer after approval, less any late penalty." error={submitted ? errors.fee : undefined}>
            {(id, describedBy) => (
              <input
                id={id}
                aria-describedby={describedBy}
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                className={`input ${submitted && errors.fee ? "input-error" : ""}`}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
              />
            )}
          </Field>
          <Field label="Currency">
            {(id) => (
              <select id={id} className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Field
          label="Deadline"
          required
          help="Date and time in your local time zone. Late days are counted from this moment."
          error={submitted ? errors.deadline : undefined}
        >
          {(id, describedBy) => (
            <div className="space-y-2">
              <input
                id={id}
                aria-describedby={describedBy}
                type="datetime-local"
                min={toLocalInputValue(new Date())}
                className={`input ${submitted && errors.deadline ? "input-error" : ""}`}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick deadline">
                {QUICK_DAYS.map((d) => (
                  <button key={d} type="button" className="btn-secondary btn-sm" onClick={() => setDeadline(toLocalInputValue(daysFromNow(d)))}>
                    +{d} days
                  </button>
                ))}
                {selected?.proposal?.days ? (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => setDeadline(toLocalInputValue(daysFromNow(selected.proposal!.days!)))}
                  >
                    Writer's proposal ({selected.proposal.days} days)
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Late penalty per day (%)" error={submitted ? errors.perDay : undefined}>
            {(id, describedBy) => (
              <input
                id={id}
                aria-describedby={describedBy}
                type="number"
                min="0"
                max="100"
                step="0.5"
                inputMode="decimal"
                className="input"
                value={perDay}
                onChange={(e) => setPerDay(e.target.value)}
              />
            )}
          </Field>
          <Field label="Maximum penalty (%)" error={submitted ? errors.maxPct : undefined}>
            {(id, describedBy) => (
              <input
                id={id}
                aria-describedby={describedBy}
                type="number"
                min="0"
                max="100"
                step="1"
                inputMode="decimal"
                className="input"
                value={maxPct}
                onChange={(e) => setMaxPct(e.target.value)}
              />
            )}
          </Field>
        </div>
        {!errors.perDay && !errors.maxPct && (
          <p className="panel-muted px-3 py-2 text-sm text-slate-700" aria-live="polite">
            {perDayNum === 0 || maxNum === 0 ? (
              "No late penalty applies to this assignment."
            ) : (
              <>
                For every day (or part of a day) the paper arrives after the deadline, the fee is reduced by {perDayNum}%, up to a
                maximum of {maxNum}%. For example, {exampleDays} days late on {formatMoney(exampleFee, currency)} deducts{" "}
                {formatMoney(Math.round((exampleFee * examplePct) / 100), currency)}. Lateness is measured at the submission you approve.
              </>
            )}
          </p>
        )}

        <Field label="Notes for the writer" help="Optional. Scope, expectations or anything agreed in the conversation.">
          {(id, describedBy) => (
            <textarea
              id={id}
              aria-describedby={describedBy}
              rows={3}
              maxLength={2000}
              className="input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>

        <p className="muted">
          The writer must accept the offer before work starts. If they decline, the request re-opens to other writers.
        </p>
      </form>
    </StackedModal>
  );
};
