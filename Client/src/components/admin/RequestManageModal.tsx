import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, FileText, Paperclip, Send, Trash2, Upload, X, XCircle } from "lucide-react";
import { deleteAdminRequest, getErrorMessage, updateAdminRequest, uploadFile } from "../../api";
import {
  formatCurrencyAmount,
  hasSubmittedPayment,
  RequestActivity,
  safeHref,
  ServiceRequest,
  ServiceRequestStatus,
} from "../../api/types";
import { StatusBadge } from "../common/StatusBadge";
import { Field, Modal, Spinner } from "../ui";
import {
  formatDate,
  formatDateTime,
  getRequestTopic,
  getServiceName,
  Notify,
  SafeLink,
  staffStatusLabel,
  STATUS_TRANSITIONS,
} from "./shared";
import { RequestWriterSection } from "./RequestWriterSection";

const CURRENCIES = [
  { value: "INR", label: "INR — Indian rupee" },
  { value: "USD", label: "USD — US dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British pound" },
];

const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg,.webp";

interface FormState {
  status: ServiceRequestStatus;
  adminNotes: string;
  quotationAmount: string;
  quotationCurrency: string;
  quotationNotes: string;
  qrUrl: string;
  qrUpiId: string;
  deliverableUrl: string;
  deliverableName: string;
  deliverableSize?: number;
  doiUrl: string;
  deliverableNotes: string;
}

const formFromRequest = (req: ServiceRequest): FormState => ({
  status: req.status,
  adminNotes: req.adminNotes || "",
  quotationAmount: req.quotation?.amount != null ? String(req.quotation.amount) : "",
  quotationCurrency: req.quotation?.currency || "INR",
  quotationNotes: req.quotation?.notes || "",
  qrUrl: req.paymentQr?.url || "",
  qrUpiId: req.paymentQr?.upiId || "",
  deliverableUrl: req.finalDeliverable?.fileUrl || "",
  deliverableName: req.finalDeliverable?.fileName || "",
  deliverableSize: req.finalDeliverable?.fileSize,
  doiUrl: req.finalDeliverable?.doiUrl || "",
  deliverableNotes: req.finalDeliverable?.notes || "",
});

const sameForm = (a: FormState, b: FormState) => JSON.stringify(a) === JSON.stringify(b);

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

const Panel: React.FC<{ title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  aside,
  children,
}) => (
  <section className="rounded-lg border border-slate-200 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {aside}
    </div>
    <div className="space-y-4 p-4">{children}</div>
  </section>
);

const Detail: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={`min-w-0 ${className || ""}`}>
    <dt className="text-xs font-medium text-slate-500">{label}</dt>
    <dd className="mt-0.5 break-words text-sm text-navy-900">{children || <span className="text-slate-400">—</span>}</dd>
  </div>
);

const FileList: React.FC<{ files?: { name: string; url: string }[] }> = ({ files }) =>
  files && files.length > 0 ? (
    <ul className="mt-2 space-y-1">
      {files.map((f, i) => (
        <li key={`${f.url}-${i}`} className="flex items-center gap-1.5 text-xs">
          <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <SafeLink url={f.url} className="link inline-flex items-center gap-1 break-all text-xs">
            {f.name || "Attachment"}
          </SafeLink>
        </li>
      ))}
    </ul>
  ) : null;

const formatRequirementValue = (val: unknown): React.ReactNode => {
  if (val == null || val === "") return null;
  if (Array.isArray(val)) {
    if (val.every((v) => v && typeof v === "object" && "url" in v)) {
      return <FileList files={val as { name: string; url: string }[]} />;
    }
    return val.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  const s = String(val);
  return safeHref(s) ? <SafeLink url={s} /> : s;
};

const activityTitle = (a: RequestActivity): string => {
  switch (a.type) {
    case "CREATED":
      return "Request submitted";
    case "STATUS":
      return a.status ? `Status changed to ${staffStatusLabel(a.status)}` : "Status updated";
    case "QUOTATION":
      return "Quotation issued";
    case "PAYMENT_SUBMITTED":
      return "Payment submitted";
    case "PAYMENT_VERIFIED":
      return "Payment verified";
    case "PAYMENT_REJECTED":
      return "Payment rejected";
    case "DELIVERABLE":
      return "Deliverable shared";
    default:
      return "Message";
  }
};

const Timeline: React.FC<{ request: ServiceRequest }> = ({ request }) => {
  const items = useMemo(
    () =>
      [...(request.activity || [])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [request.activity]
  );

  if (items.length === 0) {
    return request.additionalMessage ? (
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-xs font-medium text-slate-500">
          Original brief from {request.customer?.name || "customer"} · {formatDate(request.createdAt)}
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{request.additionalMessage}</p>
      </div>
    ) : (
      <p className="muted">No activity has been recorded for this request yet.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((a, i) => {
        const key = a._id || `${a.createdAt}-${i}`;
        if (a.actor === "SYSTEM" || (a.type !== "MESSAGE" && !a.message && !a.files?.length)) {
          return (
            <li key={key} className="flex items-center gap-2 text-xs text-slate-500">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" aria-hidden="true" />
              <span className="font-medium text-slate-600">{activityTitle(a)}</span>
              {a.actorName && <span>· {a.actorName}</span>}
              <span className="ml-auto whitespace-nowrap">{formatDateTime(a.createdAt)}</span>
            </li>
          );
        }
        const isStaff = a.actor === "STAFF";
        return (
          <li key={key} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
            <div
              className={`w-full max-w-[92%] rounded-lg border p-3 sm:max-w-[85%] ${
                isStaff ? "border-navy-200 bg-navy-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-xs font-semibold text-navy-900">
                  {a.actorName || (isStaff ? "Research Hub team" : "Customer")}
                  <span className={`ml-2 ${isStaff ? "badge-navy" : "badge-neutral"} text-[10px]`}>
                    {isStaff ? "Staff" : "Customer"}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">{formatDateTime(a.createdAt)}</p>
              </div>
              {a.type !== "MESSAGE" && <p className="mt-1 text-xs font-medium text-slate-600">{activityTitle(a)}</p>}
              {a.message && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{a.message}</p>}
              <FileList files={a.files} />
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

export const RequestManageModal: React.FC<{
  request: ServiceRequest;
  isAdmin: boolean;
  notify: Notify;
  onClose: () => void;
}> = ({ request, isAdmin, notify, onClose }) => {
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState<ServiceRequest>(request);
  const [form, setForm] = useState<FormState>(() => formFromRequest(request));
  const [qrUploading, setQrUploading] = useState(false);
  const [deliverableUploading, setDeliverableUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageFiles, setMessageFiles] = useState<{ name: string; url: string }[]>([]);
  const [messageUploading, setMessageUploading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setCurrent(request);
    setForm(formFromRequest(request));
  }, [request]);

  const baseline = useMemo(() => formFromRequest(current), [current]);
  const dirty = !sameForm(form, baseline);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const applyResult = (updated: ServiceRequest) => {
    setCurrent(updated);
    setForm(formFromRequest(updated));
    queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
    queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  const mutation = useMutation({
    mutationFn: (vars: { payload: Record<string, unknown>; success: string }) => updateAdminRequest(current._id, vars.payload),
    onSuccess: (updated, vars) => {
      applyResult(updated);
      notify("success", vars.success);
    },
    onError: (err) => notify("error", getErrorMessage(err, "The request could not be updated.")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAdminRequest(current._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      notify("success", `Request ${current.requestNumber} was deleted.`);
      onClose();
    },
    onError: (err) => notify("error", getErrorMessage(err, "The request could not be deleted.")),
  });

  const busy = mutation.isPending || deleteMutation.isPending;

  /* ----------------------------- uploads ---------------------------------- */

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    folder: "qrcodes" | "deliverables",
    setLoading: (v: boolean) => void
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLoading(true);
    try {
      const res = await uploadFile(file, folder);
      if (folder === "qrcodes") {
        set("qrUrl", res.url);
      } else {
        setForm((f) => ({ ...f, deliverableUrl: res.url, deliverableName: res.fileName || file.name, deliverableSize: res.size || file.size }));
      }
      notify("success", `${file.name} uploaded. Save changes to share it with the customer.`);
    } catch (err) {
      notify("error", getErrorMessage(err, "Upload failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleMessageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    setMessageUploading(true);
    try {
      for (const file of files) {
        const res = await uploadFile(file, "messages");
        setMessageFiles((prev) => [...prev, { name: res.fileName || file.name, url: res.url }]);
      }
    } catch (err) {
      notify("error", getErrorMessage(err, "Upload failed."));
    } finally {
      setMessageUploading(false);
    }
  };

  /* ----------------------------- actions ---------------------------------- */

  const confirmDiscard = () =>
    !dirty || window.confirm("You have unsaved changes in this request. They will be discarded. Continue?");

  const handleSave = (e?: React.FormEvent) => {
    e?.preventDefault();
    const payload: Record<string, unknown> = {};

    if (form.status !== current.status) payload.status = form.status;
    if (form.adminNotes !== baseline.adminNotes) payload.adminNotes = form.adminNotes;

    if (isAdmin) {
      const quoteChanged =
        form.quotationAmount !== baseline.quotationAmount ||
        form.quotationCurrency !== baseline.quotationCurrency ||
        form.quotationNotes !== baseline.quotationNotes;
      if (quoteChanged) {
        if (form.quotationAmount.trim() === "") {
          payload.quotation = null;
        } else {
          const amount = Number(form.quotationAmount);
          if (!Number.isFinite(amount) || amount <= 0) {
            notify("error", "Quotation amount must be greater than zero, or left empty to clear it.");
            return;
          }
          payload.quotation = { amount, currency: form.quotationCurrency, notes: form.quotationNotes.trim() };
        }
      }

      if (form.qrUrl !== baseline.qrUrl || form.qrUpiId !== baseline.qrUpiId) {
        payload.paymentQr = form.qrUrl ? { url: form.qrUrl, upiId: form.qrUpiId.trim() } : null;
      }
    }

    const deliverableChanged =
      form.deliverableUrl !== baseline.deliverableUrl ||
      form.deliverableName !== baseline.deliverableName ||
      form.doiUrl !== baseline.doiUrl ||
      form.deliverableNotes !== baseline.deliverableNotes;
    if (deliverableChanged) {
      const doi = form.doiUrl.trim();
      if (doi && !safeHref(doi)) {
        notify("error", "The DOI link must start with http:// or https://.");
        return;
      }
      const hasAny = form.deliverableUrl || doi || form.deliverableNotes.trim();
      payload.finalDeliverable = hasAny
        ? {
            fileUrl: form.deliverableUrl,
            fileName: form.deliverableUrl ? form.deliverableName || "Deliverable" : "",
            fileSize: form.deliverableUrl ? form.deliverableSize : undefined,
            doiUrl: doi,
            notes: form.deliverableNotes.trim(),
          }
        : null;
    }

    if (Object.keys(payload).length === 0) {
      notify("success", "There are no changes to save.");
      return;
    }
    mutation.mutate({ payload, success: "Request updated." });
  };

  const handleVerify = () => {
    if (!confirmDiscard()) return;
    mutation.mutate({ payload: { paymentVerificationAction: "VERIFY" }, success: "Payment verified. The request is now in progress." });
  };

  const handleReject = () => {
    if (!confirmDiscard()) return;
    mutation.mutate(
      {
        payload: {
          paymentVerificationAction: "REJECT",
          ...(rejectReason.trim() ? { paymentVerificationNotes: rejectReason.trim() } : {}),
        },
        success: "Payment rejected. The customer has been notified.",
      },
      {
        onSuccess: () => {
          setRejecting(false);
          setRejectReason("");
        },
      }
    );
  };

  const handleSendMessage = () => {
    const text = message.trim();
    if (!text) {
      notify("error", "Please type a message before sending.");
      return;
    }
    if (!confirmDiscard()) return;
    mutation.mutate(
      { payload: { message: text, messageFiles }, success: "Message sent to the customer." },
      {
        onSuccess: () => {
          setMessage("");
          setMessageFiles([]);
        },
      }
    );
  };

  const handleClose = () => {
    if (busy) return;
    if (!confirmDiscard()) return;
    onClose();
  };

  /* ----------------------------- derived ---------------------------------- */

  const statusOptions = [current.status, ...(STATUS_TRANSITIONS[current.status] || [])];
  const topic = getRequestTopic(current);
  const profile = current.academicProfile;
  const payment = current.paymentSubmission;
  const paymentSubmitted = hasSubmittedPayment(current);
  const qrHref = safeHref(form.qrUrl);
  const requirementEntries = Object.entries(current.requirements || {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  );

  const footer = (
    <>
      {isAdmin && (
        <button
          type="button"
          className="btn-danger-outline btn-sm mr-auto"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete request ${current.requestNumber} permanently? This cannot be undone.`)) {
              deleteMutation.mutate();
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
        </button>
      )}
      <button type="button" className="btn-secondary btn-sm" onClick={handleClose} disabled={busy}>
        Close
      </button>
      <button type="submit" form="request-manage-form" className="btn-primary btn-sm" disabled={busy || !dirty}>
        {mutation.isPending ? <Spinner className="h-3.5 w-3.5" /> : null} Save changes
      </button>
    </>
  );

  return (
    <Modal
      open
      onClose={handleClose}
      size="xl"
      title={`${current.requestNumber} · ${getServiceName(current)}`}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <StatusBadge status={current.status} size="sm" audience="staff" />
          <span>Submitted {formatDate(current.createdAt)}</span>
          {dirty && <span className="badge-warning text-[11px]">Unsaved changes</span>}
        </span>
      }
      footer={footer}
    >
      <form id="request-manage-form" onSubmit={handleSave} className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* ------------------------- Left: details ------------------------- */}
        <div className="min-w-0 space-y-5 lg:col-span-3">
          <Panel title="Customer">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Name">{current.customer?.name}</Detail>
              <Detail label="Email">
                {current.customer?.email && (
                  <a className="link break-all" href={`mailto:${current.customer.email}`}>
                    {current.customer.email}
                  </a>
                )}
              </Detail>
              <Detail label="Phone">{current.customer?.phone}</Detail>
              <Detail label="WhatsApp">{current.customer?.whatsapp}</Detail>
              <Detail label="Preferred contact">
                {current.preferredContactMethod
                  ? current.preferredContactMethod.charAt(0) + current.preferredContactMethod.slice(1).toLowerCase()
                  : null}
              </Detail>
              {current.referral && (
                <Detail label="Referral code">
                  <span className="font-mono">{current.referral.code}</span> ({current.referral.referrerName})
                </Detail>
              )}
            </dl>
          </Panel>

          <Panel title="Request details">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Detail label="Service" className="sm:col-span-2">
                {getServiceName(current)}
              </Detail>
              <Detail label="Topic / working title" className="sm:col-span-2">
                {topic || profile?.targetJournal}
              </Detail>
              {profile && (
                <>
                  <Detail label="Academic level">{profile.academicLevel}</Detail>
                  <Detail label="Discipline / department">{profile.discipline || profile.department}</Detail>
                  <Detail label="Institution">{profile.university}</Detail>
                  <Detail label="Corresponding author">
                    {profile.correspondingAuthor?.name}
                    {profile.correspondingAuthor?.designation ? `, ${profile.correspondingAuthor.designation}` : ""}
                  </Detail>
                  <Detail label="Supervisor">
                    {profile.supervisor?.name}
                    {profile.supervisor?.designation ? `, ${profile.supervisor.designation}` : ""}
                  </Detail>
                  <Detail label="Publication type">{profile.publicationType}</Detail>
                  <Detail label="Target journal / conference">{profile.targetJournal || profile.targetConference}</Detail>
                  <Detail label="Indexing">{profile.indexingRequirement}</Detail>
                  <Detail label="Citation style">{profile.citationStyle}</Detail>
                  <Detail label="Word count">
                    {profile.wordCount ? Number(profile.wordCount).toLocaleString() : null}
                  </Detail>
                  <Detail label="Deadline">{profile.deadline ? formatDate(profile.deadline) : "Flexible"}</Detail>
                  {profile.coAuthors && profile.coAuthors.length > 0 && (
                    <Detail label="Co-authors" className="sm:col-span-2">
                      {profile.coAuthors.map((c) => c.name).filter(Boolean).join(", ")}
                    </Detail>
                  )}
                </>
              )}
            </dl>

            {requirementEntries.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted requirements</p>
                <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {requirementEntries.map(([key, val]) => (
                    <div key={key} className="grid grid-cols-1 gap-1 px-3 py-2 sm:grid-cols-3 sm:gap-3">
                      <dt className="text-xs font-medium capitalize text-slate-500">{key.replace(/_/g, " ")}</dt>
                      <dd className="break-words text-sm text-navy-900 sm:col-span-2">{formatRequirementValue(val)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {current.referenceFiles && current.referenceFiles.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reference files ({current.referenceFiles.length})
                </p>
                <ul className="space-y-1.5">
                  {current.referenceFiles.map((file, idx) => (
                    <li key={`${file.url}-${idx}`} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      <SafeLink url={file.url} className="link inline-flex min-w-0 items-center gap-1 break-all">
                        {file.name || "Reference file"}
                      </SafeLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel title="Timeline & messages">
            <Timeline request={current} />

            <div className="divider pt-4">
              <Field label="Message customer" help="The message and any attachments appear on the customer's request timeline.">
                {(id, describedBy) => (
                  <textarea
                    id={id}
                    aria-describedby={describedBy}
                    rows={3}
                    maxLength={5000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input"
                    placeholder="Write an update or ask the customer for information"
                  />
                )}
              </Field>
              {messageFiles.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2">
                  {messageFiles.map((f, i) => (
                    <li key={`${f.url}-${i}`} className="badge-neutral max-w-full">
                      <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{f.name}</span>
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-slate-200"
                        aria-label={`Remove attachment ${f.name}`}
                        onClick={() => setMessageFiles((prev) => prev.filter((_, j) => j !== i))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className={`btn-secondary btn-sm cursor-pointer ${messageUploading ? "pointer-events-none opacity-60" : ""}`}>
                  {messageUploading ? <Spinner className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />}
                  {messageUploading ? "Uploading…" : "Attach files"}
                  <input type="file" multiple accept={DOC_ACCEPT} className="sr-only" onChange={handleMessageFiles} disabled={messageUploading} />
                </label>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={handleSendMessage}
                  disabled={busy || messageUploading || !message.trim()}
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" /> Send message
                </button>
              </div>
            </div>
          </Panel>
        </div>

        {/* ------------------------- Right: manage ------------------------- */}
        <div className="min-w-0 space-y-5 lg:col-span-2">
          <Panel title="Writer assignment">
            <RequestWriterSection
              requestId={current._id}
              requestNumber={current.requestNumber}
              requestStatus={current.status}
              isAdmin={isAdmin}
              notify={notify}
            />
          </Panel>

          <Panel title="Status & internal notes">
            <Field label="Status" help="Only transitions allowed from the current status are listed.">
              {(id, describedBy) => (
                <select
                  id={id}
                  aria-describedby={describedBy}
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as ServiceRequestStatus)}
                  className="input"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {staffStatusLabel(s)}
                      {s === current.status ? " (current)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Notes for the customer" help="Shown to the customer in their dashboard.">
              {(id, describedBy) => (
                <textarea
                  id={id}
                  aria-describedby={describedBy}
                  rows={3}
                  value={form.adminNotes}
                  onChange={(e) => set("adminNotes", e.target.value)}
                  className="input"
                />
              )}
            </Field>
          </Panel>

          <Panel title="Quotation">
            {isAdmin ? (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <Field label="Amount" help="Leave empty to clear the quotation.">
                    {(id, describedBy) => (
                      <input
                        id={id}
                        aria-describedby={describedBy}
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        value={form.quotationAmount}
                        onChange={(e) => set("quotationAmount", e.target.value)}
                        className="input"
                      />
                    )}
                  </Field>
                  <Field label="Currency">
                    {(id) => (
                      <select id={id} value={form.quotationCurrency} onChange={(e) => set("quotationCurrency", e.target.value)} className="input">
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <Field label="Quotation notes">
                  {(id) => (
                    <textarea id={id} rows={2} value={form.quotationNotes} onChange={(e) => set("quotationNotes", e.target.value)} className="input" />
                  )}
                </Field>
                {form.quotationAmount && (
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, quotationAmount: "", quotationNotes: "" }))}>
                    Clear quotation
                  </button>
                )}
              </>
            ) : current.quotation?.amount ? (
              <dl className="grid grid-cols-1 gap-3">
                <Detail label="Amount">{formatCurrencyAmount(current.quotation.amount, current.quotation.currency)}</Detail>
                {current.quotation.notes && <Detail label="Notes">{current.quotation.notes}</Detail>}
                <p className="muted">Only administrators can change quotations.</p>
              </dl>
            ) : (
              <p className="muted">No quotation has been issued. Only administrators can issue quotations.</p>
            )}
          </Panel>

          <Panel
            title="Payment QR code"
            aside={current.paymentQr?.url ? <span className="badge-success text-[11px]">Shared</span> : null}
          >
            {isAdmin ? (
              <>
                <div className="flex flex-wrap items-start gap-3">
                  {qrHref ? (
                    <img src={qrHref} alt="Payment QR code" className="h-24 w-24 rounded-md border border-slate-200 bg-white object-contain p-1" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-center text-xs text-slate-400">
                      No QR
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className={`btn-secondary btn-sm cursor-pointer ${qrUploading ? "pointer-events-none opacity-60" : ""}`}>
                      {qrUploading ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                      {qrUploading ? "Uploading…" : form.qrUrl ? "Replace image" : "Upload image"}
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={qrUploading}
                        onChange={(e) => handleUpload(e, "qrcodes", setQrUploading)}
                      />
                    </label>
                    {form.qrUrl && (
                      <button type="button" className="btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={() => set("qrUrl", "")}>
                        Remove QR
                      </button>
                    )}
                  </div>
                </div>
                <Field label="UPI ID" help="Optional. Shown with the QR code.">
                  {(id, describedBy) => (
                    <input
                      id={id}
                      aria-describedby={describedBy}
                      type="text"
                      value={form.qrUpiId}
                      onChange={(e) => set("qrUpiId", e.target.value)}
                      className="input"
                      placeholder="name@bank"
                    />
                  )}
                </Field>
              </>
            ) : current.paymentQr?.url ? (
              <div className="space-y-2">
                {safeHref(current.paymentQr.url) && (
                  <img
                    src={safeHref(current.paymentQr.url)}
                    alt="Payment QR code"
                    className="h-24 w-24 rounded-md border border-slate-200 bg-white object-contain p-1"
                  />
                )}
                {current.paymentQr.upiId && <p className="text-sm">UPI ID: {current.paymentQr.upiId}</p>}
                <p className="muted">Only administrators can change payment details.</p>
              </div>
            ) : (
              <p className="muted">No payment QR code has been shared.</p>
            )}
          </Panel>

          {paymentSubmitted && payment && (
            <Panel
              title="Customer payment"
              aside={
                payment.status === "VERIFIED" ? (
                  <span className="badge-success text-[11px]">Verified</span>
                ) : payment.status === "REJECTED" ? (
                  <span className="badge-danger text-[11px]">Rejected</span>
                ) : (
                  <span className="badge-warning text-[11px]">Awaiting verification</span>
                )
              }
            >
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <Detail label="Transaction / UTR">
                  <span className="break-all font-mono text-xs">{payment.transactionId}</span>
                </Detail>
                <Detail label="Amount paid">{formatCurrencyAmount(payment.amountPaid, payment.currency)}</Detail>
                <Detail label="Payer">
                  {payment.payerName || current.customer?.name}
                  {payment.payerUpiId ? ` (${payment.payerUpiId})` : ""}
                </Detail>
                <Detail label="Submitted">{formatDateTime(payment.submittedAt)}</Detail>
                {payment.notes && (
                  <Detail label="Customer notes" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    {payment.notes}
                  </Detail>
                )}
                {payment.screenshotUrl && (
                  <Detail label="Receipt" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    <SafeLink url={payment.screenshotUrl}>View receipt</SafeLink>
                  </Detail>
                )}
                {payment.adminVerificationNotes && (
                  <Detail label="Verification notes" className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
                    {payment.adminVerificationNotes}
                  </Detail>
                )}
              </dl>

              {current.referral && (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Referral {current.referral.code}: original {formatCurrencyAmount(current.referral.originalAmount, current.referral.currency)}, discount{" "}
                  {formatCurrencyAmount(current.referral.discountAmount, current.referral.currency)}, payable{" "}
                  {formatCurrencyAmount(current.referral.finalAmount, current.referral.currency)}.
                </p>
              )}

              {isAdmin && payment.status !== "VERIFIED" && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  {rejecting ? (
                    <>
                      <Field label="Reason for rejection" help="Shared with the customer so they can correct the payment details.">
                        {(id, describedBy) => (
                          <textarea
                            id={id}
                            aria-describedby={describedBy}
                            rows={2}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="input"
                            placeholder="e.g. The transaction reference could not be found."
                          />
                        )}
                      </Field>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-danger btn-sm" onClick={handleReject} disabled={busy}>
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Confirm rejection
                        </button>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setRejecting(false)} disabled={busy}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary btn-sm" onClick={handleVerify} disabled={busy}>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Verify payment
                      </button>
                      {payment.status !== "REJECTED" && (
                        <button type="button" className="btn-danger-outline btn-sm" onClick={() => setRejecting(true)} disabled={busy}>
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" /> Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!isAdmin && payment.status === "PENDING_VERIFICATION" && (
                <p className="muted">An administrator will verify this payment.</p>
              )}
            </Panel>
          )}

          <Panel
            title="Final deliverable"
            aside={current.finalDeliverable?.fileUrl || current.finalDeliverable?.doiUrl ? <span className="badge-success text-[11px]">Shared</span> : null}
          >
            <div className="space-y-2">
              <p className="label mb-0">File</p>
              {form.deliverableUrl ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <SafeLink url={form.deliverableUrl} className="link inline-flex min-w-0 flex-1 items-center gap-1 break-all">
                    {form.deliverableName || "Deliverable"}
                  </SafeLink>
                  <button
                    type="button"
                    className="btn-ghost btn-sm text-red-700 hover:bg-red-50"
                    onClick={() => setForm((f) => ({ ...f, deliverableUrl: "", deliverableName: "", deliverableSize: undefined }))}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="muted">No file attached.</p>
              )}
              <label className={`btn-secondary btn-sm cursor-pointer ${deliverableUploading ? "pointer-events-none opacity-60" : ""}`}>
                {deliverableUploading ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" aria-hidden="true" />}
                {deliverableUploading ? "Uploading…" : form.deliverableUrl ? "Replace file" : "Upload file"}
                <input
                  type="file"
                  accept={DOC_ACCEPT}
                  className="sr-only"
                  disabled={deliverableUploading}
                  onChange={(e) => handleUpload(e, "deliverables", setDeliverableUploading)}
                />
              </label>
              <p className="help">PDF, Word, Excel, PowerPoint, ZIP or image. Maximum 10 MB.</p>
            </div>
            <Field label="DOI link">
              {(id) => (
                <input
                  id={id}
                  type="url"
                  value={form.doiUrl}
                  onChange={(e) => set("doiUrl", e.target.value)}
                  className="input"
                  placeholder="https://doi.org/…"
                />
              )}
            </Field>
            <Field label="Deliverable notes">
              {(id) => (
                <textarea id={id} rows={2} value={form.deliverableNotes} onChange={(e) => set("deliverableNotes", e.target.value)} className="input" />
              )}
            </Field>
          </Panel>
        </div>
      </form>
    </Modal>
  );
};
