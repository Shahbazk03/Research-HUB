/*
| Research writer / professor network — client API and types.
| Server: server/src/controllers/{writer,adminWriter,experts}.controller.ts
*/
import apiClient from "./client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type WriterApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";

export interface WriterPublication {
  title: string;
  journal?: string;
  year?: number;
  indexing?: string;
  url?: string;
}

export interface WriterProfile {
  applicationStatus: WriterApplicationStatus;
  title?: string;
  designation?: string;
  city?: string;
  country?: string;
  highestQualification?: string;
  yearsOfExperience?: number;
  expertise: string[];
  bio?: string;
  publications: WriterPublication[];
  googleScholarUrl?: string;
  orcidId?: string;
  linkedinUrl?: string;
  cvUrl?: string;
  photoUrl?: string;
  /** Writer's consent to appear on the public website. */
  showOnWebsite: boolean;
  /** Admin decision to feature on the website (admin responses only). */
  featuredOnWebsite?: boolean;
  /** Internal notes (admin responses only). */
  adminNotes?: string;
  reviewedAt?: string;
}

export interface WriterAccount {
  id: string;
  _id?: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  institution?: string;
  department?: string;
  status?: string;
  createdAt?: string;
  writerProfile: WriterProfile;
  stats?: { active: number; completed: number; interested: number };
  engagements?: Engagement[];
}

export type EngagementStage =
  | "INTERESTED"
  | "OFFERED"
  | "ACCEPTED"
  | "SUBMITTED"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "DECLINED"
  | "WITHDRAWN"
  | "NOT_SELECTED"
  | "CANCELLED";

export const ENGAGEMENT_STAGE_LABELS: Record<EngagementStage, string> = {
  INTERESTED: "Interest sent",
  OFFERED: "Offer received",
  ACCEPTED: "In progress",
  SUBMITTED: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  DECLINED: "Declined",
  WITHDRAWN: "Withdrawn",
  NOT_SELECTED: "Not selected",
  CANCELLED: "Cancelled",
};

export const CLOSED_STAGES: EngagementStage[] = ["DECLINED", "WITHDRAWN", "NOT_SELECTED", "CANCELLED"];

/** Anonymised view of a customer request. Never contains customer contact details. */
export interface WriterBrief {
  _id: string;
  requestNumber: string;
  service: { _id: string; name: string; slug: string } | null;
  discipline?: string;
  requirements: Record<string, unknown>;
  academicLevel?: string;
  publicationType?: string;
  targetJournal?: string;
  indexingRequirement?: string;
  citationStyle?: string;
  wordCount?: number;
  customerDeadline?: string;
  brief?: string;
  attachmentCount: number;
  status: string;
  createdAt: string;
  /** Only once the writer has accepted the work: */
  referenceFiles?: { name: string; url: string }[];
  authors?: {
    correspondingAuthor?: { name?: string; designation?: string };
    supervisor?: { name?: string; designation?: string };
    coAuthors?: { name?: string; designation?: string }[];
    university?: string;
    department?: string;
  };
  /** Present in the open-requests list */
  myEngagement?: { _id: string; stage: EngagementStage; proposal?: { fee?: number; days?: number } } | null;
  /** Present in the admin request view */
  assignedTo?: string | null;
}

export interface EngagementMessage {
  _id?: string;
  from: "WRITER" | "ADMIN";
  authorName?: string;
  text?: string;
  proposedFee?: number;
  proposedDays?: number;
  createdAt: string;
}

export interface EngagementSubmission {
  _id?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  note?: string;
  submittedAt: string;
  review?: {
    decision: "APPROVED" | "CHANGES_REQUESTED";
    notes?: string;
    reviewedAt: string;
    reviewerName?: string;
    releasedToCustomer?: boolean;
  };
}

export interface PenaltyInfo {
  lateDays: number;
  penaltyPct: number;
  penaltyAmount: number;
  payableAmount: number;
  isLate: boolean;
}

export interface Engagement {
  _id: string;
  requestId: string;
  writerId: string;
  stage: EngagementStage;
  proposal?: { fee?: number; currency?: string; days?: number; note?: string; proposedAt?: string };
  offer?: {
    fee: number;
    currency: string;
    deadline: string;
    penaltyPerDayPct: number;
    maxPenaltyPct: number;
    notes?: string;
    offeredAt: string;
  };
  acceptedAt?: string;
  approvedAt?: string;
  closedReason?: string;
  submissions: EngagementSubmission[];
  messages: EngagementMessage[];
  payout?: { lateDays?: number; penaltyAmount?: number; payableAmount?: number; status: "UNPAID" | "PAID"; paidAt?: string; note?: string };
  /** Live penalty computed by the server (null before acceptance). */
  penalty: PenaltyInfo | null;
  createdAt: string;
  updatedAt: string;
  /** Writer views */
  brief?: WriterBrief | null;
  /** Admin views */
  writer?: { id: string; name: string; email: string; institution?: string; designation?: string; expertise: string[] } | null;
  request?: { id: string; requestNumber: string; serviceName?: string; status: string; customerDeadline?: string } | null;
}

export interface PublicExpert {
  _id: string;
  name: string;
  designation?: string;
  institution?: string;
  department?: string;
  location?: string;
  highestQualification?: string;
  yearsOfExperience?: number;
  expertise: string[];
  bio?: string;
  photoUrl?: string;
  googleScholarUrl?: string;
  orcidId?: string;
  publicationCount: number;
  indexedIn: string[];
  recentPublications: { title: string; journal?: string; year?: number }[];
  projectsCompleted: number;
  joinedAt: string;
}

export interface WriterEarnings {
  inProgressValue: number;
  approvedValue: number;
  paid: number;
  penalties: number;
  completedCount: number;
}

/* ------------------------------------------------------------------ */
/* Public                                                              */
/* ------------------------------------------------------------------ */

export const getPublicExperts = async (): Promise<PublicExpert[]> => (await apiClient.get("/experts")).data.data;

export interface WriterApplicationPayload {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
  phone?: string;
  whatsapp?: string;
  institution: string;
  department?: string;
  writerProfile: Partial<WriterProfile>;
}

/** Creates a PENDING writer account and returns a session (same shape as /auth/register). */
export const applyAsWriter = async (payload: WriterApplicationPayload) =>
  (await apiClient.post("/auth/register-writer", payload)).data as { success: boolean; message: string; data: { token: string; user: any } };

/* ------------------------------------------------------------------ */
/* Writer portal                                                       */
/* ------------------------------------------------------------------ */

export const getMyWriterProfile = async (): Promise<WriterAccount> => (await apiClient.get("/writer/me")).data.data;

export const updateMyWriterProfile = async (
  payload: Partial<Pick<WriterAccount, "firstName" | "lastName" | "phone" | "whatsapp" | "institution" | "department">> & {
    writerProfile?: Partial<WriterProfile>;
  }
): Promise<WriterAccount> => (await apiClient.put("/writer/me", payload)).data.data;

export const getOpenBriefs = async (params?: { page?: number; limit?: number }) =>
  (await apiClient.get("/writer/open-requests", { params })).data as { data: WriterBrief[]; total: number; page: number; totalPages: number };

export const expressInterest = async (requestId: string, payload: { fee: number; days: number; note?: string }): Promise<Engagement> =>
  (await apiClient.post(`/writer/open-requests/${requestId}/interest`, payload)).data.data;

export const getMyEngagements = async (): Promise<Engagement[]> => (await apiClient.get("/writer/engagements")).data.data;
export const getMyEngagement = async (id: string): Promise<Engagement> => (await apiClient.get(`/writer/engagements/${id}`)).data.data;
export const withdrawInterest = async (id: string): Promise<Engagement> => (await apiClient.post(`/writer/engagements/${id}/withdraw`)).data.data;
export const respondToOffer = async (id: string, action: "ACCEPT" | "DECLINE", reason?: string): Promise<Engagement> =>
  (await apiClient.post(`/writer/engagements/${id}/respond`, { action, reason })).data.data;
export const sendWriterMessage = async (id: string, payload: { text?: string; proposedFee?: number; proposedDays?: number }): Promise<Engagement> =>
  (await apiClient.post(`/writer/engagements/${id}/messages`, payload)).data.data;
/** fileUrl must come from uploadFile(file, "writer-submissions"). */
export const submitWork = async (id: string, payload: { fileName: string; fileUrl: string; fileSize?: number; note?: string }): Promise<Engagement> =>
  (await apiClient.post(`/writer/engagements/${id}/submissions`, payload)).data.data;
export const getWriterEarnings = async (): Promise<WriterEarnings> => (await apiClient.get("/writer/earnings")).data.data;

/** Profile details read from a CV. Every field is a suggestion; empty string = not found. */
export interface CvSuggestions {
  title: string;
  designation: string;
  institution: string;
  department: string;
  city: string;
  country: string;
  highestQualification: string;
  yearsOfExperience: string;
  bio: string;
  googleScholarUrl: string;
  orcidId: string;
  linkedinUrl: string;
  expertise: string[];
  publications: { title: string; journal: string; year: string; indexing: string; url: string }[];
}

export interface CvExtractionResult {
  /** "ai" = read by Claude; "basic" = rule-based reading (no AI key configured or AI unavailable). */
  method: "ai" | "basic";
  profile: CvSuggestions;
  note?: string;
}

/** Reads the given (or saved) CV and returns suggested profile fields. Nothing is saved. */
export const extractMyCv = async (cvUrl?: string): Promise<CvExtractionResult> =>
  (await apiClient.post("/writer/me/cv-extract", { cvUrl }, { timeout: 120000 })).data.data;

/* ------------------------------------------------------------------ */
/* Admin                                                               */
/* ------------------------------------------------------------------ */

export const adminListWriters = async (params?: { status?: WriterApplicationStatus | ""; search?: string }) =>
  (await apiClient.get("/admin/writers", { params })).data as { data: WriterAccount[]; counts: Partial<Record<WriterApplicationStatus, number>> };
export const adminGetWriter = async (id: string): Promise<WriterAccount> => (await apiClient.get(`/admin/writers/${id}`)).data.data;
export const adminCreateWriter = async (payload: {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  institution?: string;
  department?: string;
  writerProfile?: Partial<WriterProfile>;
}) => (await apiClient.post("/admin/writers", payload)).data.data as { id: string; email: string };
export const adminUpdateWriter = async (
  id: string,
  payload: Partial<Pick<WriterAccount, "firstName" | "lastName" | "phone" | "whatsapp" | "institution" | "department">> & {
    applicationStatus?: WriterApplicationStatus;
    writerProfile?: Partial<WriterProfile>;
  }
): Promise<WriterAccount> => (await apiClient.put(`/admin/writers/${id}`, payload)).data.data;

export const adminExtractWriterCv = async (id: string): Promise<CvExtractionResult> =>
  (await apiClient.post(`/admin/writers/${id}/cv-extract`, {}, { timeout: 120000 })).data.data;

export const adminListEngagements = async (params?: { stage?: EngagementStage | "ACTIVE" | "OVERDUE" | ""; writerId?: string }) =>
  (await apiClient.get("/admin/engagements", { params })).data as { data: Engagement[]; counts: Record<string, number> };
export const adminGetRequestEngagements = async (requestId: string) =>
  (await apiClient.get(`/admin/requests/${requestId}/engagements`)).data.data as { request: WriterBrief; engagements: Engagement[] };
export const adminAssignWriter = async (
  requestId: string,
  payload: { writerId: string; fee: number; currency?: string; deadline: string; penaltyPerDayPct?: number; maxPenaltyPct?: number; notes?: string }
): Promise<Engagement> => (await apiClient.post(`/admin/requests/${requestId}/assign`, payload)).data.data;
export const adminGetEngagement = async (id: string): Promise<Engagement> => (await apiClient.get(`/admin/engagements/${id}`)).data.data;
export const adminSendEngagementMessage = async (id: string, payload: { text?: string; proposedFee?: number; proposedDays?: number }): Promise<Engagement> =>
  (await apiClient.post(`/admin/engagements/${id}/messages`, payload)).data.data;
export const adminReviewSubmission = async (
  id: string,
  payload: { decision: "APPROVED" | "CHANGES_REQUESTED"; notes?: string; releaseToCustomer?: boolean; customerNote?: string }
): Promise<Engagement> => (await apiClient.post(`/admin/engagements/${id}/review`, payload)).data.data;
export const adminReleaseToCustomer = async (id: string, customerNote?: string): Promise<Engagement> =>
  (await apiClient.post(`/admin/engagements/${id}/release`, { customerNote })).data.data;
export const adminCancelEngagement = async (id: string, reason?: string): Promise<Engagement> =>
  (await apiClient.post(`/admin/engagements/${id}/cancel`, { reason })).data.data;
export const adminUpdatePayout = async (id: string, payload: { status?: "PAID" | "UNPAID"; penaltyAmount?: number; note?: string }): Promise<Engagement> =>
  (await apiClient.post(`/admin/engagements/${id}/payout`, payload)).data.data;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const formatMoney = (amount?: number | null, currency = "INR") =>
  amount == null || Number.isNaN(Number(amount))
    ? "—"
    : new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(amount));

/** Human countdown like "2 days 4 hours left" or "Overdue by 1 day". */
export const describeDeadline = (deadline?: string, now = Date.now()) => {
  if (!deadline) return { text: "No deadline", overdue: false, urgent: false };
  const diff = new Date(deadline).getTime() - now;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const span = days > 0 ? `${days} day${days === 1 ? "" : "s"}${hours ? ` ${hours} h` : ""}` : `${Math.max(1, hours)} hour${hours === 1 ? "" : "s"}`;
  return diff >= 0
    ? { text: `${span} left`, overdue: false, urgent: diff < 2 * 86_400_000 }
    : { text: `Overdue by ${span}`, overdue: true, urgent: true };
};
