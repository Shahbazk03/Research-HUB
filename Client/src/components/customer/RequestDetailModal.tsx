import React, { useEffect, useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Download, ExternalLink, FileText, MessageSquare } from "lucide-react";
import { cancelCustomerRequest, getErrorMessage } from "../../api";
import { useSettings, whatsappLink } from "../../hooks/usePublicData";
import { ServiceRequest, safeHref } from "../../api/types";
import { StatusBadge } from "../common/StatusBadge";
import { Modal, Spinner } from "../ui";
import { PaymentSection } from "./PaymentSection";
import { RequestTimeline } from "./RequestTimeline";
import {
  TONE_BADGE,
  formatDate,
  getNextStep,
  getServiceName,
  hasDeliverable,
  hasQuotation,
  humanizeKey,
  isCancellable,
  isPaymentVerified,
} from "./requestHelpers";

const Section: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => {
  const id = useId();
  return (
    <section aria-labelledby={id} className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <h3 id={id} className="text-base font-semibold text-navy-900">
        {title}
      </h3>
      {description && <p className="muted mt-0.5">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
};

const DefList: React.FC<{ items: [string, React.ReactNode][] }> = ({ items }) => {
  const visible = items.filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (!visible.length) return null;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {visible.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{v}</dd>
        </div>
      ))}
    </dl>
  );
};

type Person = { name?: string; designation?: string; email?: string; orcidId?: string };

const PersonCard: React.FC<{ role: string; person?: Person }> = ({ role, person }) => {
  if (!person || !(person.name || person.email)) return null;
  return (
    <div className="panel-muted min-w-0 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{role}</p>
      <p className="mt-0.5 break-words text-sm font-medium text-navy-900">{person.name || "—"}</p>
      {person.designation && <p className="break-words text-sm text-slate-600">{person.designation}</p>}
      {person.email && <p className="break-all text-sm text-slate-600">{person.email}</p>}
      {person.orcidId && <p className="break-all text-xs text-slate-500">ORCID {person.orcidId}</p>}
    </div>
  );
};

const isFileLike = (v: any): v is { name?: string; url: string } => v && typeof v === "object" && typeof v.url === "string";

const renderValue = (value: any): React.ReactNode => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isFileLike(value)) {
    const href = safeHref(value.url);
    return href ? (
      <a href={href} target="_blank" rel="noopener noreferrer" className="link">
        {value.name || "View file"}
      </a>
    ) : (
      value.name || "File"
    );
  }
  if (Array.isArray(value)) {
    if (!value.length) return undefined;
    if (value.every((v) => typeof v !== "object" || v === null)) return value.join(", ");
    return (
      <ul className="space-y-1">
        {value.map((v, i) => (
          <li key={i}>{renderValue(v)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${humanizeKey(k)}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join("; ");
  }
  return String(value);
};

const WhatsAppLink: React.FC<{ request: ServiceRequest }> = ({ request }) => {
  const { data: settings } = useSettings();
  const text = `Hello Research Hub, I have a question about request ${request.requestNumber} (${getServiceName(request)}).`;
  const href = whatsappLink(settings?.whatsappNumber, text);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-secondary">
      <MessageSquare className="h-4 w-4" aria-hidden="true" />
      WhatsApp us
    </a>
  );
};

export const RequestDetailModal: React.FC<{
  request: ServiceRequest | null;
  defaultPayerName?: string;
  onClose: () => void;
  onUpdated: (req: ServiceRequest) => void;
}> = ({ request, defaultPayerName, onClose, onUpdated }) => {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    setConfirmCancel(false);
    setCancelError("");
  }, [request?._id]);

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelCustomerRequest(id),
    onSuccess: (updated) => {
      setConfirmCancel(false);
      setCancelError("");
      onUpdated(updated);
    },
    onError: (err) => setCancelError(getErrorMessage(err, "This request could not be cancelled. Please try again.")),
  });

  if (!request) return null;

  const next = getNextStep(request);
  const ap: NonNullable<ServiceRequest["academicProfile"]> = request.academicProfile || {};
  const requirements = Object.entries(request.requirements || {}).filter(([, v]) => renderValue(v) !== undefined);
  const files = (request.referenceFiles || []).filter((f) => safeHref(f.url));
  const deliverable = request.finalDeliverable;
  const fileHref = safeHref(deliverable?.fileUrl);
  const doiHref = safeHref(deliverable?.doiUrl);
  const cancellable = isCancellable(request);
  const hasActivity = Boolean(request.activity && request.activity.length);

  const footer = (
    <>
      <div className="mr-auto w-full sm:w-auto">
        <WhatsAppLink request={request} />
      </div>
      {cancellable && !confirmCancel && (
        <button type="button" className="btn-danger-outline" onClick={() => setConfirmCancel(true)}>
          Cancel request
        </button>
      )}
      <button type="button" className="btn-primary" onClick={onClose}>
        Close
      </button>
    </>
  );

  return (
    <Modal open onClose={onClose} size="xl" title={getServiceName(request)} subtitle={<span className="font-mono">{request.requestNumber}</span>} footer={footer}>
      <div className="space-y-8">
        {confirmCancel && cancellable && (
          <div className="alert-warning flex-col sm:flex-row sm:items-center" role="alertdialog" aria-label="Confirm cancellation">
            <AlertTriangle className="hidden h-5 w-5 shrink-0 sm:block" aria-hidden="true" />
            <div className="flex-1">
              <p className="font-semibold">Cancel this request?</p>
              <p className="mt-0.5">Our team will stop work on {request.requestNumber}. This cannot be undone from your dashboard.</p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" className="btn-secondary btn-sm flex-1 sm:flex-none" onClick={() => setConfirmCancel(false)} disabled={cancelMutation.isPending}>
                Keep request
              </button>
              <button type="button" className="btn-danger btn-sm flex-1 sm:flex-none" onClick={() => cancelMutation.mutate(request._id)} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending && <Spinner className="h-3.5 w-3.5" />}
                Yes, cancel
              </button>
            </div>
          </div>
        )}
        {cancelError && (
          <p className="alert-error" role="alert">
            {cancelError}
          </p>
        )}

        {/* Summary */}
        <Section title="Summary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference no.</p>
              <p className="mt-0.5 break-all font-mono text-sm font-medium text-navy-900">{request.requestNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="mt-0.5 text-sm text-slate-800">{formatDate(request.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Status</p>
              <div className="mt-1">
                <StatusBadge status={request.status} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Last updated</p>
              <p className="mt-0.5 text-sm text-slate-800">{formatDate(request.updatedAt)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Next step</span>
              <span className={TONE_BADGE[next.tone]}>{next.label}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-700">{next.description}</p>
          </div>
        </Section>

        {/* Project details */}
        <Section title="Project details">
          <div className="space-y-6">
            <DefList
              items={[
                ["Academic level", ap.academicLevel],
                ["Discipline", ap.discipline],
                ["University", ap.university],
                ["Department", ap.department],
                ["Publication type", ap.publicationType],
                ["Target journal", ap.targetJournal],
                ["Target conference", ap.targetConference],
                ["Indexing", ap.indexingRequirement],
                ["Citation style", ap.citationStyle],
                ["Word count", ap.wordCount ? ap.wordCount.toLocaleString() : undefined],
                ["Page count", ap.pageCount || undefined],
                ["Deadline", ap.deadline ? formatDate(ap.deadline) : undefined],
              ]}
            />

            {(ap.correspondingAuthor?.name || ap.supervisor?.name || (ap.coAuthors && ap.coAuthors.length > 0)) && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Authors</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <PersonCard role="Corresponding author" person={ap.correspondingAuthor} />
                  {(ap.coAuthors || []).map((p, i) => (
                    <PersonCard key={i} role={`Co-author ${i + 1}`} person={p} />
                  ))}
                  <PersonCard role="Supervisor" person={ap.supervisor} />
                </div>
              </div>
            )}

            {requirements.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Requirements</h4>
                <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {requirements.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4">
                      <dt className="text-sm text-slate-500">{humanizeKey(k)}</dt>
                      <dd className="min-w-0 break-words text-sm text-slate-800">{renderValue(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {hasActivity && request.additionalMessage && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Brief</h4>
                <p className="panel-muted whitespace-pre-wrap break-words px-4 py-3 text-sm text-slate-700">{request.additionalMessage}</p>
              </div>
            )}

            {files.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-navy-900">Reference files</h4>
                <ul className="space-y-2">
                  {files.map((f, i) => (
                    <li key={`${f.url}-${i}`}>
                      <a href={safeHref(f.url)} target="_blank" rel="noopener noreferrer" className="link inline-flex max-w-full items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{f.name || `File ${i + 1}`}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {/* Quotation & payment */}
        <Section title="Quotation and payment">
          {hasQuotation(request) ? (
            <PaymentSection key={request._id} request={request} defaultPayerName={defaultPayerName} onUpdated={onUpdated} />
          ) : request.status === "CANCELLED" ? (
            <p className="muted">No quotation was issued for this request.</p>
          ) : (
            <p className="muted">Our team will share a quotation here once your requirements have been reviewed.</p>
          )}
        </Section>

        {/* Deliverables */}
        <Section title="Deliverables">
          {hasDeliverable(request) && (fileHref || doiHref) ? (
            <div className="space-y-3">
              {deliverable?.notes && <p className="panel-muted whitespace-pre-wrap break-words px-4 py-3 text-sm text-slate-700">{deliverable.notes}</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fileHref && (
                  <a href={fileHref} target="_blank" rel="noopener noreferrer" className="card card-hover flex min-w-0 items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
                      <Download className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy-900">Download deliverable</span>
                      <span className="block truncate text-xs text-slate-500">{deliverable?.fileName || "Final file"}</span>
                    </span>
                  </a>
                )}
                {doiHref && (
                  <a href={doiHref} target="_blank" rel="noopener noreferrer" className="card card-hover flex min-w-0 items-center gap-3 p-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-navy-50 text-navy-700">
                      <ExternalLink className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-navy-900">View publication (DOI)</span>
                      <span className="block truncate font-mono text-xs text-slate-500">{deliverable?.doiUrl}</span>
                    </span>
                  </a>
                )}
              </div>
              {deliverable?.uploadedAt && <p className="muted">Released {formatDate(deliverable.uploadedAt)}</p>}
            </div>
          ) : (
            <p className="muted">
              {request.status === "CANCELLED"
                ? "No deliverables for this request."
                : isPaymentVerified(request) || request.status === "IN_PROGRESS"
                  ? "Your deliverables will appear here when they are ready."
                  : "Deliverables will appear here once work is complete."}
            </p>
          )}
        </Section>

        {/* Timeline & messages */}
        <Section title="Timeline and messages" description="Updates on your request and your conversation with our team.">
          <RequestTimeline request={request} onUpdated={onUpdated} />
        </Section>
      </div>
    </Modal>
  );
};
