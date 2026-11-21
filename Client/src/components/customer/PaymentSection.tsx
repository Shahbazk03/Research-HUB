import React, { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, Check, CheckCircle2, Clock, Copy, ExternalLink, Upload, X } from "lucide-react";
import { getErrorMessage, submitCustomerPayment, uploadFile, validateReferralCode } from "../../api";
import { ServiceRequest, formatCurrencyAmount, hasSubmittedPayment, safeHref } from "../../api/types";
import { Field, Spinner } from "../ui";
import { canSubmitPayment, formatDate, isPaymentVerified } from "./requestHelpers";

type Feedback = { type: "success" | "error"; text: string } | null;

const SummaryGrid: React.FC<{ items: { label: string; value: React.ReactNode; mono?: boolean }[] }> = ({ items }) => (
  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-slate-200 bg-white p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
    {items.map((it) => (
      <div key={it.label} className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{it.label}</dt>
        <dd className={`mt-0.5 break-words font-medium text-navy-900 ${it.mono ? "font-mono text-[13px]" : ""}`}>{it.value}</dd>
      </div>
    ))}
  </dl>
);

const ReceiptLink: React.FC<{ url?: string; label?: string }> = ({ url, label = "View payment receipt" }) => {
  const href = safeHref(url);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1.5 text-sm">
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </a>
  );
};

/**
 * Quotation & payment. Mount with key={request._id} so local form state resets per request
 * while feedback survives the refreshed request returned by a mutation.
 */
export const PaymentSection: React.FC<{
  request: ServiceRequest;
  defaultPayerName?: string;
  onUpdated: (req: ServiceRequest) => void;
}> = ({ request, defaultPayerName, onUpdated }) => {
  const currency = request.quotation?.currency || "INR";
  const quoteAmount = Number(request.quotation?.amount || 0);
  const submitted = hasSubmittedPayment(request);
  const verified = isPaymentVerified(request);
  const payable = canSubmitPayment(request);
  const ps = request.paymentSubmission;

  const [editing, setEditing] = useState(false);
  const [txnId, setTxnId] = useState(submitted ? ps?.transactionId || "" : "");
  const [payerName, setPayerName] = useState((submitted && ps?.payerName) || defaultPayerName || request.customer?.name || "");
  const [payerUpi, setPayerUpi] = useState((submitted && ps?.payerUpiId) || "");
  const [notes, setNotes] = useState((submitted && ps?.notes) || "");
  const [screenshotUrl, setScreenshotUrl] = useState((submitted && ps?.screenshotUrl) || "");
  const [uploading, setUploading] = useState(false);
  const [referralCode, setReferralCode] = useState(request.referral?.code || "");
  const [referral, setReferral] = useState<{ code: string; referrerName: string; discountAmount: number; finalAmount: number; originalAmount: number } | null>(
    request.referral
      ? {
          code: request.referral.code,
          referrerName: request.referral.referrerName,
          discountAmount: request.referral.discountAmount,
          finalAmount: request.referral.finalAmount,
          originalAmount: request.referral.originalAmount,
        }
      : null
  );
  const [referralError, setReferralError] = useState("");
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [txnError, setTxnError] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const referralActive = referral && referral.code === referralCode.trim().toUpperCase();
  const amountDue = referralActive ? referral!.finalAmount : quoteAmount;

  const mutation = useMutation({
    mutationFn: () =>
      submitCustomerPayment(request._id, {
        transactionId: txnId.trim(),
        currency,
        payerName: payerName.trim() || undefined,
        payerUpiId: payerUpi.trim() || undefined,
        screenshotUrl: safeHref(screenshotUrl),
        notes: notes.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
      }),
    onSuccess: (updated) => {
      setEditing(false);
      setFeedback({ type: "success", text: "Payment details submitted. Our team will verify the payment and update this request." });
      onUpdated(updated);
    },
    onError: (err) => setFeedback({ type: "error", text: getErrorMessage(err, "We could not submit your payment details. Please try again.") }),
  });

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFeedback({ type: "error", text: "Could not copy to the clipboard. Please copy the UPI ID manually." });
    }
  };

  const handleApplyReferral = async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) {
      setReferralError("Enter a referral code.");
      return;
    }
    setApplying(true);
    setReferralError("");
    try {
      const v = await validateReferralCode(request._id, { code, amount: quoteAmount });
      setReferral({
        code: v.code,
        referrerName: v.referrerName,
        discountAmount: v.discountAmount,
        finalAmount: v.finalAmount,
        originalAmount: v.originalAmount,
      });
      setReferralCode(v.code);
    } catch (err) {
      setReferral(null);
      setReferralError(getErrorMessage(err, "This referral code is not valid."));
    } finally {
      setApplying(false);
    }
  };

  const handleScreenshot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const res = await uploadFile(file, "payments");
      setScreenshotUrl(res.url);
    } catch (err) {
      setFeedback({ type: "error", text: getErrorMessage(err, "The receipt could not be uploaded.") });
    } finally {
      setUploading(false);
    }
  };

  const feedbackAlert = feedback && (
    <div className={feedback.type === "success" ? "alert-success" : "alert-error"} role={feedback.type === "success" ? "status" : "alert"}>
      {feedback.type === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{feedback.text}</span>
    </div>
  );

  const qrSrc = safeHref(request.paymentQr?.url);
  const upiId = request.paymentQr?.upiId;

  return (
    <div className="space-y-4">
      {/* Quotation */}
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Quoted fee</p>
          <p className="mt-0.5 font-serif text-2xl font-semibold text-navy-900">{formatCurrencyAmount(quoteAmount, currency)}</p>
          {request.quotation?.providedAt && <p className="muted mt-0.5">Issued {formatDate(request.quotation.providedAt)}</p>}
        </div>
        {referralActive && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 sm:text-right">
            <p className="font-medium">Referral {referral!.code} applied</p>
            <p className="text-xs">
              {formatCurrencyAmount(referral!.discountAmount, currency)} off · Payable {formatCurrencyAmount(referral!.finalAmount, currency)}
            </p>
          </div>
        )}
      </div>
      {request.quotation?.notes && (
        <div className="panel-muted px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scope and terms</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{request.quotation.notes}</p>
        </div>
      )}

      {feedbackAlert}

      {verified && ps ? (
        <div className="space-y-3">
          <div className="alert-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Your payment has been verified. Thank you.</span>
          </div>
          <SummaryGrid
            items={[
              { label: "Reference no.", value: request.requestNumber, mono: true },
              { label: "Transaction ID", value: ps.transactionId, mono: true },
              { label: "Amount", value: formatCurrencyAmount(ps.amountPaid, ps.currency) },
              { label: "Verified on", value: formatDate(ps.verifiedAt || ps.submittedAt) },
            ]}
          />
          <ReceiptLink url={ps.screenshotUrl} />
        </div>
      ) : !payable ? null : submitted && ps && !editing ? (
        <div className="space-y-3">
          {ps.status === "REJECTED" ? (
            <div className="alert-error">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">We could not verify this payment</p>
                <p className="mt-0.5">
                  {ps.adminVerificationNotes || "Please check the transaction ID and receipt, then resubmit your payment details."}
                </p>
              </div>
            </div>
          ) : (
            <div className="alert-info">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Payment under verification</p>
                <p className="mt-0.5">We are matching your reference against our records. This usually takes a few working hours.</p>
              </div>
            </div>
          )}
          <SummaryGrid
            items={[
              { label: "Reference no.", value: request.requestNumber, mono: true },
              { label: "Transaction ID", value: ps.transactionId, mono: true },
              { label: "Amount", value: formatCurrencyAmount(ps.amountPaid, ps.currency) },
              { label: "Submitted on", value: formatDate(ps.submittedAt) },
            ]}
          />
          <div className="flex flex-wrap items-center gap-4">
            <ReceiptLink url={ps.screenshotUrl} label="View submitted receipt" />
            <button
              type="button"
              className={ps.status === "REJECTED" ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
              onClick={() => {
                setEditing(true);
                setFeedback(null);
              }}
            >
              {ps.status === "REJECTED" ? "Resubmit payment details" : "Update payment details"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* How to pay */}
          <div className="panel-muted space-y-3 p-4">
            <p className="text-sm font-semibold text-navy-900">How to pay</p>
            {qrSrc ? (
              <>
                <div className="mx-auto w-fit rounded-md border border-slate-200 bg-white p-2">
                  <img src={qrSrc} alt="UPI payment QR code" className="h-44 w-44 object-contain" />
                </div>
                <p className="text-sm text-slate-600">
                  Scan with any UPI app and pay <strong className="text-navy-900">{formatCurrencyAmount(amountDue, currency)}</strong>.
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Pay <strong className="text-navy-900">{formatCurrencyAmount(amountDue, currency)}</strong> using the payment details shared by our team.
                Contact us if you have not received them.
              </p>
            )}
            {upiId && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">UPI ID</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-sm text-navy-900">{upiId}</code>
                  <button type="button" className="icon-btn border border-slate-200 bg-white" onClick={() => handleCopy(upiId)} aria-label={copied ? "UPI ID copied" : "Copy UPI ID"}>
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">
              Include your reference <span className="font-mono text-slate-700">{request.requestNumber}</span> in the payment note where possible.
            </p>
          </div>

          {/* Payment details form */}
          <form
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!txnId.trim()) {
                setTxnError("Enter the UPI transaction ID or UTR number.");
                return;
              }
              setTxnError("");
              setFeedback(null);
              mutation.mutate();
            }}
          >
            <p className="text-sm text-slate-600">After paying, submit your transaction reference so we can verify the payment.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Transaction ID / UTR" required error={txnError} help={txnError ? undefined : "12-digit UTR or UPI reference number"}>
                {(id, d) => (
                  <input
                    id={id}
                    aria-describedby={d}
                    aria-invalid={Boolean(txnError)}
                    className={`input font-mono ${txnError ? "input-error" : ""}`}
                    value={txnId}
                    autoComplete="off"
                    onChange={(e) => {
                      setTxnId(e.target.value);
                      if (txnError) setTxnError("");
                    }}
                  />
                )}
              </Field>
              <Field label="Amount payable" help="Calculated from your quotation">
                {(id, d) => <input id={id} aria-describedby={d} className="input" value={formatCurrencyAmount(amountDue, currency)} readOnly disabled />}
              </Field>
            </div>

            <Field label="Referral code (optional)" error={referralError}>
              {(id, d) => (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id={id}
                    aria-describedby={d}
                    className={`input uppercase ${referralError ? "input-error" : ""}`}
                    value={referralCode}
                    autoComplete="off"
                    onChange={(e) => {
                      setReferralCode(e.target.value.toUpperCase());
                      setReferralError("");
                    }}
                  />
                  <button type="button" className="btn-secondary shrink-0" onClick={handleApplyReferral} disabled={applying || !referralCode.trim()}>
                    {applying && <Spinner className="h-3.5 w-3.5" />}
                    Apply
                  </button>
                </div>
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Payer name">
                {(id) => <input id={id} className="input" value={payerName} onChange={(e) => setPayerName(e.target.value)} autoComplete="name" />}
              </Field>
              <Field label="Your UPI ID (optional)">
                {(id) => <input id={id} className="input" value={payerUpi} onChange={(e) => setPayerUpi(e.target.value)} placeholder="name@bank" autoComplete="off" />}
              </Field>
            </div>

            <div>
              <p className="label">Payment receipt (optional)</p>
              <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden" tabIndex={-1} aria-hidden="true" onChange={handleScreenshot} />
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className="btn-secondary btn-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                  {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Uploading…" : screenshotUrl ? "Replace receipt" : "Upload receipt"}
                </button>
                {safeHref(screenshotUrl) && (
                  <span className="inline-flex items-center gap-2 text-sm">
                    <ReceiptLink url={screenshotUrl} label="View receipt" />
                    <button type="button" className="icon-btn h-7 w-7" onClick={() => setScreenshotUrl("")} aria-label="Remove receipt">
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
              <p className="help">Screenshot or PDF, up to 10 MB.</p>
            </div>

            <Field label="Notes (optional)">
              {(id) => <textarea id={id} rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}
            </Field>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {editing && (
                <button type="button" className="btn-ghost" onClick={() => setEditing(false)} disabled={mutation.isPending}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={mutation.isPending || uploading}>
                {mutation.isPending && <Spinner className="h-4 w-4" />}
                {mutation.isPending ? "Submitting…" : "Submit payment details"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
