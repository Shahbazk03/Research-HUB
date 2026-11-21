import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, FileCheck, FileText, Paperclip, RefreshCw, Send, X, XCircle } from "lucide-react";
import { getErrorMessage, respondCustomerRequest, uploadFile } from "../../api";
import { RequestActivity, ServiceRequest, STATUS_LABELS, safeHref } from "../../api/types";
import { Spinner } from "../ui";
import { formatDateTime } from "./requestHelpers";

export const ACCEPTED_FILE_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp";
const MAX_ATTACHMENTS = 5;
const MAX_MESSAGE = 5000;

type Attachment = { name: string; url: string };

const FileLinks: React.FC<{ files?: Attachment[] }> = ({ files }) => {
  const safe = (files || []).filter((f) => safeHref(f.url));
  if (!safe.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {safe.map((f, i) => (
        <li key={`${f.url}-${i}`} className="min-w-0 max-w-full">
          <a
            href={safeHref(f.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-navy-700 hover:border-navy-300 hover:bg-navy-50"
          >
            <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{f.name || "Attachment"}</span>
          </a>
        </li>
      ))}
    </ul>
  );
};

const eventMeta = (a: RequestActivity): { title: string; icon: React.ReactNode; tone: string } => {
  switch (a.type) {
    case "CREATED":
      return { title: "Request submitted", icon: <FileText className="h-3.5 w-3.5" />, tone: "bg-navy-50 text-navy-700" };
    case "STATUS":
      return {
        title: a.status ? `Status changed to ${STATUS_LABELS[a.status] || a.status}` : "Status updated",
        icon: <RefreshCw className="h-3.5 w-3.5" />,
        tone: "bg-slate-100 text-slate-600",
      };
    case "QUOTATION":
      return { title: "Quotation issued", icon: <CreditCard className="h-3.5 w-3.5" />, tone: "bg-accent-50 text-accent-700" };
    case "PAYMENT_SUBMITTED":
      return { title: "Payment details submitted", icon: <CreditCard className="h-3.5 w-3.5" />, tone: "bg-sky-50 text-sky-700" };
    case "PAYMENT_VERIFIED":
      return { title: "Payment verified", icon: <CheckCircle2 className="h-3.5 w-3.5" />, tone: "bg-emerald-50 text-emerald-700" };
    case "PAYMENT_REJECTED":
      return { title: "Payment could not be verified", icon: <XCircle className="h-3.5 w-3.5" />, tone: "bg-red-50 text-red-700" };
    case "DELIVERABLE":
      return { title: "Deliverable released", icon: <FileCheck className="h-3.5 w-3.5" />, tone: "bg-emerald-50 text-emerald-700" };
    default:
      return { title: "Update", icon: <RefreshCw className="h-3.5 w-3.5" />, tone: "bg-slate-100 text-slate-600" };
  }
};

const actorLabel = (a: RequestActivity) =>
  a.actor === "CUSTOMER" ? "You" : a.actor === "STAFF" ? a.actorName || "Research Hub team" : "Research Hub";

const ActivityItem: React.FC<{ a: RequestActivity }> = ({ a }) => {
  if (a.type === "MESSAGE") {
    const mine = a.actor === "CUSTOMER";
    return (
      <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div
          className={`min-w-0 max-w-[92%] rounded-lg border px-4 py-3 sm:max-w-[80%] ${
            mine ? "border-navy-100 bg-navy-50" : "border-slate-200 bg-white shadow-sm"
          }`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <span className={`text-xs font-semibold ${mine ? "text-navy-800" : "text-navy-900"}`}>
              {actorLabel(a)}
              {!mine && <span className="ml-1.5 font-normal text-slate-500">Research Hub</span>}
            </span>
            <time className="text-[11px] text-slate-500" dateTime={a.createdAt}>
              {formatDateTime(a.createdAt)}
            </time>
          </div>
          {a.message && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-slate-800">{a.message}</p>}
          <FileLinks files={a.files} />
        </div>
      </li>
    );
  }

  const meta = eventMeta(a);
  return (
    <li className="flex items-start gap-3 px-1">
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.tone}`} aria-hidden="true">
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-800">
          <span className="font-medium">{meta.title}</span>
          <span className="text-slate-500"> · {actorLabel(a)}</span>
        </p>
        {a.message && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-600">{a.message}</p>}
        <FileLinks files={a.files} />
        <time className="mt-0.5 block text-[11px] text-slate-500" dateTime={a.createdAt}>
          {formatDateTime(a.createdAt)}
        </time>
      </div>
    </li>
  );
};

export const RequestTimeline: React.FC<{
  request: ServiceRequest;
  onUpdated: (req: ServiceRequest) => void;
}> = ({ request, onUpdated }) => {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Reset the composer when a different request is opened.
  useEffect(() => {
    setText("");
    setAttachments([]);
    setError("");
    setSent(false);
  }, [request._id]);

  const items = useMemo(() => {
    const list = [...(request.activity || [])];
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return list;
  }, [request.activity]);

  const mutation = useMutation({
    mutationFn: () => respondCustomerRequest(request._id, text.trim(), attachments),
    onSuccess: (updated) => {
      setText("");
      setAttachments([]);
      setError("");
      setSent(true);
      onUpdated(updated);
    },
    onError: (err) => setError(getErrorMessage(err, "Your message could not be sent. Please try again.")),
  });

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      return;
    }
    setError("");
    setSent(false);
    setUploading(true);
    try {
      for (const file of files) {
        const res = await uploadFile(file, "messages");
        setAttachments((prev) => [...prev, { name: res.fileName || file.name, url: res.url }]);
      }
    } catch (err) {
      setError(getErrorMessage(err, "The file could not be uploaded."));
    } finally {
      setUploading(false);
    }
  };

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !uploading && !mutation.isPending;
  const closed = request.status === "CANCELLED";

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <ul className="space-y-4">
          <li className="flex items-start gap-3 px-1">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-700" aria-hidden="true">
              <FileText className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">Request submitted</p>
              {request.additionalMessage && (
                <div className="panel-muted mt-2 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original brief</p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{request.additionalMessage}</p>
                </div>
              )}
              <time className="mt-1 block text-[11px] text-slate-500" dateTime={request.createdAt}>
                {formatDateTime(request.createdAt)}
              </time>
            </div>
          </li>
        </ul>
      ) : (
        <ol className="space-y-4" aria-label="Request activity">
          {items.map((a, i) => (
            <ActivityItem key={a._id || `${a.createdAt}-${i}`} a={a} />
          ))}
        </ol>
      )}

      {closed ? (
        <p className="alert-info">This request is cancelled. Contact us if you need to reopen it.</p>
      ) : (
        <form
          className="rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSend) mutation.mutate();
          }}
        >
          <label htmlFor={`reply-${request._id}`} className="label">
            Send a message
          </label>
          <textarea
            id={`reply-${request._id}`}
            rows={3}
            maxLength={MAX_MESSAGE}
            className="input resize-y"
            placeholder="Write to our team. You can also attach files such as revised drafts or supporting documents."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSent(false);
            }}
          />

          {attachments.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Attachments">
              {attachments.map((f, i) => (
                <li key={`${f.url}-${i}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1 pl-2.5 pr-1 text-xs text-slate-700">
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="truncate">{f.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-navy-900"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <p className="alert-error mt-3" role="alert">
              {error}
            </p>
          )}
          {sent && !error && (
            <p className="alert-success mt-3" role="status">
              Your message has been sent. Our team will reply here.
            </p>
          )}

          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                tabIndex={-1}
                aria-hidden="true"
                onChange={handleFiles}
                disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
              />
              <button
                type="button"
                className="btn-ghost btn-sm w-full sm:w-auto"
                onClick={() => fileInput.current?.click()}
                disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
              >
                {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Attach files"}
              </button>
              <p className="help">PDF, Word, Excel, PowerPoint, ZIP or images. Max 10 MB each.</p>
            </div>
            <button type="submit" className="btn-primary btn-sm w-full sm:w-auto" disabled={!canSend}>
              {mutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {mutation.isPending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
