import { ServiceRequest, ServiceRequestStatus, hasSubmittedPayment } from "../../api/types";

export type Tone = "neutral" | "navy" | "accent" | "success" | "warning" | "danger" | "info";

export const TONE_BADGE: Record<Tone, string> = {
  neutral: "badge-neutral",
  navy: "badge-navy",
  accent: "badge-accent",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  info: "badge-info",
};

export interface NextStep {
  label: string;
  description: string;
  tone: Tone;
  /** True when the customer is the one expected to act. */
  actionRequired: boolean;
}

const CANCELLABLE: ServiceRequestStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "QUOTATION_SENT",
  "WAITING_FOR_CUSTOMER",
  "NEEDS_INFORMATION",
];

export const getServiceName = (req: ServiceRequest): string =>
  typeof req.serviceId === "object" && req.serviceId?.name ? req.serviceId.name : "Service request";

export const getServiceId = (req: ServiceRequest): string | undefined =>
  typeof req.serviceId === "object" ? req.serviceId?._id : req.serviceId || undefined;

export const hasQuotation = (req: ServiceRequest): boolean => Number(req.quotation?.amount || 0) > 0;

export const isPaymentVerified = (req: ServiceRequest): boolean =>
  hasSubmittedPayment(req) && req.paymentSubmission?.status === "VERIFIED";

export const isClosed = (req: ServiceRequest): boolean => req.status === "COMPLETED" || req.status === "CANCELLED";

/** Mirrors the server rule for PATCH /requests/:id/cancel. */
export const isCancellable = (req: ServiceRequest): boolean =>
  CANCELLABLE.includes(req.status) && req.paymentSubmission?.status !== "VERIFIED";

/** Mirrors the server rule for POST /requests/:id/payment. */
export const canSubmitPayment = (req: ServiceRequest): boolean =>
  hasQuotation(req) && !isClosed(req) && req.paymentSubmission?.status !== "VERIFIED";

export const hasDeliverable = (req: ServiceRequest): boolean =>
  Boolean(req.finalDeliverable?.fileUrl || req.finalDeliverable?.doiUrl);

export const getNextStep = (req: ServiceRequest): NextStep => {
  const submitted = hasSubmittedPayment(req);
  const paymentStatus = submitted ? req.paymentSubmission?.status : undefined;

  if (req.status === "CANCELLED") {
    return { label: "Cancelled", description: "This request has been cancelled.", tone: "neutral", actionRequired: false };
  }
  if (hasDeliverable(req)) {
    return {
      label: "Deliverable ready",
      description: "Your deliverable is available to download in the Deliverables section.",
      tone: "success",
      actionRequired: false,
    };
  }
  if (req.status === "COMPLETED") {
    return { label: "Completed", description: "This engagement has been completed.", tone: "success", actionRequired: false };
  }
  if (req.status === "WAITING_FOR_CUSTOMER" || req.status === "NEEDS_INFORMATION") {
    return {
      label: "Awaiting your response",
      description: "Our team needs further information from you. Please reply in the Messages section.",
      tone: "warning",
      actionRequired: true,
    };
  }
  if (paymentStatus === "REJECTED" && canSubmitPayment(req)) {
    return {
      label: "Payment rejected — resubmit",
      description: "We could not verify your payment. Please review the note and resubmit your payment details.",
      tone: "danger",
      actionRequired: true,
    };
  }
  if (paymentStatus === "PENDING_VERIFICATION") {
    return {
      label: "Payment under verification",
      description: "We have received your payment reference and are verifying it.",
      tone: "info",
      actionRequired: false,
    };
  }
  if (paymentStatus === "VERIFIED") {
    return {
      label: "Payment verified",
      description: "Your payment is confirmed. Our team is working on your request.",
      tone: "success",
      actionRequired: false,
    };
  }
  if (canSubmitPayment(req)) {
    return {
      label: "Quotation ready — complete payment",
      description: "Review the quotation and submit your payment details to begin work.",
      tone: "accent",
      actionRequired: true,
    };
  }
  if (req.status === "IN_PROGRESS") {
    return { label: "In progress", description: "Our team is working on your request.", tone: "navy", actionRequired: false };
  }
  if (req.status === "UNDER_REVIEW") {
    return {
      label: "Under review",
      description: "A specialist is reviewing your requirements and will follow up shortly.",
      tone: "navy",
      actionRequired: false,
    };
  }
  return {
    label: "Awaiting review",
    description: "Your request has been received and will be reviewed by our team.",
    tone: "info",
    actionRequired: false,
  };
};

export const formatDate = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
};

/** "corresponding_author" -> "Corresponding author" */
export const humanizeKey = (key: string): string => {
  const spaced = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
