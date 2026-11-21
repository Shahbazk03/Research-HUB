import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Download, FileText, Paperclip, Send, Upload, XCircle } from "lucide-react";
import { getErrorMessage, uploadFile } from "../../api";
import { safeHref } from "../../api/types";
import {
  Engagement,
  WriterBrief,
  formatMoney,
  getMyEngagement,
  respondToOffer,
  sendWriterMessage,
  submitWork,
  withdrawInterest,
} from "../../api/writers";
import { ErrorState, Field, Modal, Spinner } from "../ui";
import { DeadlineText, Fact, StageBadge } from "./WriterBits";
import {
  DEADLINE_STAGES,
  describePenaltyRule,
  formatBytes,
  formatDate,
  formatDateTime,
  formatLooseDate,
  humanizeKey,
  isClosedStage,
  isFileLike,
  requirementText,
  serviceName,
  useNow,
  writerRetry,
} from "./writerHelpers";

type Apply = (updated: Engagement) => void;

const SectionCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string; action?: React.ReactNode }> = ({
  title,
  icon,
  children,
  className = "",
  action,
}) => (
  <section className={`rounded-lg border border-slate-200 bg-white ${className}`}>
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
        {icon && <span className="text-slate-400">{icon}</span>}
        {title}
      </h3>
      {action}
    </div>
    <div className="px-4 py-4">{children}</div>
  </section>
);

/* -------------------------------------------------------------------------- */
/* Stage banner                                                               */
/* -------------------------------------------------------------------------- */

const StageBanner: React.FC<{ e: Engagement }> = ({ e }) => {
  const map: Partial<Record<Engagement["stage"], { cls: string; text: string }>> = {
    INTERESTED: { cls: "alert-info", text: "Your proposal has been sent. The Research Hub team will reply here, and may send you a formal offer." },
    OFFERED: { cls: "alert-warning", text: "You have received an offer. Review the terms below, then accept or decline." },
    ACCEPTED: { cls: "alert-info", text: "You accepted this project. The full brief and reference files are below. Upload your work before the deadline." },
    SUBMITTED: { cls: "alert-info", text: "Your work has been submitted and is being reviewed by our team." },
    CHANGES_REQUESTED: { cls: "alert-warning", text: "Our team has requested changes. Read the review notes and upload a revised file." },
    APPROVED: { cls: "alert-success", text: "Your work has been approved. Payouts are handled by the Research Hub team." },
    DECLINED: { cls: "alert-info", text: `You declined this offer.${e.closedReason ? ` Reason: ${e.closedReason}` : ""}` },
    WITHDRAWN: { cls: "alert-info", text: "You withdrew your interest in this project." },
    NOT_SELECTED: { cls: "alert-info", text: "This project has been given to another writer. Thank you for your interest." },
    CANCELLED: { cls: "alert-error", text: `This engagement was cancelled.${e.closedReason ? ` Reason: ${e.closedReason}` : ""}` },
  };
  const item = map[e.stage];
  return item ? (
    <div className={item.cls} role="status">
      {item.text}
    </div>
  ) : null;
};

/* -------------------------------------------------------------------------- */
/* Brief                                                                      */
/* -------------------------------------------------------------------------- */

const personLine = (p?: { name?: string; designation?: string }) => (p?.name ? [p.name, p.designation].filter(Boolean).join(", ") : undefined);

const BriefSection: React.FC<{ brief: WriterBrief; full: boolean }> = ({ brief, full }) => {
  const requirements = Object.entries(brief.requirements || {})
    .map(([k, v]) => {
      const hasFile = isFileLike(v) || (Array.isArray(v) && v.some(isFileLike));
      return { key: k, label: humanizeKey(k), value: v, hasFile, text: requirementText(v) };
    })
    .filter((r) => r.text);
  const files = (brief.referenceFiles || []).filter((f) => safeHref(f.url));
  const a = brief.authors;
  const coAuthors = (a?.coAuthors || []).map(personLine).filter(Boolean) as string[];

  const renderFileValue = (v: unknown): React.ReactNode => {
    if (isFileLike(v)) {
      const href = full ? safeHref(v.url) : undefined;
      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className="link">
          {v.name || "View file"}
        </a>
      ) : (
        <span className="text-slate-500">{v.name || "File"} (shared after acceptance)</span>
      );
    }
    if (Array.isArray(v)) return v.map((x, i) => <span key={i} className="mr-2 inline-block">{renderFileValue(x)}</span>);
    return requirementText(v);
  };

  return (
    <SectionCard title="Project brief" icon={<FileText className="h-4 w-4" />}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Fact label="Service">{brief.service?.name || "—"}</Fact>
        {brief.discipline && <Fact label="Discipline">{brief.discipline}</Fact>}
        {brief.academicLevel && <Fact label="Academic level">{brief.academicLevel}</Fact>}
        {brief.publicationType && <Fact label="Publication type">{brief.publicationType}</Fact>}
        {brief.targetJournal && <Fact label="Target journal">{brief.targetJournal}</Fact>}
        {brief.indexingRequirement && <Fact label="Indexing">{brief.indexingRequirement}</Fact>}
        {brief.citationStyle && <Fact label="Citation style">{brief.citationStyle}</Fact>}
        {brief.wordCount ? <Fact label="Word count">{brief.wordCount.toLocaleString()}</Fact> : null}
        {brief.customerDeadline && <Fact label="Client's deadline">{formatLooseDate(brief.customerDeadline)}</Fact>}
      </dl>

      {brief.brief && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
          <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-700">{brief.brief}</p>
        </div>
      )}

      {requirements.length > 0 && (
        <dl className="mt-4 divide-y divide-slate-100 rounded-md border border-slate-200">
          {requirements.map((r) => (
            <div key={r.key} className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-[180px_1fr] sm:gap-4">
              <dt className="text-sm text-slate-500">{r.label}</dt>
              <dd className="min-w-0 break-words text-sm text-slate-800">{r.hasFile ? renderFileValue(r.value) : r.text}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference files</p>
        {full ? (
          files.length ? (
            <ul className="mt-2 space-y-1.5">
              {files.map((f, i) => (
                <li key={`${f.url}-${i}`}>
                  <a href={safeHref(f.url)} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5 break-all text-sm">
                    <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {f.name || `File ${i + 1}`}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-slate-500">No reference files were provided.</p>
          )
        ) : (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
            <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
            {brief.attachmentCount
              ? `${brief.attachmentCount} file${brief.attachmentCount === 1 ? "" : "s"} — shared once you accept an offer.`
              : "None attached."}
          </p>
        )}
      </div>

      {full && a && (personLine(a.correspondingAuthor) || personLine(a.supervisor) || coAuthors.length > 0 || a.university) && (
        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Authors</p>
          <dl className="mt-2 grid gap-3 sm:grid-cols-2">
            {personLine(a.correspondingAuthor) && <Fact label="Corresponding author">{personLine(a.correspondingAuthor)}</Fact>}
            {personLine(a.supervisor) && <Fact label="Supervisor">{personLine(a.supervisor)}</Fact>}
            {coAuthors.length > 0 && <Fact label="Co-authors">{coAuthors.join("; ")}</Fact>}
            {(a.university || a.department) && <Fact label="Affiliation">{[a.department, a.university].filter(Boolean).join(", ")}</Fact>}
          </dl>
        </div>
      )}
    </SectionCard>
  );
};

/* -------------------------------------------------------------------------- */
/* Offer                                                                      */
/* -------------------------------------------------------------------------- */

const OfferCard: React.FC<{ e: Engagement; now: number; apply: Apply }> = ({ e, now, apply }) => {
  const offer = e.offer!;
  const [mode, setMode] = useState<"idle" | "accept" | "decline">("idle");
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rule = describePenaltyRule(offer.penaltyPerDayPct, offer.maxPenaltyPct);

  const respond = async (action: "ACCEPT" | "DECLINE") => {
    setBusy(true);
    setError("");
    try {
      apply(await respondToOffer(e._id, action, action === "DECLINE" ? reason.trim() || undefined : undefined));
      setMode("idle");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const isOpen = e.stage === "OFFERED";

  return (
    <SectionCard
      title="Offer terms"
      className={isOpen ? "border-accent-300 ring-1 ring-accent-200" : ""}
      action={e.acceptedAt ? <span className="text-xs text-slate-500">Accepted {formatDateTime(e.acceptedAt)}</span> : undefined}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label="Fee">
          <span className="font-serif text-xl font-semibold text-navy-900">{formatMoney(offer.fee, offer.currency)}</span>
        </Fact>
        <Fact label="Deadline">
          <span className="block">{formatDateTime(offer.deadline)}</span>
          {DEADLINE_STAGES.includes(e.stage) && <DeadlineText deadline={offer.deadline} now={now} className="mt-0.5" />}
        </Fact>
        <Fact label="Late delivery" className="col-span-2">
          {rule}
        </Fact>
        {offer.notes && (
          <Fact label="Notes from our team" className="col-span-2">
            <span className="whitespace-pre-line">{offer.notes}</span>
          </Fact>
        )}
      </dl>

      {isOpen && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          {mode === "idle" && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-primary" onClick={() => { setMode("accept"); setAgree(false); setError(""); }}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Accept offer
              </button>
              <button type="button" className="btn-danger-outline" onClick={() => { setMode("decline"); setError(""); }}>
                <XCircle className="h-4 w-4" aria-hidden="true" /> Decline
              </button>
            </div>
          )}

          {mode === "accept" && (
            <div className="panel-muted space-y-3 p-4">
              <p className="text-sm font-semibold text-navy-900">Confirm acceptance</p>
              <label className="flex items-start gap-3 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-navy-900" checked={agree} onChange={(ev) => setAgree(ev.target.checked)} />
                <span>
                  I agree to deliver the complete work for {formatMoney(offer.fee, offer.currency)} by <strong>{formatDateTime(offer.deadline)}</strong>, and I
                  accept the late-delivery terms: {rule.charAt(0).toLowerCase() + rule.slice(1)}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary btn-sm" disabled={!agree || busy} onClick={() => respond("ACCEPT")}>
                  {busy && <Spinner className="h-3.5 w-3.5" />} Confirm and accept
                </button>
                <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => setMode("idle")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {mode === "decline" && (
            <div className="panel-muted space-y-3 p-4">
              <Field label="Reason for declining" help="Optional. Helps our team send better-matched offers.">
                {(id, d) => (
                  <textarea id={id} aria-describedby={d} rows={3} maxLength={1000} className="input" value={reason} onChange={(ev) => setReason(ev.target.value)} />
                )}
              </Field>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-danger-outline btn-sm" disabled={busy} onClick={() => respond("DECLINE")}>
                  {busy && <Spinner className="h-3.5 w-3.5" />} Decline offer
                </button>
                <button type="button" className="btn-ghost btn-sm" disabled={busy} onClick={() => setMode("idle")}>
                  Back
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
};

const PenaltyAlert: React.FC<{ e: Engagement }> = ({ e }) => {
  const p = e.penalty;
  if (!p?.isLate || p.penaltyAmount <= 0 || !e.offer) return null;
  const running = e.stage === "ACCEPTED" || e.stage === "CHANGES_REQUESTED";
  return (
    <div className="alert-error" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">
          {running ? "This project is overdue" : "Delivered late"} — {p.lateDays} day{p.lateDays === 1 ? "" : "s"}
        </p>
        <p className="mt-0.5">
          Penalty {p.penaltyPct}% ({formatMoney(p.penaltyAmount, e.offer.currency)}). Payable now: {formatMoney(p.payableAmount, e.offer.currency)}.
          {running && " The penalty grows for each further day until you submit."}
        </p>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Submission                                                                 */
/* -------------------------------------------------------------------------- */

const SUBMISSION_EXT = /\.(docx?|pdf|zip)$/i;

const SubmitWork: React.FC<{ e: Engagement; apply: Apply }> = ({ e, apply }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"idle" | "uploading" | "submitting">("idle");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const pick = (f: File | null) => {
    setError("");
    setDone(false);
    if (!f) return setFile(null);
    if (!SUBMISSION_EXT.test(f.name)) {
      setFile(null);
      setError("Please choose a Word (.doc, .docx), PDF or ZIP file.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("Files must be 10 MB or smaller. Compress the file or split it into a ZIP.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError("");
    try {
      setPhase("uploading");
      const uploaded = await uploadFile(file, "writer-submissions");
      setPhase("submitting");
      apply(await submitWork(e._id, { fileName: file.name, fileUrl: uploaded.url, fileSize: file.size, note: note.trim() || undefined }));
      setFile(null);
      setNote("");
      setDone(true);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed. Please try again."));
    } finally {
      setPhase("idle");
    }
  };

  const busy = phase !== "idle";
  const revision = e.stage === "CHANGES_REQUESTED";

  return (
    <SectionCard title={revision ? "Upload revised work" : "Submit your work"} icon={<Upload className="h-4 w-4" />}>
      <div className="space-y-3">
        <Field label="File" required help="Word (.doc, .docx), PDF or ZIP — up to 10 MB.">
          {(id, d) => (
            <input
              ref={inputRef}
              id={id}
              aria-describedby={d}
              type="file"
              accept=".doc,.docx,.pdf,.zip"
              disabled={busy}
              onChange={(ev) => pick(ev.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-navy-900 hover:file:bg-navy-50"
            />
          )}
        </Field>
        {file && (
          <p className="text-xs text-slate-600">
            Selected: <span className="font-medium">{file.name}</span> ({formatBytes(file.size)})
          </p>
        )}
        <Field label="Note for the reviewer" help="Optional. Anything the reviewer should know.">
          {(id, d) => (
            <textarea id={id} aria-describedby={d} rows={3} maxLength={3000} className="input" value={note} onChange={(ev) => setNote(ev.target.value)} disabled={busy} />
          )}
        </Field>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        {done && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700" role="status">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Your work has been submitted for review.
          </p>
        )}
        <button type="button" className="btn-primary" onClick={submit} disabled={busy || !file}>
          {busy && <Spinner />}
          {phase === "uploading" ? "Uploading…" : phase === "submitting" ? "Submitting…" : revision ? "Upload revision" : "Upload and submit"}
        </button>
      </div>
    </SectionCard>
  );
};

const SubmissionHistory: React.FC<{ e: Engagement }> = ({ e }) => {
  if (!e.submissions?.length) return null;
  const items = [...e.submissions].reverse();
  return (
    <SectionCard title="Submission history" icon={<FileText className="h-4 w-4" />}>
      <ol className="space-y-3">
        {items.map((s, i) => {
          const href = safeHref(s.fileUrl);
          return (
            <li key={s._id || `${s.submittedAt}-${i}`} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">
                    Version {items.length - i} · {formatDateTime(s.submittedAt)}
                    {s.fileSize ? ` · ${formatBytes(s.fileSize)}` : ""}
                  </p>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="link mt-0.5 inline-flex items-center gap-1.5 break-all text-sm">
                      <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {s.fileName}
                    </a>
                  ) : (
                    <p className="mt-0.5 break-all text-sm font-medium text-navy-900">{s.fileName}</p>
                  )}
                </div>
                {s.review ? (
                  <span className={s.review.decision === "APPROVED" ? "badge-success" : "badge-warning"}>
                    {s.review.decision === "APPROVED" ? "Approved" : "Changes requested"}
                  </span>
                ) : (
                  <span className="badge-info">Awaiting review</span>
                )}
              </div>
              {s.note && <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-600">Your note: {s.note}</p>}
              {s.review && (s.review.notes || s.review.reviewedAt) && (
                <div className={`mt-2 rounded-md px-3 py-2 text-sm ${s.review.decision === "APPROVED" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                  <p className="text-xs font-medium opacity-80">
                    Review{s.review.reviewerName ? ` by ${s.review.reviewerName}` : ""} · {formatDateTime(s.review.reviewedAt)}
                  </p>
                  {s.review.notes && <p className="mt-1 whitespace-pre-line break-words">{s.review.notes}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
};

const PayoutCard: React.FC<{ e: Engagement }> = ({ e }) => {
  if (e.stage !== "APPROVED" || !e.offer) return null;
  const penalty = e.payout?.penaltyAmount ?? e.penalty?.penaltyAmount ?? 0;
  const payable = e.payout?.payableAmount ?? e.penalty?.payableAmount ?? e.offer.fee;
  const cur = e.offer.currency;
  return (
    <SectionCard
      title="Payout"
      action={
        e.payout?.status === "PAID" ? <span className="badge-success">Paid {formatDate(e.payout.paidAt)}</span> : <span className="badge-warning">Payment pending</span>
      }
    >
      <dl className="grid grid-cols-3 gap-3">
        <Fact label="Fee">{formatMoney(e.offer.fee, cur)}</Fact>
        <Fact label="Penalty">{penalty ? `− ${formatMoney(penalty, cur)}` : "None"}</Fact>
        <Fact label="Payable">
          <span className="font-semibold text-navy-900">{formatMoney(payable, cur)}</span>
        </Fact>
      </dl>
      {e.payout?.note && <p className="mt-3 text-sm text-slate-600">{e.payout.note}</p>}
      <p className="mt-3 text-xs text-slate-500">Payouts are processed by the Research Hub team. Contact support with any payment questions.</p>
    </SectionCard>
  );
};

/* -------------------------------------------------------------------------- */
/* Conversation                                                               */
/* -------------------------------------------------------------------------- */

const Conversation: React.FC<{ e: Engagement; apply: Apply }> = ({ e, apply }) => {
  const [text, setText] = useState("");
  const [withTerms, setWithTerms] = useState(false);
  const [fee, setFee] = useState("");
  const [days, setDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const closed = isClosedStage(e.stage);
  const canPropose = ["INTERESTED", "OFFERED"].includes(e.stage);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [e.messages?.length]);

  const send = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const payload: { text?: string; proposedFee?: number; proposedDays?: number } = {};
    if (text.trim()) payload.text = text.trim();
    if (withTerms && canPropose) {
      if (fee.trim()) {
        const n = Number(fee);
        if (!(n > 0)) return setError("Enter a fee greater than zero.");
        payload.proposedFee = Math.round(n);
      }
      if (days.trim()) {
        const n = Number(days);
        if (!Number.isInteger(n) || n < 1 || n > 365) return setError("Days must be a whole number between 1 and 365.");
        payload.proposedDays = n;
      }
    }
    if (!payload.text && payload.proposedFee === undefined && payload.proposedDays === undefined) {
      return setError("Write a message or propose new terms.");
    }
    setBusy(true);
    setError("");
    try {
      apply(await sendWriterMessage(e._id, payload));
      setText("");
      setFee("");
      setDays("");
      setWithTerms(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const messages = e.messages || [];

  return (
    <SectionCard title="Conversation with Research Hub" className="flex flex-col">
      <div className="max-h-[26rem] min-h-[8rem] space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No messages yet.</p>}
        {messages.map((m, i) => {
          const mine = m.from === "WRITER";
          return (
            <div key={m._id || i} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-lg px-3 py-2 text-sm ${
                  mine ? "rounded-br-sm bg-navy-50 text-navy-900 ring-1 ring-inset ring-navy-100" : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <p className="text-[11px] font-medium text-slate-500">
                  {mine ? "You" : m.authorName ? `${m.authorName} · Research Hub` : "Research Hub team"} · {formatDateTime(m.createdAt)}
                </p>
                {m.text && <p className="mt-1 whitespace-pre-line break-words">{m.text}</p>}
                {(m.proposedFee != null || m.proposedDays != null) && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.proposedFee != null && <span className="badge-accent">Fee {formatMoney(m.proposedFee)}</span>}
                    {m.proposedDays != null && <span className="badge-accent">{m.proposedDays} days</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {closed ? (
        <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-500">This conversation is closed.</p>
      ) : (
        <form onSubmit={send} className="mt-4 space-y-3 border-t border-slate-100 pt-4" noValidate>
          <label htmlFor={`msg-${e._id}`} className="sr-only">
            Message
          </label>
          <textarea
            id={`msg-${e._id}`}
            rows={3}
            maxLength={3000}
            className="input"
            placeholder="Write a message to the Research Hub team…"
            value={text}
            onChange={(ev) => setText(ev.target.value)}
            disabled={busy}
          />
          {canPropose && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" className="h-4 w-4 accent-navy-900" checked={withTerms} onChange={(ev) => setWithTerms(ev.target.checked)} />
              Include a counter-proposal
            </label>
          )}
          {withTerms && canPropose && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fee (₹)">
                {(id) => (
                  <input id={id} type="number" inputMode="numeric" min={1} className="input" value={fee} onChange={(ev) => setFee(ev.target.value)} disabled={busy} />
                )}
              </Field>
              <Field label="Days">
                {(id) => (
                  <input id={id} type="number" inputMode="numeric" min={1} max={365} className="input" value={days} onChange={(ev) => setDays(ev.target.value)} disabled={busy} />
                )}
              </Field>
            </div>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <button type="submit" className="btn-primary btn-sm" disabled={busy}>
              {busy ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" aria-hidden="true" />}
              Send
            </button>
          </div>
        </form>
      )}
    </SectionCard>
  );
};

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export const EngagementDetailModal: React.FC<{ engagementId: string | null; onClose: () => void }> = ({ engagementId, onClose }) => {
  const queryClient = useQueryClient();
  const now = useNow(30_000);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  useEffect(() => {
    setConfirmWithdraw(false);
    setWithdrawError("");
  }, [engagementId]);

  const query = useQuery({
    queryKey: ["writer-engagement", engagementId],
    queryFn: () => getMyEngagement(engagementId!),
    enabled: Boolean(engagementId),
    retry: writerRetry,
    placeholderData: () => queryClient.getQueryData<Engagement[]>(["writer-engagements"])?.find((x) => x._id === engagementId),
  });

  const apply: Apply = (updated) => {
    queryClient.setQueryData(["writer-engagement", updated._id], updated);
    queryClient.invalidateQueries({ queryKey: ["writer-engagements"] });
    queryClient.invalidateQueries({ queryKey: ["writer-open-briefs"] });
    queryClient.invalidateQueries({ queryKey: ["writer-earnings"] });
  };

  const e = query.data;
  // The list view carries a partial brief; wait for the full record before showing brief details
  // (If that fetch fails, react-query drops the placeholder and the error state below is shown.)
  const loadingFull = query.isPlaceholderData;
  const fullAccess = Boolean(e && ["ACCEPTED", "SUBMITTED", "CHANGES_REQUESTED", "APPROVED"].includes(e.stage));

  const withdraw = async () => {
    if (!e) return;
    setWithdrawing(true);
    setWithdrawError("");
    try {
      apply(await withdrawInterest(e._id));
      setConfirmWithdraw(false);
    } catch (err) {
      setWithdrawError(getErrorMessage(err));
    } finally {
      setWithdrawing(false);
    }
  };

  const footer = (
    <>
      {withdrawError && (
        <p className="error-text mr-auto self-center" role="alert">
          {withdrawError}
        </p>
      )}
      {e?.stage === "INTERESTED" &&
        (confirmWithdraw ? (
          <>
            <span className="self-center text-sm text-slate-600">Withdraw your interest?</span>
            <button type="button" className="btn-danger-outline btn-sm" onClick={withdraw} disabled={withdrawing}>
              {withdrawing && <Spinner className="h-3.5 w-3.5" />} Yes, withdraw
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setConfirmWithdraw(false)} disabled={withdrawing}>
              Keep
            </button>
          </>
        ) : (
          <button type="button" className="btn-danger-outline btn-sm" onClick={() => setConfirmWithdraw(true)}>
            Withdraw interest
          </button>
        ))}
      <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
        Close
      </button>
    </>
  );

  return (
    <Modal
      open={Boolean(engagementId)}
      onClose={onClose}
      size="xl"
      title={e ? serviceName(e) : "Project"}
      subtitle={
        e ? (
          <span className="flex flex-wrap items-center gap-2">
            {e.brief?.requestNumber && <span className="font-mono text-xs">{e.brief.requestNumber}</span>}
            <StageBadge stage={e.stage} />
          </span>
        ) : undefined
      }
      footer={footer}
    >
      {!e && query.isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading project">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-40 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      ) : !e ? (
        <ErrorState title="We couldn't load this project" message={getErrorMessage(query.error)} onRetry={() => query.refetch()} />
      ) : (
        <div className="space-y-4">
          <StageBanner e={e} />
          <PenaltyAlert e={e} />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
            <div className="min-w-0 space-y-4">
              {e.offer && <OfferCard key={`${e._id}-${e.offer.offeredAt}`} e={e} now={now} apply={apply} />}
              {!e.offer && e.proposal && (
                <SectionCard title="Your proposal">
                  <dl className="grid grid-cols-2 gap-3">
                    <Fact label="Fee">{formatMoney(e.proposal.fee, e.proposal.currency)}</Fact>
                    <Fact label="Time needed">{e.proposal.days ? `${e.proposal.days} days` : "—"}</Fact>
                    {e.proposal.note && (
                      <Fact label="Note" className="col-span-2">
                        <span className="whitespace-pre-line">{e.proposal.note}</span>
                      </Fact>
                    )}
                  </dl>
                </SectionCard>
              )}
              <PayoutCard e={e} />
              {(e.stage === "ACCEPTED" || e.stage === "CHANGES_REQUESTED") && <SubmitWork key={e._id} e={e} apply={apply} />}
              <SubmissionHistory e={e} />
              {loadingFull ? (
                <div className="skeleton h-48 w-full" aria-hidden="true" />
              ) : e.brief ? (
                <BriefSection brief={e.brief} full={fullAccess} />
              ) : (
                <p className="panel-muted px-4 py-3 text-sm text-slate-500">The brief for this project is no longer available.</p>
              )}
            </div>
            <div className="min-w-0">
              <div className="lg:sticky lg:top-0">
                <Conversation key={e._id} e={e} apply={apply} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
