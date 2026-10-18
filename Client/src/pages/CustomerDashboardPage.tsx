import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  MessageSquare,
  Sparkles,
  User,
  Save,
  Ban,
  Send,
  QrCode,
  CreditCard,
  Download,
  ExternalLink,
  Copy,
  Check,
  Upload,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCustomerRequests,
  cancelCustomerRequest,
  respondCustomerRequest,
  submitCustomerPayment,
  uploadAsset,
  validateReferralCode,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/common/StatusBadge";
import { WhatsAppButton } from "../components/common/WhatsAppButton";
import { ServiceRequest, formatCurrencyAmount } from "../api/types";

interface CustomerDashboardPageProps {
  navigate: (route: string, params?: any) => void;
  initialTab?: string;
}

export const CustomerDashboardPage: React.FC<CustomerDashboardPageProps> = ({
  navigate,
  initialTab,
}) => {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const queryClient = useQueryClient();

  // Active Tab: "requests" | "profile"
  const [activeTab, setActiveTab] = useState<"requests" | "profile">(() => {
    if (initialTab === "requests" || initialTab === "profile") {
      return initialTab;
    }
    try {
      const saved = sessionStorage.getItem("customer_active_tab");
      if (saved === "requests" || saved === "profile") {
        return saved;
      }
    } catch {}
    return "requests";
  });

  useEffect(() => {
    if ((initialTab === "requests" || initialTab === "profile") && initialTab !== activeTab) {
      setActiveTab(initialTab);
      try {
        sessionStorage.setItem("customer_active_tab", initialTab);
      } catch {}
    }
  }, [initialTab]);

  const handleTabChange = (tab: "requests" | "profile") => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem("customer_active_tab", tab);
      const targetHash = `#/dashboard?tab=${tab}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    } catch {}
  };
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  const getRequestDisplayStatus = (request: ServiceRequest) => {
    const hasSubmittedPayment = Boolean(
      request.paymentSubmission?.transactionId?.trim() &&
      Number(request.paymentSubmission?.amountPaid || 0) > 0
    );

    return request.paymentSubmission?.status === "PENDING_VERIFICATION" && hasSubmittedPayment
      ? "UNDER_REVIEW"
      : request.status;
  };

  const hasValidSubmittedPayment = Boolean(
    selectedRequest?.paymentSubmission?.transactionId?.trim() &&
    Number(selectedRequest.paymentSubmission?.amountPaid || 0) > 0
  );

  // Response modal state
  const [responseMessage, setResponseMessage] = useState<string>("");
  const [isResponding, setIsResponding] = useState<boolean>(false);

  // Payment Submission state
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [paymentTxnId, setPaymentTxnId] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [paymentPayerName, setPaymentPayerName] = useState<string>("");
  const [paymentPayerUpi, setPaymentPayerUpi] = useState<string>("");
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string>("");
  const [paymentNotes, setPaymentNotes] = useState<string>("");
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralPreview, setReferralPreview] = useState<{ code: string; referrerName: string; discountAmount: number; finalAmount: number; originalAmount: number } | null>(null);
  const [referralValidationError, setReferralValidationError] = useState<string>("");
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState<boolean>(false);
  const [isEditingPayment, setIsEditingPayment] = useState<boolean>(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Cancel Request Double-Confirmation with Security Code
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [cancelSecurityCode, setCancelSecurityCode] = useState<string>("");
  const [typedCancelCode, setTypedCancelCode] = useState<string>("");

  const handleOpenCancelConfirmation = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCancelSecurityCode(code);
    setTypedCancelCode("");
    setIsCancelModalOpen(true);
  };

  useEffect(() => {
    if (selectedRequest) {
      setPaymentTxnId(selectedRequest.paymentSubmission?.transactionId || "");
      setPaymentAmount(
        selectedRequest.referral?.finalAmount ??
        selectedRequest.paymentSubmission?.amountPaid ??
        selectedRequest.quotation?.amount ??
        ""
      );
      setReferralCode(selectedRequest.referral?.code || "");
      setReferralPreview(
        selectedRequest.referral
          ? {
              code: selectedRequest.referral.code,
              referrerName: selectedRequest.referral.referrerName,
              discountAmount: selectedRequest.referral.discountAmount,
              finalAmount: selectedRequest.referral.finalAmount,
              originalAmount: selectedRequest.referral.originalAmount,
            }
          : null
      );
      setPaymentPayerName(
        selectedRequest.paymentSubmission?.payerName ||
        (user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : selectedRequest.customer?.name || "")
      );
      setPaymentPayerUpi(selectedRequest.paymentSubmission?.payerUpiId || "");
      setPaymentScreenshotUrl(selectedRequest.paymentSubmission?.screenshotUrl || "");
      setPaymentNotes(selectedRequest.paymentSubmission?.notes || "");
      setIsEditingPayment(false);
      setPaymentFeedback(null);
    }
  }, [selectedRequest, user]);

  const handleCopyUpi = (upiId: string) => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleApplyReferral = async () => {
    if (!selectedRequest || !selectedRequest.quotation?.amount) {
      setReferralValidationError("A quotation amount must exist before applying a referral code.");
      return;
    }

    const trimmedCode = referralCode.trim();
    if (!trimmedCode) {
      setReferralValidationError("Enter a referral code to apply a discount.");
      return;
    }

    try {
      setReferralValidationError("");
      const validated = await validateReferralCode(selectedRequest._id, {
        code: trimmedCode,
        amount: Number(selectedRequest.quotation.amount),
      });

      setReferralPreview({
        code: validated.code,
        referrerName: validated.referrerName,
        discountAmount: validated.discountAmount,
        finalAmount: validated.finalAmount,
        originalAmount: validated.originalAmount,
      });
      setPaymentAmount(validated.finalAmount);
      setReferralCode(validated.code);
      setPaymentFeedback({
        type: "success",
        text: `Referral applied successfully: ${validated.referrerName} discount of ${formatCurrencyAmount(validated.discountAmount, selectedRequest.quotation.currency || "INR")} added.`,
      });
    } catch (error: any) {
      setReferralPreview(null);
      setReferralValidationError(error?.response?.data?.message || "Referral code is invalid.");
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingScreenshot(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await uploadAsset({
            filename: file.name,
            base64Data,
            folder: "payments",
          });
          setPaymentScreenshotUrl(res.url);
        } catch (err: any) {
          alert(err.response?.data?.message || "Failed to upload screenshot.");
        } finally {
          setIsUploadingScreenshot(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploadingScreenshot(false);
    }
  };

  // Profile Form state
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    phone: user?.phone || "",
    whatsapp: user?.whatsapp || "",
    academicLevel: user?.academicLevel || "",
    institution: user?.institution || "",
    department: user?.department || "",
  });
  const [profileSaved, setProfileSaved] = useState<boolean>(false);

  // Query Customer Requests
  const { data: requestResponse, isLoading } = useQuery({
    queryKey: ["customer-requests", statusFilter, search],
    queryFn: () =>
      getCustomerRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: search.trim() || undefined,
      }),
    enabled: isAuthenticated,
  });

  const requests: ServiceRequest[] = requestResponse?.data || [];

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelCustomerRequest(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      setSelectedRequest(updated);
      setIsCancelModalOpen(false);
      setTypedCancelCode("");
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      respondCustomerRequest(id, message),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      setSelectedRequest(updated);
      setIsResponding(false);
      setResponseMessage("");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      submitCustomerPayment(id, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customer-requests"] });
      setSelectedRequest(updated);
      setIsEditingPayment(false);
      setPaymentFeedback({
        type: "success",
        text: "Payment reference submitted! Our admin team will verify it shortly.",
      });
    },
    onError: (err: any) => {
      setPaymentFeedback({
        type: "error",
        text: err.response?.data?.message || "Failed to submit payment details.",
      });
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Authentication Required</h2>
        <p className="text-xs text-slate-400">Please sign in to view your research requests.</p>
        <button
          onClick={() => navigate("login", { redirect: "customer-dashboard" })}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Summary Metrics
  const totalCount = requests.length;
  const inProgressCount = requests.filter((r) => r.status === "IN_PROGRESS").length;
  const waitingCount = requests.filter(
    (r) => r.status === "WAITING_FOR_CUSTOMER" || (r.status as any) === "NEEDS_INFORMATION"
  ).length;
  const completedCount = requests.filter((r) => r.status === "COMPLETED").length;

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateProfile(profileForm);
    if (success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-12 space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Scholar Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Welcome back, <strong className="text-white">{user?.firstName}</strong>. Track project milestones and communicate directly with your assigned specialist.
          </p>
        </div>

        <button
          onClick={() => navigate("wizard")}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 self-start sm:self-auto transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>New Research Request</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => handleTabChange("requests")}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "requests"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>My Research Requests</span>
          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("profile")}
          className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "profile"
              ? "border-indigo-500 text-white"
              : "border-transparent text-slate-400 hover:text-slate-300"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile & Academic Affiliation</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: REQUESTS TRACKING                                                  */}
      {/* ========================================================================= */}
      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-2xl border-slate-800">
              <p className="text-xs text-slate-400">Total Submitted</p>
              <p className="text-2xl font-black text-white mt-1">{totalCount}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-slate-800">
              <p className="text-xs text-amber-400">In Progress</p>
              <p className="text-2xl font-black text-amber-300 mt-1">{inProgressCount}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-slate-800">
              <p className="text-xs text-purple-400">Action Required</p>
              <p className="text-2xl font-black text-purple-300 mt-1">{waitingCount}</p>
            </div>
            <div className="glass-panel p-4 rounded-2xl border-slate-800">
              <p className="text-xs text-emerald-400">Completed</p>
              <p className="text-2xl font-black text-emerald-300 mt-1">{completedCount}</p>
            </div>
          </div>

          {/* Search & Status Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 glass-panel rounded-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Request Number, topic, or journal..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["all", "NEW", "UNDER_REVIEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {st === "all" ? "All" : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Table / Cards */}
          {isLoading ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-xs text-slate-400 animate-pulse">
              Loading your research submissions...
            </div>
          ) : requests.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center space-y-4 border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 mx-auto flex items-center justify-center text-slate-500">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Research Requests Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                You haven't submitted any research advisory requests yet. Use our interactive wizard to submit your project parameters.
              </p>
              <button
                onClick={() => navigate("wizard")}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
              >
                Submit New Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const serviceName =
                  typeof req.serviceId === "object" ? req.serviceId?.name : "Academic Service";

                return (
                  <div
                    key={req._id}
                    className="glass-panel p-5 rounded-2xl border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-indigo-300">
                          {req.requestNumber}
                        </span>
                        <StatusBadge status={getRequestDisplayStatus(req)} size="sm" />
                        <span className="text-[11px] text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-white">{serviceName}</h3>

                      <p className="text-xs text-slate-400">
                        {req.academicProfile?.publicationType || "Research Project"} •{" "}
                        {req.academicProfile?.targetJournal || req.academicProfile?.indexingRequirement || "Target Publication"}
                      </p>

                      {/* Financial, Payment & Deliverable Badges */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {req.quotation?.amount != null && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Quotation: {formatCurrencyAmount(req.quotation.amount, req.quotation.currency)}</span>
                          </span>
                        )}

                        {req.paymentSubmission?.status === "VERIFIED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Payment Verified</span>
                          </span>
                        ) : req.paymentSubmission?.status === "PENDING_VERIFICATION" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Payment Under Verification</span>
                          </span>
                        ) : req.paymentSubmission?.status === "REJECTED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Payment Rejected (Resubmit)</span>
                          </span>
                        ) : req.quotation?.amount != null ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                            <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Quotation Ready • Scan & Pay</span>
                          </span>
                        ) : null}

                        {req.finalDeliverable?.fileUrl && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                            <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                            <span>Completed Manuscript Ready</span>
                          </span>
                        )}

                        {req.finalDeliverable?.doiUrl && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                            <span>DOI Published</span>
                          </span>
                        )}
                      </div>

                      {/* Admin Note if present */}
                      {req.adminNotes && (
                        <div className="p-2 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 max-w-xl">
                          <strong className="text-white">Admin Note:</strong> {req.adminNotes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 md:pt-0 shrink-0 border-t md:border-t-0 border-slate-800">
                      <WhatsAppButton
                        requestNumber={req.requestNumber}
                        serviceName={serviceName}
                        size="sm"
                        label="WhatsApp"
                      />

                      <button
                        onClick={() => setSelectedRequest(req)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PROFILE TAB                                                        */}
      {/* ========================================================================= */}
      {activeTab === "profile" && (
        <div className="max-w-2xl glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white">Academic Profile Information</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Keep your contact and university details updated for faster communication.
            </p>
          </div>

          {profileSaved && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile updated successfully!</span>
            </div>
          )}

          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={profileForm.firstName}
                  onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={profileForm.lastName}
                  onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email (Account)</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full p-2.5 rounded-xl glass-input text-xs text-slate-500 bg-slate-900 cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={profileForm.whatsapp}
                  onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Institution</label>
                <input
                  type="text"
                  value={profileForm.institution}
                  onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Department</label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REQUEST DETAIL MODAL                                                      */}
      {/* ========================================================================= */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl rounded-3xl border-slate-700 p-5 sm:p-8 space-y-6 my-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-300">
                    {selectedRequest.requestNumber}
                  </span>
                  <StatusBadge status={getRequestDisplayStatus(selectedRequest)} size="sm" />
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {typeof selectedRequest.serviceId === "object"
                    ? selectedRequest.serviceId?.name
                    : "Academic Service"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Academic Profile Parameters */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Academic Profile & Scope
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                <div>Level: <strong className="text-white">{selectedRequest.academicProfile?.academicLevel || "N/A"}</strong></div>
                <div>Discipline: <strong className="text-white">{selectedRequest.academicProfile?.discipline || "N/A"}</strong></div>
                <div>University: <strong className="text-white">{selectedRequest.academicProfile?.university || "N/A"}</strong></div>
                <div>Publication: <strong className="text-white">{selectedRequest.academicProfile?.publicationType || "N/A"}</strong></div>
                <div>Indexing: <strong className="text-white">{selectedRequest.academicProfile?.indexingRequirement || "N/A"}</strong></div>
                <div>Citation: <strong className="text-white">{selectedRequest.academicProfile?.citationStyle || "N/A"}</strong></div>
                <div>Target Words: <strong className="text-white">{selectedRequest.academicProfile?.wordCount || "N/A"}</strong></div>
                <div>Deadline: <strong className="text-white">{selectedRequest.academicProfile?.deadline || "N/A"}</strong></div>
              </div>
            </div>

            {/* Submitted Requirements */}
            {selectedRequest.requirements && Object.keys(selectedRequest.requirements).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Specification Details
                </h4>
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                  {Object.entries(selectedRequest.requirements).map(([key, value]) => (
                    <div key={key} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                      <span className="text-slate-400 capitalize w-40 shrink-0">
                        {key.replace(/_/g, " ")}:
                      </span>
                      <span className="text-white font-medium break-words">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Notes */}
            {selectedRequest.adminNotes && (
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Advisory Notes from Specialist
                </h4>
                <p className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                  {selectedRequest.adminNotes}
                </p>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. FORMAL QUOTATION & UPI PAYMENT QR CODE                                 */}
            {/* ========================================================================= */}
            {(selectedRequest.quotation?.amount != null || selectedRequest.paymentQr?.url) && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" />
                      <span>Formal Project Quotation & Payment QR</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Official fee structure determined for Request Reference #{selectedRequest.requestNumber}
                    </p>
                  </div>
                  {selectedRequest.quotation?.amount != null && (
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Total Fee</span>
                      <strong className="text-lg font-black text-emerald-400 font-mono">
                        {formatCurrencyAmount(selectedRequest.quotation.amount, selectedRequest.quotation.currency)}
                      </strong>
                    </div>
                  )}
                </div>

                {selectedRequest.quotation?.notes && (
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                    <strong className="text-indigo-300">Quotation Scope & Milestones:</strong> {selectedRequest.quotation.notes}
                  </p>
                )}

                {referralPreview && (
                  <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-200">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">Referral Discount Applied</span>
                      <span className="font-mono text-emerald-300">{referralPreview.code}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-emerald-100/80">
                      {referralPreview.referrerName} has provided a discount of {formatCurrencyAmount(referralPreview.discountAmount, selectedRequest.quotation?.currency || "INR")}.
                    </p>
                    <p className="mt-1 text-[11px] text-emerald-100/80">
                      Original: {formatCurrencyAmount(referralPreview.originalAmount, selectedRequest.quotation?.currency || "INR")} → Final payable: {formatCurrencyAmount(referralPreview.finalAmount, selectedRequest.quotation?.currency || "INR")}
                    </p>
                  </div>
                )}

                {/* QR Code Presentation */}
                {selectedRequest.paymentQr?.url && (
                  <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/20 flex flex-col sm:flex-row items-center gap-4">
                    <div className="shrink-0 bg-white p-2.5 rounded-2xl shadow-xl shadow-indigo-950/50 border border-slate-700">
                      <img
                        src={selectedRequest.paymentQr.url}
                        alt="UPI Payment QR Code"
                        className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg"
                      />
                    </div>
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Instant UPI QR Payment</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">Scan with Any UPI App</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Open Google Pay, PhonePe, Paytm, BHIM, or your mobile banking app, scan this QR code, and pay the specified quotation amount.
                      </p>

                      {selectedRequest.paymentQr.upiId && (
                        <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <span className="text-xs text-slate-400 font-medium">UPI ID:</span>
                          <code className="text-xs bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-300 font-mono">
                            {selectedRequest.paymentQr.upiId}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyUpi(selectedRequest.paymentQr!.upiId!)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 border border-indigo-500/30 transition-colors"
                          >
                            {copiedUpi ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy UPI</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* 2. UPI PAYMENT DETAILS FORM & VERIFICATION STATUS CONTAINER               */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <span>Payment Verification & Billing Record</span>
                </span>

                {selectedRequest.paymentSubmission?.status === "VERIFIED" && (
                  <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
                {selectedRequest.paymentSubmission?.status === "PENDING_VERIFICATION" && hasValidSubmittedPayment && (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Under Review</span>
                  </span>
                )}
                {selectedRequest.paymentSubmission?.status === "REJECTED" && (
                  <span className="text-[11px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/40 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Rejected</span>
                  </span>
                )}
              </div>

              {/* Case A: Payment Already Verified */}
              {selectedRequest.paymentSubmission?.status === "VERIFIED" ? (
                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Payment Confirmed & Verified by Administration</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your payment has been successfully verified. Milestone allocation and researcher drafting are active for your manuscript.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Reference (RH#)</span>
                      <strong className="text-indigo-300 font-mono select-all block truncate">
                        {selectedRequest.requestNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">UPI UTR / Txn ID</span>
                      <strong className="text-white font-mono select-all block truncate">
                        {selectedRequest.paymentSubmission.transactionId}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Amount Verified</span>
                      <strong className="text-emerald-400 font-bold block">
                        {formatCurrencyAmount(
                          selectedRequest.paymentSubmission.amountPaid,
                          selectedRequest.paymentSubmission.currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Verified Date</span>
                      <span className="text-slate-300 block text-[11px]">
                        {new Date(
                          selectedRequest.paymentSubmission.verifiedAt ||
                          selectedRequest.paymentSubmission.submittedAt
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {selectedRequest.paymentSubmission.screenshotUrl && (
                    <div className="pt-1">
                      <a
                        href={selectedRequest.paymentSubmission.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Uploaded Payment Receipt</span>
                      </a>
                    </div>
                  )}
                </div>
              ) : selectedRequest.paymentSubmission && hasValidSubmittedPayment && !isEditingPayment ? (
                /* Case B: Payment Submitted (Pending Verification or Rejected) */
                <div className="space-y-3">
                  <div
                    className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                      selectedRequest.paymentSubmission.status === "REJECTED"
                        ? "bg-rose-950/20 border-rose-500/30 text-rose-300"
                        : "bg-amber-950/20 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {selectedRequest.paymentSubmission.status === "REJECTED" ? (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    ) : (
                      <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400 animate-spin" />
                    )}
                    <div className="text-xs space-y-1">
                      <strong className="block font-bold">
                        {selectedRequest.paymentSubmission.status === "REJECTED"
                          ? "Payment Verification Required Resubmission"
                          : "Payment Details Submitted • Awaiting Specialist Verification"}
                      </strong>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {selectedRequest.paymentSubmission.status === "REJECTED"
                          ? selectedRequest.paymentSubmission.adminVerificationNotes ||
                            "Admin noted a discrepancy with your UTR or receipt. Please review and update details."
                          : "Your payment details have been queued for the administrative team. Verification typically takes 10 to 30 minutes during working hours."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Reference (RH#)</span>
                      <strong className="text-indigo-300 font-mono select-all block truncate">
                        {selectedRequest.requestNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Submitted UTR</span>
                      <strong className="text-white font-mono select-all block truncate">
                        {selectedRequest.paymentSubmission.transactionId}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Amount</span>
                      <strong className="text-emerald-400 font-bold block">
                        {formatCurrencyAmount(
                          selectedRequest.paymentSubmission.amountPaid,
                          selectedRequest.paymentSubmission.currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Submitted On</span>
                      <span className="text-slate-300 block text-[11px]">
                        {new Date(selectedRequest.paymentSubmission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {selectedRequest.paymentSubmission.screenshotUrl && (
                    <div>
                      <a
                        href={selectedRequest.paymentSubmission.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Submitted Receipt</span>
                      </a>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsEditingPayment(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Update / Resubmit Payment Info</span>
                  </button>
                </div>
              ) : (
                /* Case C: Interactive Payment Submission Form (With pre-filled RH Number) */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!paymentTxnId.trim()) {
                      alert("Please enter the UPI Transaction ID / UTR Number.");
                      return;
                    }
                    paymentMutation.mutate({
                      id: selectedRequest._id,
                      payload: {
                        transactionId: paymentTxnId.trim(),
                        amountPaid: paymentAmount !== "" ? Number(paymentAmount) : undefined,
                        currency: selectedRequest.quotation?.currency || "INR",
                        payerName: paymentPayerName.trim() || undefined,
                        payerUpiId: paymentPayerUpi.trim() || undefined,
                        screenshotUrl: paymentScreenshotUrl || undefined,
                        notes: paymentNotes.trim() || undefined,
                        referralCode: referralCode.trim() || undefined,
                      },
                    });
                  }}
                  className="space-y-3.5"
                >
                  <p className="text-xs text-slate-400">
                    After scanning the QR code and completing payment, submit your transaction reference number (UTR) below. The admin will verify this against the bank statement.
                  </p>

                  {paymentFeedback && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                        paymentFeedback.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}
                    >
                      {paymentFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0" />
                      )}
                      <span>{paymentFeedback.text}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Pre-filled Reference Number (Read-only) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Request Reference (RH#)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={selectedRequest.requestNumber}
                        className="w-full p-2.5 rounded-xl glass-input text-xs font-mono font-bold text-indigo-300 bg-slate-950/80 border border-slate-700 cursor-not-allowed"
                      />
                    </div>

                    {/* Transaction ID / UTR Number (Required) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        UPI Transaction ID / 12-Digit UTR <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 429182390192 or UPI Ref No."
                        value={paymentTxnId}
                        onChange={(e) => setPaymentTxnId(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs font-mono text-white border-indigo-500/40 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-violet-500/30 bg-violet-500/5 space-y-2">
                    <label className="block text-[11px] font-semibold text-slate-300">
                      Referral Code (Optional)
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="e.g. SHAHBAZ01"
                        value={referralCode}
                        onChange={(e) => {
                          setReferralCode(e.target.value.toUpperCase());
                          setReferralValidationError("");
                        }}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyReferral}
                        className="px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-semibold whitespace-nowrap"
                      >
                        Apply Discount
                      </button>
                    </div>
                    {referralValidationError && (
                      <p className="text-[11px] text-rose-300">{referralValidationError}</p>
                    )}
                    {referralPreview && (
                      <p className="text-[11px] text-emerald-300">
                        {referralPreview.referrerName} discount is active: {formatCurrencyAmount(referralPreview.discountAmount, selectedRequest.quotation?.currency || "INR")} off.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Amount Paid */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Amount Paid ({selectedRequest.quotation?.currency || "INR"})
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 15000"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>

                    {/* Payer Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Payer / Bank Account Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Dr. Aryan Sharma"
                        value={paymentPayerName}
                        onChange={(e) => setPaymentPayerName(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>

                    {/* Payer UPI ID */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Your UPI ID / VPA (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. aryan@okaxis"
                        value={paymentPayerUpi}
                        onChange={(e) => setPaymentPayerUpi(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    {/* Payment Screenshot Upload */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Payment Screenshot / Receipt (Optional)
                      </label>
                      <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 cursor-pointer transition-colors text-center">
                        <Upload className="w-4 h-4 text-indigo-400 mb-1" />
                        <span className="text-xs font-semibold text-slate-200">
                          {isUploadingScreenshot
                            ? "Uploading Receipt..."
                            : paymentScreenshotUrl
                            ? "Change Payment Receipt"
                            : "Attach UPI Screenshot"}
                        </span>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleScreenshotUpload}
                          disabled={isUploadingScreenshot}
                          className="hidden"
                        />
                      </label>

                      {paymentScreenshotUrl && (
                        <div className="flex items-center gap-2 pt-1 text-xs">
                          <a
                            href={paymentScreenshotUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Preview Receipt</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => setPaymentScreenshotUrl("")}
                            className="text-rose-400 hover:text-rose-300 ml-auto"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Remarks / Notes */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Remarks / Transfer Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Paid from HDFC account via Google Pay"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={paymentMutation.isPending || isUploadingScreenshot}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{paymentMutation.isPending ? "Submitting..." : "Submit Payment for Verification"}</span>
                    </button>

                    {isEditingPayment && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPayment(false)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 3. FINAL COMPLETED RESEARCH DELIVERABLES (PDF DOWNLOAD & DOI LINK)        */}
            {/* ========================================================================= */}
            {(selectedRequest.finalDeliverable?.fileUrl || selectedRequest.finalDeliverable?.doiUrl) && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-indigo-950/40 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      <span>Completed Research Paper & Publication Assets</span>
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Your finalized deliverables have been certified and released by the research directorate.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold self-start sm:self-auto">
                    🎉 Research Complete
                  </span>
                </div>

                {selectedRequest.finalDeliverable.notes && (
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-xs text-emerald-200 leading-relaxed">
                    <strong className="text-white">Directorate Remarks:</strong> {selectedRequest.finalDeliverable.notes}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Download Manuscript PDF */}
                  {selectedRequest.finalDeliverable.fileUrl && (
                    <a
                      href={selectedRequest.finalDeliverable.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={selectedRequest.finalDeliverable.fileName || "Completed_Research_Manuscript.pdf"}
                      className="p-4 rounded-2xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/40 text-white flex items-center justify-between group transition-all shadow-md shadow-indigo-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform shrink-0">
                          <Download className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">Download Final Manuscript (PDF)</p>
                          <p className="text-[10px] text-indigo-300 truncate max-w-[170px]">
                            {selectedRequest.finalDeliverable.fileName || "Manuscript_Final.pdf"}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 ml-2 shadow-sm">
                        Download
                      </span>
                    </a>
                  )}

                  {/* Official Publication DOI Link */}
                  {selectedRequest.finalDeliverable.doiUrl && (
                    <a
                      href={selectedRequest.finalDeliverable.doiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-4 rounded-2xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-white flex items-center justify-between group transition-all shadow-md shadow-emerald-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform shrink-0">
                          <ExternalLink className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white">Official Publication DOI</p>
                          <p className="text-[10px] text-emerald-300 truncate max-w-[170px] font-mono">
                            {selectedRequest.finalDeliverable.doiUrl}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 ml-2 shadow-sm flex items-center gap-1">
                        <span>Open DOI</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Respond Box if WAITING_FOR_CUSTOMER */}
            {(selectedRequest.status === "WAITING_FOR_CUSTOMER" || (selectedRequest.status as any) === "NEEDS_INFORMATION") && (
              <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <AlertCircle className="w-4 h-4" />
                  <span>Action Needed: Specialist requested more information</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Type your response or additional research details here..."
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
                <button
                  onClick={() =>
                    respondMutation.mutate({ id: selectedRequest._id, message: responseMessage })
                  }
                  disabled={!responseMessage.trim() || respondMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Response to Specialist</span>
                </button>
              </div>
            )}

            {/* Actions Bar */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <WhatsAppButton
                requestNumber={selectedRequest.requestNumber}
                serviceName={
                  typeof selectedRequest.serviceId === "object"
                    ? selectedRequest.serviceId?.name
                    : "Academic Service"
                }
                size="sm"
                label="Discuss on WhatsApp"
              />

              {/* Cancel Request if still eligible */}
              {selectedRequest.status !== "COMPLETED" && selectedRequest.status !== "CANCELLED" && (
                <button
                  type="button"
                  onClick={handleOpenCancelConfirmation}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Request</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOUBLE-CONFIRMATION MODAL WITH SECURITY VERIFICATION CODE                 */}
      {/* ========================================================================= */}
      {isCancelModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-3xl border border-rose-500/40 p-6 space-y-5 shadow-2xl bg-slate-950/95 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Request Cancellation</h3>
                <p className="text-xs text-rose-300 font-mono">
                  Request #{selectedRequest.requestNumber}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/20 text-xs text-slate-300 leading-relaxed space-y-1.5">
              <p className="font-semibold text-rose-200">
                Are you sure you want to cancel this research request?
              </p>
              <p className="text-[11px] text-slate-400">
                To prevent accidental cancellation, please type the confirmation security code shown below:
              </p>
            </div>

            {/* Security Code Display */}
            <div className="space-y-2">
              <label className="block text-[11px] uppercase tracking-wider font-bold text-slate-400 text-center">
                Security Confirmation Code
              </label>
              <div className="flex items-center justify-center">
                <span className="font-mono text-2xl font-black text-rose-300 bg-rose-950/70 border border-rose-500/50 px-6 py-2 rounded-2xl tracking-[0.3em] shadow-inner select-all">
                  {cancelSecurityCode}
                </span>
              </div>
            </div>

            {/* Code Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Type the exact code above to confirm:
              </label>
              <input
                type="text"
                autoFocus
                maxLength={6}
                placeholder={`Type ${cancelSecurityCode} to enable`}
                value={typedCancelCode}
                onChange={(e) => setTypedCancelCode(e.target.value.trim())}
                className={`w-full p-3 rounded-xl text-center font-mono text-lg font-bold tracking-widest text-white glass-input border transition-all ${
                  typedCancelCode === cancelSecurityCode
                    ? "border-emerald-500 bg-emerald-950/20 text-emerald-300"
                    : typedCancelCode.length > 0
                    ? "border-rose-500/50 bg-rose-950/10"
                    : "border-slate-700"
                }`}
              />
              {typedCancelCode.length > 0 && typedCancelCode !== cancelSecurityCode && (
                <p className="text-[11px] text-rose-400 text-center">
                  Code does not match. Please enter the exact code shown above.
                </p>
              )}
              {typedCancelCode === cancelSecurityCode && (
                <p className="text-[11px] text-emerald-400 text-center flex items-center justify-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Code verified! Click the button below to confirm cancellation.</span>
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setTypedCancelCode("");
                }}
                disabled={cancelMutation.isPending}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Keep Request
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typedCancelCode === cancelSecurityCode) {
                    cancelMutation.mutate(selectedRequest._id);
                  }
                }}
                disabled={typedCancelCode !== cancelSecurityCode || cancelMutation.isPending}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg ${
                  typedCancelCode === cancelSecurityCode
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 cursor-pointer"
                    : "bg-rose-900/30 text-rose-300/40 border border-rose-800/30 cursor-not-allowed"
                }`}
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{cancelMutation.isPending ? "Cancelling..." : "Confirm & Cancel Request"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
