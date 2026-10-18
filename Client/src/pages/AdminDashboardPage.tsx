import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  FileText,
  Layers,
  Building2,
  Tag,
  Users,
  Settings,
  HelpCircle,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  RefreshCw,
  Key,
  Gift,
  Lock,
  BookOpen,
  GraduationCap,
  Paperclip,
  ExternalLink,
  QrCode,
  Upload,
  Download,
  FileCheck,
  DollarSign,
  CreditCard,
  Check,
  XCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminOverview,
  getAdminRequests,
  updateAdminRequestStatus,
  updateAdminRequest,
  deleteAdminRequest,
  getAdminServices,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAdminDomains,
  createAdminDomain,
  updateAdminDomain,
  deleteAdminDomain,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminUsers,
  updateAdminUserStatus,
  updateAdminUserRole,
  resetAdminUserPassword,
  getAdminSettings,
  updateAdminSettings,
  getAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  uploadAsset,
  getAdminReferralCodes,
  createAdminReferralCode,
  updateAdminReferralCode,
  deleteAdminReferralCode,
} from "../api";
import { useAuth } from "../context/AuthContext";
import { StatusBadge } from "../components/common/StatusBadge";
import { Service, ServiceRequest, User as UserType, ReferralCode, formatServicePrice, formatCurrencyAmount } from "../api/types";

interface AdminDashboardPageProps {
  navigate: (route: string, params?: any) => void;
  initialTab?: string;
}

const VALID_ADMIN_TABS = [
  "overview",
  "requests",
  "services",
  "domains",
  "categories",
  "users",
  "referrals",
  "settings",
  "faqs",
] as const;

type AdminSection = typeof VALID_ADMIN_TABS[number];

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate, initialTab }) => {
  const { user, isStaff, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Active section initialized from initialTab or sessionStorage or fallback to overview
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    if (initialTab && (VALID_ADMIN_TABS as readonly string[]).includes(initialTab)) {
      return initialTab as AdminSection;
    }
    try {
      const saved = sessionStorage.getItem("admin_active_tab");
      if (saved && (VALID_ADMIN_TABS as readonly string[]).includes(saved)) {
        return saved as AdminSection;
      }
    } catch {}
    return "overview";
  });

  // Sync when initialTab prop updates
  useEffect(() => {
    if (initialTab && (VALID_ADMIN_TABS as readonly string[]).includes(initialTab) && initialTab !== activeSection) {
      setActiveSection(initialTab as AdminSection);
      try {
        sessionStorage.setItem("admin_active_tab", initialTab);
      } catch {}
    }
  }, [initialTab]);

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    try {
      sessionStorage.setItem("admin_active_tab", section);
      const targetHash = `#/admin?tab=${section}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }
    } catch {}
  };

  // Notifications / feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );
  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // -------------------------------------------------------------------------
  // 1. OVERVIEW QUERIES
  // -------------------------------------------------------------------------
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: getAdminOverview,
    enabled: isStaff,
  });

  const { data: adminReferralCodes = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: getAdminReferralCodes,
    enabled: isStaff && activeSection === "referrals",
  });

  const [referralForm, setReferralForm] = useState({
    referrerName: "",
    code: "",
    discountAmount: "",
    notes: "",
    isActive: true,
  });
  const [editingReferralId, setEditingReferralId] = useState<string | null>(null);

  const liveActivity = useMemo(() => {
    const signupTrend = overview?.activity?.signupTrend || [];
    const requestTrend = overview?.activity?.requestTrend || [];
    const peakSignupCount = Math.max(...signupTrend.map((item: any) => Number(item.value || 0)), 1);
    const peakRequestCount = Math.max(...requestTrend.map((item: any) => Number(item.value || 0)), 1);

    const signupPoints = signupTrend
      .map((point: any, index: number) => {
        const x = 18 + index * 35;
        const y = 110 - (Number(point.value || 0) / peakSignupCount) * 70;
        return `${x},${y}`;
      })
      .join(" ");

    const requestPoints = requestTrend
      .map((point: any, index: number) => {
        const x = 18 + index * 35;
        const y = 110 - (Number(point.value || 0) / peakRequestCount) * 70;
        return `${x},${y}`;
      })
      .join(" ");

    return {
      todayUsers: overview?.activity?.todayUsers || 0,
      todayRequests: overview?.activity?.todayRequests || 0,
      signupsLast7Days: overview?.activity?.signupsLast7Days || 0,
      requestsLast7Days: overview?.activity?.requestsLast7Days || 0,
      signupTrend,
      requestTrend,
      peakSignupCount,
      peakRequestCount,
      signupPoints,
      requestPoints,
    };
  }, [overview]);

  // -------------------------------------------------------------------------
  // 2. REQUESTS TAB STATE & QUERIES
  // -------------------------------------------------------------------------
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");
  const [requestSearch, setRequestSearch] = useState("");
  const [selectedReqForModal, setSelectedReqForModal] = useState<ServiceRequest | null>(null);
  const [newStatus, setNewStatus] = useState("");

  const getRequestDisplayStatus = (request: ServiceRequest) => {
    const hasSubmittedPayment = Boolean(
      request.paymentSubmission?.transactionId?.trim() &&
      Number(request.paymentSubmission?.amountPaid || 0) > 0
    );

    return request.paymentSubmission?.status === "PENDING_VERIFICATION" && hasSubmittedPayment
      ? "UNDER_REVIEW"
      : request.status;
  };
  const [adminNotesText, setAdminNotesText] = useState("");
  const [quotationAmount, setQuotationAmount] = useState<number | string>("");
  const [quotationCurrency, setQuotationCurrency] = useState("INR");

  // Payment QR states
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrUpiId, setQrUpiId] = useState("");
  const [qrUploading, setQrUploading] = useState(false);

  // Deliverable (Research PDF + DOI Link) states
  const [deliverableFileUrl, setDeliverableFileUrl] = useState("");
  const [deliverableFileName, setDeliverableFileName] = useState("");
  const [doiUrl, setDoiUrl] = useState("");
  const [deliverableNotes, setDeliverableNotes] = useState("");
  const [deliverableUploading, setDeliverableUploading] = useState(false);

  // Upload handlers
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setQrUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await uploadAsset({
            filename: file.name,
            base64Data,
            folder: "qrcodes",
          });
          setQrCodeUrl(res.url);
          showFeedback("success", "QR Code image uploaded successfully!");
        } catch (err: any) {
          showFeedback("error", err?.message || "Failed to upload QR image");
        } finally {
          setQrUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setQrUploading(false);
    }
  };

  const handleDeliverableUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setDeliverableUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await uploadAsset({
            filename: file.name,
            base64Data,
            folder: "deliverables",
          });
          setDeliverableFileUrl(res.url);
          setDeliverableFileName(file.name);
          showFeedback("success", "Research Paper PDF uploaded successfully!");
        } catch (err: any) {
          showFeedback("error", err?.message || "Failed to upload deliverable PDF");
        } finally {
          setDeliverableUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setDeliverableUploading(false);
    }
  };

  const { data: adminRequestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ["admin-requests", requestStatusFilter, requestSearch],
    queryFn: () =>
      getAdminRequests({
        status: requestStatusFilter === "all" ? undefined : requestStatusFilter,
        search: requestSearch.trim() || undefined,
        limit: 50,
      }),
    enabled: isStaff && activeSection === "requests",
  });
  const adminRequests = adminRequestsData?.data || [];

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any; closeModal?: boolean }) =>
      updateAdminRequest(id, payload),
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      if (variables?.closeModal) {
        setSelectedReqForModal(null);
      } else {
        setSelectedReqForModal(updated);
      }
      showFeedback("success", "Request details updated successfully!");
    },
    onError: (err: any) => {
      showFeedback("error", err.response?.data?.message || "Failed to update request.");
    },
  });

  const deleteRequestMutation = useMutation({
    mutationFn: (id: string) => deleteAdminRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      setSelectedReqForModal(null);
      showFeedback("success", "Request deleted successfully.");
    },
  });

  const saveReferralMutation = useMutation({
    mutationFn: (payload: any) =>
      editingReferralId
        ? updateAdminReferralCode(editingReferralId, payload)
        : createAdminReferralCode(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      setEditingReferralId(null);
      setReferralForm({
        referrerName: "",
        code: "",
        discountAmount: "",
        notes: "",
        isActive: true,
      });
      showFeedback("success", "Referral code saved successfully.");
    },
    onError: (err: any) => {
      showFeedback("error", err.response?.data?.message || "Failed to save referral code.");
    },
  });

  const deleteReferralMutation = useMutation({
    mutationFn: (id: string) => deleteAdminReferralCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      showFeedback("success", "Referral code removed.");
    },
  });

  // -------------------------------------------------------------------------
  // 3. SERVICES TAB STATE & QUERIES
  // -------------------------------------------------------------------------
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    pricingModel: "CUSTOM_QUOTE" as any,
    currency: "INR",
    priceAmount: 0,
    priceRangeMin: 1000,
    priceRangeMax: 5000,
    turnaroundTime: "7–14 Business Days",
    deliverables: "" as string, // newline delimited
    idealFor: "" as string,
    isFeatured: false,
    isActive: true,
  });

  const { data: adminServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["admin-services"],
    queryFn: getAdminServices,
    enabled: isStaff && activeSection === "services",
  });

  const saveServiceMutation = useMutation({
    mutationFn: (payload: any) =>
      editingService
        ? updateAdminService(editingService._id, payload)
        : createAdminService(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      queryClient.invalidateQueries({ queryKey: ["public-services"] });
      setServiceModalOpen(false);
      showFeedback("success", "Service saved successfully!");
    },
    onError: (err: any) => {
      showFeedback("error", err.response?.data?.message || "Failed to save service.");
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: string) => deleteAdminService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-services"] });
      showFeedback("success", "Service removed.");
    },
  });

  const openServiceForm = (s?: Service) => {
    if (s) {
      setEditingService(s);
      setServiceForm({
        name: s.name,
        slug: s.slug,
        shortDescription: s.shortDescription || "",
        description: s.description || "",
        pricingModel: s.pricingModel || "CUSTOM_QUOTE",
        currency: s.currency || s.priceRange?.currency || "INR",
        priceAmount: s.priceAmount || 0,
        priceRangeMin: s.priceRange?.min != null ? s.priceRange.min : 1000,
        priceRangeMax: s.priceRange?.max != null ? s.priceRange.max : 5000,
        turnaroundTime: s.turnaroundTime || "7–14 Business Days",
        deliverables: s.deliverables ? s.deliverables.join("\n") : "",
        idealFor: s.idealFor ? s.idealFor.join(", ") : "",
        isFeatured: Boolean(s.isFeatured),
        isActive: Boolean(s.isActive),
      });
    } else {
      setEditingService(null);
      setServiceForm({
        name: "",
        slug: "",
        shortDescription: "",
        description: "",
        pricingModel: "CUSTOM_QUOTE",
        currency: "INR",
        priceAmount: 0,
        priceRangeMin: 1000,
        priceRangeMax: 5000,
        turnaroundTime: "7–14 Business Days",
        deliverables: "Comprehensive Manuscript\nSimilarity Report\nJournal Formatting",
        idealFor: "Ph.D. Scholars, Postgraduates",
        isFeatured: false,
        isActive: true,
      });
    }
    setServiceModalOpen(true);
  };

  // -------------------------------------------------------------------------
  // 4. DOMAINS TAB
  // -------------------------------------------------------------------------
  const { data: adminDomains = [] } = useQuery({
    queryKey: ["admin-domains"],
    queryFn: getAdminDomains,
    enabled: isStaff && activeSection === "domains",
  });
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<any | null>(null);
  const [domainName, setDomainName] = useState("");
  const [domainSlug, setDomainSlug] = useState("");
  const [domainDesc, setDomainDesc] = useState("");

  const saveDomainMutation = useMutation({
    mutationFn: (payload: any) =>
      editingDomain
        ? updateAdminDomain(editingDomain._id, payload)
        : createAdminDomain(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
      setDomainModalOpen(false);
      showFeedback("success", "Discipline updated!");
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: (id: string) => deleteAdminDomain(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-domains"] });
      showFeedback("success", "Discipline deleted.");
    },
  });

  // -------------------------------------------------------------------------
  // 5. CATEGORIES TAB
  // -------------------------------------------------------------------------
  const { data: adminCategories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: getAdminCategories,
    enabled: isStaff && activeSection === "categories",
  });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catDesc, setCatDesc] = useState("");

  const saveCategoryMutation = useMutation({
    mutationFn: (payload: any) =>
      editingCategory
        ? updateAdminCategory(editingCategory._id, payload)
        : createAdminCategory(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setCategoryModalOpen(false);
      showFeedback("success", "Category saved!");
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      showFeedback("success", "Category deleted.");
    },
  });

  // -------------------------------------------------------------------------
  // 6. USERS TAB
  // -------------------------------------------------------------------------
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [resetPasswordUser, setResetPasswordUser] = useState<UserType | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const { data: adminUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", userSearch, userRoleFilter, userStatusFilter],
    queryFn: () =>
      getAdminUsers({
        search: userSearch.trim() || undefined,
        role: userRoleFilter !== "all" ? userRoleFilter : undefined,
        status: userStatusFilter !== "all" ? userStatusFilter : undefined,
        limit: 100,
      }),
    enabled: isStaff && activeSection === "users",
  });
  const adminUsers = adminUsersData?.data || [];

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAdminUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      showFeedback("success", "User status changed!");
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      updateAdminUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      showFeedback("success", "User role changed!");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetAdminUserPassword(id, newPassword),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setResetPasswordUser(null);
      setNewPasswordInput("");
      showFeedback("success", `Password reset successfully for ${data.email}!`);
    },
    onError: (err: any) => {
      showFeedback("error", err.response?.data?.message || "Failed to reset password");
    },
  });

  // -------------------------------------------------------------------------
  // 7. SETTINGS & WHATSAPP TAB
  // -------------------------------------------------------------------------
  const { data: adminSettings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: getAdminSettings,
    enabled: isStaff && activeSection === "settings",
  });
  const [settingsForm, setSettingsForm] = useState({
    platformName: "",
    tagline: "",
    whatsappNumber: "",
    whatsappDefaultMessageTemplate: "",
    supportEmail: "",
    supportPhone: "",
    businessHours: "",
    disclaimer: "",
  });

  React.useEffect(() => {
    if (adminSettings) {
      setSettingsForm({
        platformName: adminSettings.platformName || "",
        tagline: adminSettings.tagline || "",
        whatsappNumber: adminSettings.whatsappNumber || "",
        whatsappDefaultMessageTemplate: adminSettings.whatsappDefaultMessageTemplate || "",
        supportEmail: adminSettings.supportEmail || "",
        supportPhone: adminSettings.supportPhone || "",
        businessHours: adminSettings.businessHours || "",
        disclaimer: adminSettings.disclaimer || "",
      });
    }
  }, [adminSettings]);

  const saveSettingsMutation = useMutation({
    mutationFn: (payload: any) => updateAdminSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      showFeedback("success", "Website settings & WhatsApp saved!");
    },
  });

  // -------------------------------------------------------------------------
  // 8. CMS FAQS TAB
  // -------------------------------------------------------------------------
  const { data: adminFaqs = [] } = useQuery({
    queryKey: ["admin-faqs"],
    queryFn: getAdminFaqs,
    enabled: isStaff && activeSection === "faqs",
  });
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("General");

  const saveFaqMutation = useMutation({
    mutationFn: (payload: any) =>
      editingFaq ? updateAdminFaq(editingFaq._id, payload) : createAdminFaq(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      queryClient.invalidateQueries({ queryKey: ["public-faqs"] });
      setFaqModalOpen(false);
      showFeedback("success", "FAQ entry updated!");
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => deleteAdminFaq(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-faqs"] });
      showFeedback("success", "FAQ deleted.");
    },
  });

  if (!isStaff) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-xs text-slate-400">
          You must be an administrator or team member to access the Research Hub Admin Panel.
        </p>
        <button
          onClick={() => navigate("home")}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Platform
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-10 space-y-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              ADMIN CONTROL CENTER
            </span>
            <span className="text-xs text-slate-400">v2.0.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            Research Hub Operations
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh All Realtime Data"
          >
            <RefreshCw className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Sidebar + Active Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Sidebar Nav — horizontal scrollable on mobile, vertical on lg+ */}
        <nav className="glass-panel p-2 lg:p-3 rounded-2xl border-slate-800 flex lg:flex-col lg:space-y-1 overflow-x-auto lg:overflow-x-visible gap-1 lg:gap-0 pb-2 lg:pb-3">
          {[
            { id: "overview", label: "Dashboard", icon: LayoutDashboard },
            { id: "requests", label: "Requests", icon: FileText },
            { id: "services", label: "Services", icon: Layers },
            { id: "domains", label: "Domains", icon: Building2 },
            { id: "categories", label: "Categories", icon: Tag },
            { id: "users", label: "Users", icon: Users },
            { id: "referrals", label: "Referrals", icon: Gift },
            { id: "settings", label: "Settings", icon: Settings },
            { id: "faqs", label: "FAQs", icon: HelpCircle },
          ].map((item) => {
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id as any)}
                className={`shrink-0 lg:w-full flex items-center gap-2 lg:gap-3 px-3 lg:px-3.5 py-2 lg:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-900"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Section View */}
        <main className="lg:col-span-4 space-y-6 min-w-0">
          {/* =================================================================== */}
          {/* 1. OVERVIEW SECTION                                                 */}
          {/* =================================================================== */}
          {activeSection === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-slate-400">Total Requests</p>
                  <p className="text-3xl font-black text-white mt-1">
                    {overview?.metrics?.totalRequests || 0}
                  </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-sky-400">New Submissions</p>
                  <p className="text-3xl font-black text-sky-300 mt-1">
                    {overview?.metrics?.newRequests || 0}
                  </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-amber-400">In Progress</p>
                  <p className="text-3xl font-black text-amber-300 mt-1">
                    {overview?.metrics?.inProgressRequests || 0}
                  </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-emerald-400">Completed</p>
                  <p className="text-3xl font-black text-emerald-300 mt-1">
                    {overview?.metrics?.completedRequests || 0}
                  </p>
                </div>
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400">Registered Users</span>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {overview?.metrics?.totalUsers || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400">Live Services</span>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {overview?.metrics?.totalServices || 0}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-xs text-slate-400">Research Disciplines</span>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {overview?.metrics?.totalDomains || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">LIVE DATA VIEW</h3>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Real-time metrics</span>
                </div>

                <div className="glass-panel p-5 rounded-2xl border-slate-800 overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.6fr] gap-4">
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span>Users today</span>
                          <Users className="w-3.5 h-3.5 text-sky-400" />
                        </div>
                        <p className="mt-2 text-4xl font-black text-white">{liveActivity.todayUsers}</p>
                        <p className="mt-1 text-[11px] text-slate-400">Signups from the last 24 hours</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Requests today</p>
                          <p className="mt-2 text-2xl font-black text-sky-300">{liveActivity.todayRequests}</p>
                          <p className="mt-1 text-[10px] text-slate-500">New submissions</p>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">7-day total</p>
                          <p className="mt-2 text-2xl font-black text-violet-300">{liveActivity.signupsLast7Days}</p>
                          <p className="mt-1 text-[10px] text-slate-500">User signups</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">User trend</p>
                            <p className="text-base font-bold text-white">Last 7 days</p>
                          </div>
                          <div className="rounded-full bg-sky-500/10 px-2 py-1 text-[10px] font-semibold text-sky-300">
                            {liveActivity.signupsLast7Days} total
                          </div>
                        </div>

                        <svg viewBox="0 0 260 120" className="w-full h-28" preserveAspectRatio="none" role="img" aria-label="User signup graph">
                          <defs>
                            <linearGradient id="userTrendFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <path d={`M 18,110 ${liveActivity.signupPoints} 242,110`} fill="url(#userTrendFill)" opacity="0.9" />
                          <polyline
                            points={liveActivity.signupPoints}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                          {liveActivity.signupTrend.map((point: any, index: number) => {
                            const x = 18 + index * 35;
                            const y = 110 - (Number(point.value || 0) / Math.max(1, liveActivity.peakSignupCount)) * 70;
                            return <circle key={point.label} cx={x} cy={y} r="3.5" fill="#bae6fd" />;
                          })}
                        </svg>

                        <div className="mt-3 grid grid-cols-7 gap-2 text-center">
                          {liveActivity.signupTrend.map((point: any) => (
                            <div key={point.label} className="text-[10px] text-slate-400">
                              <div className="font-semibold text-slate-300">{point.value}</div>
                              <div>{point.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Requests trend</p>
                            <p className="text-base font-bold text-white">Last 7 days</p>
                          </div>
                          <div className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                            {liveActivity.requestsLast7Days} total
                          </div>
                        </div>

                        <svg viewBox="0 0 260 120" className="w-full h-28" preserveAspectRatio="none" role="img" aria-label="Request trend graph">
                          <defs>
                            <linearGradient id="requestTrendFill" x1="0" x2="0" y1="0" y2="1">
                              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          <path d={`M 18,110 ${liveActivity.requestPoints} 242,110`} fill="url(#requestTrendFill)" opacity="0.9" />
                          <polyline
                            points={liveActivity.requestPoints}
                            fill="none"
                            stroke="#a78bfa"
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />
                          {liveActivity.requestTrend.map((point: any, index: number) => {
                            const x = 18 + index * 35;
                            const y = 110 - (Number(point.value || 0) / Math.max(1, liveActivity.peakRequestCount)) * 70;
                            return <circle key={point.label} cx={x} cy={y} r="3.5" fill="#ddd6fe" />;
                          })}
                        </svg>

                        <div className="mt-3 grid grid-cols-7 gap-2 text-center">
                          {liveActivity.requestTrend.map((point: any) => (
                            <div key={point.label} className="text-[10px] text-slate-400">
                              <div className="font-semibold text-slate-300">{point.value}</div>
                              <div>{point.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Requests Table */}
              <div className="glass-panel p-6 rounded-2xl border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Recent Submissions</h3>
                  <button
                    onClick={() => handleSectionChange("requests")}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    View All Requests →
                  </button>
                </div>

                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full min-w-[480px] text-left text-xs">
                    <thead className="text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="pb-3 font-semibold">Request #</th>
                        <th className="pb-3 font-semibold">Customer</th>
                        <th className="pb-3 font-semibold">Service</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {overview?.recentRequests?.map((req: any) => (
                        <tr key={req._id} className="hover:bg-slate-900/40">
                          <td className="py-3 font-mono font-bold text-indigo-300">
                            {req.requestNumber}
                          </td>
                          <td className="py-3">
                            <span className="text-white font-medium">{req.customer?.name}</span>
                            <span className="block text-[11px] text-slate-500">
                              {req.customer?.email}
                            </span>
                          </td>
                          <td className="py-3 text-white">
                            {req.serviceId?.name || "Academic Service"}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={getRequestDisplayStatus(req)} size="sm" />
                          </td>
                          <td className="py-3 text-right text-slate-400">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 2. REQUESTS TAB                                                     */}
          {/* =================================================================== */}
          {activeSection === "requests" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 glass-panel rounded-2xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search requests by number, customer email, or topic..."
                    value={requestSearch}
                    onChange={(e) => setRequestSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  {["all", "NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "COMPLETED", "CANCELLED"].map(
                    (st) => (
                      <button
                        key={st}
                        onClick={() => setRequestStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                          requestStatusFilter === st
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {st === "all" ? "All" : st.replace(/_/g, " ")}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-3.5 font-semibold">Reference #</th>
                        <th className="p-3.5 font-semibold">Customer</th>
                        <th className="p-3.5 font-semibold">Service</th>
                        <th className="p-3.5 font-semibold">Status</th>
                        <th className="p-3.5 font-semibold">WhatsApp</th>
                        <th className="p-3.5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-300">
                      {adminRequests.map((req) => {
                        const serviceName =
                          typeof req.serviceId === "object"
                            ? req.serviceId?.name
                            : "Academic Service";

                        const customerWa =
                          req.customer?.whatsapp || req.customer?.phone || "";

                        return (
                          <tr key={req._id} className="hover:bg-slate-900/50">
                            <td className="p-3.5 font-mono font-bold text-indigo-300 select-all">
                              {req.requestNumber}
                            </td>
                            <td className="p-3.5">
                              <span className="font-semibold text-white block">
                                {req.customer?.name}
                              </span>
                              <span className="text-[11px] text-slate-500 block select-all">
                                {req.customer?.email}
                              </span>
                            </td>
                            <td className="p-3.5 max-w-sm">
                              <span className="font-semibold text-white block">
                                {serviceName}
                              </span>
                              {(req.requirements?.research_topic ||
                                req.requirements?.topic ||
                                req.requirements?.title ||
                                req.requirements?.working_title ||
                                req.requirements?.paper_title ||
                                req.additionalMessage) ? (
                                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-medium max-w-full">
                                  <span className="shrink-0 font-bold text-indigo-400">📌 Topic:</span>
                                  <span
                                    className="truncate text-white font-semibold"
                                    title={String(
                                      req.requirements?.research_topic ||
                                      req.requirements?.topic ||
                                      req.requirements?.title ||
                                      req.requirements?.working_title ||
                                      req.requirements?.paper_title ||
                                      req.additionalMessage
                                    )}
                                  >
                                    {String(
                                      req.requirements?.research_topic ||
                                      req.requirements?.topic ||
                                      req.requirements?.title ||
                                      req.requirements?.working_title ||
                                      req.requirements?.paper_title ||
                                      req.additionalMessage
                                    )}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-500 italic block mt-0.5">
                                  Topic: General Consultation
                                </span>
                              )}
                              {req.academicProfile?.university && (
                                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span>🏛️ {req.academicProfile.university}</span>
                                  {req.academicProfile?.department && (
                                    <span>({req.academicProfile.department})</span>
                                  )}
                                  {req.academicProfile?.indexingRequirement && (
                                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                      {req.academicProfile.indexingRequirement}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-3.5">
                              <StatusBadge status={getRequestDisplayStatus(req)} size="sm" />
                            </td>
                            <td className="p-3.5">
                              {customerWa ? (
                                <a
                                  href={`https://wa.me/${customerWa.replace(
                                    /[^0-9]/g,
                                    ""
                                  )}?text=${encodeURIComponent(
                                    `Hello ${req.customer.name}, this is Research Hub regarding your Request #${req.requestNumber} for ${serviceName}.`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold hover:bg-emerald-600/30"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Chat Customer</span>
                                </a>
                              ) : (
                                <span className="text-slate-600 italic">None</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedReqForModal(req);
                                  setNewStatus(req.status);
                                  setAdminNotesText(req.adminNotes || "");
                                  setQuotationAmount(req.quotation?.amount ?? "");
                                  setQuotationCurrency(req.quotation?.currency || "INR");
                                  setQrCodeUrl(req.paymentQr?.url || "");
                                  setQrUpiId(req.paymentQr?.upiId || "");
                                  setDeliverableFileUrl(req.finalDeliverable?.fileUrl || "");
                                  setDeliverableFileName(req.finalDeliverable?.fileName || "");
                                  setDoiUrl(req.finalDeliverable?.doiUrl || "");
                                  setDeliverableNotes(req.finalDeliverable?.notes || "");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                              >
                                Manage
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 3. SERVICES TAB                                                     */}
          {/* =================================================================== */}
          {activeSection === "services" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Active Research Services</h3>
                <button
                  onClick={() => openServiceForm()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Service</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {adminServices.map((s) => (
                  <div
                    key={s._id}
                    className="glass-panel p-5 rounded-2xl border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {s.pricingModel}
                      </span>
                      <span className="text-xs text-slate-400">
                        {s.isFeatured && (
                          <span className="text-amber-400 font-semibold mr-2">★ Featured</span>
                        )}
                        {s.turnaroundTime}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-white">{s.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{s.shortDescription}</p>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-indigo-300">
                        {formatServicePrice(s)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openServiceForm(s)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete service "${s.name}"?`)) {
                              deleteServiceMutation.mutate(s._id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 4. DOMAINS TAB                                                      */}
          {/* =================================================================== */}
          {activeSection === "domains" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Academic Disciplines (Domains)</h3>
                <button
                  onClick={() => {
                    setEditingDomain(null);
                    setDomainName("");
                    setDomainSlug("");
                    setDomainDesc("");
                    setDomainModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Discipline</span>
                </button>
              </div>

              <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Discipline Name</th>
                      <th className="p-3 font-semibold">Slug</th>
                      <th className="p-3 font-semibold">Description</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {adminDomains.map((d) => (
                      <tr key={d._id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-white">{d.name}</td>
                        <td className="p-3 font-mono text-slate-400">{d.slug}</td>
                        <td className="p-3 text-slate-400 max-w-sm truncate">{d.description}</td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingDomain(d);
                              setDomainName(d.name);
                              setDomainSlug(d.slug);
                              setDomainDesc(d.description || "");
                              setDomainModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete discipline "${d.name}"?`)) {
                                deleteDomainMutation.mutate(d._id);
                              }
                            }}
                            className="p-1 rounded text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 5. CATEGORIES TAB                                                   */}
          {/* =================================================================== */}
          {activeSection === "categories" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Service Categories</h3>
                <button
                  onClick={() => {
                    setEditingCategory(null);
                    setCatName("");
                    setCatSlug("");
                    setCatDesc("");
                    setCategoryModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Category</span>
                </button>
              </div>

              <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 font-semibold">Category Name</th>
                      <th className="p-3 font-semibold">Slug</th>
                      <th className="p-3 font-semibold">Description</th>
                      <th className="p-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {adminCategories.map((c) => (
                      <tr key={c._id} className="hover:bg-slate-900/50">
                        <td className="p-3 font-bold text-white">{c.name}</td>
                        <td className="p-3 font-mono text-slate-400">{c.slug}</td>
                        <td className="p-3 text-slate-400 max-w-sm truncate">{c.description}</td>
                        <td className="p-3 text-right space-x-1">
                          <button
                            onClick={() => {
                              setEditingCategory(c);
                              setCatName(c.name);
                              setCatSlug(c.slug);
                              setCatDesc(c.description || "");
                              setCategoryModalOpen(true);
                            }}
                            className="p-1 rounded text-slate-400 hover:text-white"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete category "${c.name}"?`)) {
                                deleteCategoryMutation.mutate(c._id);
                              }
                            }}
                            className="p-1 rounded text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 6. USERS TAB                                                        */}
          {/* =================================================================== */}
          {activeSection === "users" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Registered User Accounts</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {adminUsers.length} Users
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Search scholars, manage administrative privileges, and reset user passwords.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search name, email, institution..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white"
                    />
                    {userSearch && (
                      <button
                        onClick={() => setUserSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="all">All Roles</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="TEAM_MEMBER">Team Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                  >
                    <option value="all">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="glass-panel rounded-2xl border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3.5 font-semibold">Name & Email</th>
                      <th className="p-3.5 font-semibold">Institution / Dept</th>
                      <th className="p-3.5 font-semibold">Role</th>
                      <th className="p-3.5 font-semibold">Status</th>
                      <th className="p-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span>Loading user accounts...</span>
                        </td>
                      </tr>
                    ) : adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No users found matching "{userSearch}".
                        </td>
                      </tr>
                    ) : (
                      adminUsers.map((u: UserType) => (
                        <tr key={u.id || u._id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="p-3.5">
                            <span className="font-semibold text-white block">
                              {u.firstName} {u.lastName}
                            </span>
                            <span className="text-[11px] text-slate-400 block font-mono">{u.email}</span>
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {u.institution || u.department || "Independent"}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === "ADMIN"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : u.role === "TEAM_MEMBER"
                                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setResetPasswordUser(u);
                                  setNewPasswordInput("");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold border border-indigo-500/20 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95"
                                title="Reset User Password"
                              >
                                <Key className="w-3.5 h-3.5" />
                                <span>Reset Password</span>
                              </button>

                              <button
                                onClick={() =>
                                  updateUserStatusMutation.mutate({
                                    id: u.id || (u._id as string),
                                    status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                  u.status === "ACTIVE"
                                    ? "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20"
                                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                                }`}
                              >
                                {u.status === "ACTIVE" ? "Suspend" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 7. REFERRALS TAB                                                     */}
          {/* =================================================================== */}
          {activeSection === "referrals" && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-violet-400" />
                  <span>Referral Program</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create discount codes for customers and track active referral offers tied to quotation payment.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-slate-400">Active Codes</p>
                  <p className="text-3xl font-black text-white mt-1">
                    {adminReferralCodes.filter((code) => code.isActive).length}
                  </p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-sky-400">Total Codes</p>
                  <p className="text-3xl font-black text-sky-300 mt-1">{adminReferralCodes.length}</p>
                </div>
                <div className="glass-panel p-5 rounded-2xl border-slate-800">
                  <p className="text-xs text-emerald-400">Discount Pool</p>
                  <p className="text-xl font-black text-emerald-300 mt-1">
                    ₹{adminReferralCodes.reduce((sum, item) => sum + Number(item.discountAmount || 0), 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_2fr] gap-6">
                <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">
                      {editingReferralId ? "Edit Referral Code" : "Create Referral Code"}
                    </h4>
                    {editingReferralId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReferralId(null);
                          setReferralForm({ referrerName: "", code: "", discountAmount: "", notes: "", isActive: true });
                        }}
                        className="text-[11px] text-slate-300 hover:text-white"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Referrer Name</label>
                      <input
                        type="text"
                        value={referralForm.referrerName}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, referrerName: e.target.value }))}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                        placeholder="e.g. Shahbaz"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Referral Code</label>
                      <input
                        type="text"
                        value={referralForm.code}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white uppercase"
                        placeholder="e.g. SHAHBAZ01"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Discount Amount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={referralForm.discountAmount}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, discountAmount: e.target.value }))}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                        placeholder="e.g. 500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Notes</label>
                      <textarea
                        rows={3}
                        value={referralForm.notes}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                        placeholder="Optional campaign notes"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={referralForm.isActive}
                        onChange={(e) => setReferralForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-slate-700 bg-slate-900"
                      />
                      Code is active
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        saveReferralMutation.mutate({
                          referrerName: referralForm.referrerName,
                          code: referralForm.code,
                          discountAmount: Number(referralForm.discountAmount) || 0,
                          notes: referralForm.notes,
                          isActive: referralForm.isActive,
                        });
                      }}
                      disabled={saveReferralMutation.isPending}
                      className="w-full px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold disabled:opacity-60"
                    >
                      {saveReferralMutation.isPending ? "Saving..." : editingReferralId ? "Update Referral" : "Create Referral"}
                    </button>
                  </div>
                </div>

                <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">Referral Code Library</h4>
                    {referralsLoading && <span className="text-[11px] text-slate-400">Loading...</span>}
                  </div>

                  <div className="space-y-3">
                    {adminReferralCodes.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
                        No referral codes created yet.
                      </div>
                    ) : (
                      adminReferralCodes.map((item: ReferralCode) => (
                        <div key={item._id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-violet-300">{item.code}</span>
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${item.isActive ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-slate-700 text-slate-300 border border-slate-600"}`}>
                                  {item.isActive ? "Active" : "Inactive"}
                                </span>
                              </div>
                              <p className="text-xs text-slate-300 mt-1">Referrer: {item.referrerName}</p>
                              <p className="text-[11px] text-slate-400 mt-1">Discount: ₹{Number(item.discountAmount || 0).toLocaleString("en-IN")}</p>
                              {item.notes && <p className="text-[11px] text-slate-400 mt-1">{item.notes}</p>}
                            </div>
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingReferralId(item._id);
                                  setReferralForm({
                                    referrerName: item.referrerName,
                                    code: item.code,
                                    discountAmount: String(item.discountAmount ?? ""),
                                    notes: item.notes || "",
                                    isActive: Boolean(item.isActive),
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-slate-800 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteReferralMutation.mutate(item._id)}
                                className="px-2 py-1 rounded-lg bg-rose-500/10 text-[10px] font-semibold text-rose-300 border border-rose-500/20 hover:bg-rose-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* 8. SETTINGS & WHATSAPP TAB                                          */}
          {/* =================================================================== */}
          {activeSection === "settings" && (
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border-slate-800 space-y-6 animate-fade-in">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">
                  Platform Settings & WhatsApp Routing
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your official WhatsApp Business number and communication parameters.
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSettingsMutation.mutate(settingsForm);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      value={settingsForm.platformName}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, platformName: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tagline
                    </label>
                    <input
                      type="text"
                      value={settingsForm.tagline}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-emerald-400 mb-1">
                      WhatsApp Business Number (digits only, e.g. 918004153053) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 918004153053"
                      value={settingsForm.whatsappNumber}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSettingsForm({
                          ...settingsForm,
                          whatsappNumber: val,
                          supportPhone: val
                            ? val.startsWith("91") && val.length === 12
                              ? `+91 ${val.slice(2)}`
                              : `+${val}`
                            : settingsForm.supportPhone,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white border-emerald-500/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Support Contact Phone (Visible in Website Footer) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 8004153053"
                      value={settingsForm.supportPhone}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, supportPhone: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settingsForm.supportEmail}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, supportEmail: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp Message Template (uses #{'{requestNumber}'} and {'{serviceName}'})
                  </label>
                  <textarea
                    rows={2}
                    value={settingsForm.whatsappDefaultMessageTemplate}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        whatsappDefaultMessageTemplate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-xl glass-input text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ethics & Publication Disclaimer
                  </label>
                  <textarea
                    rows={3}
                    value={settingsForm.disclaimer}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, disclaimer: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Platform Settings</span>
                </button>
              </form>
            </div>
          )}

          {/* =================================================================== */}
          {/* 8. CMS FAQS TAB                                                     */}
          {/* =================================================================== */}
          {activeSection === "faqs" && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Platform Frequently Asked Questions</h3>
                <button
                  onClick={() => {
                    setEditingFaq(null);
                    setFaqQuestion("");
                    setFaqAnswer("");
                    setFaqCategory("General");
                    setFaqModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add FAQ</span>
                </button>
              </div>

              <div className="space-y-3">
                {adminFaqs.map((faq) => (
                  <div
                    key={faq._id}
                    className="glass-panel p-4 rounded-xl border-slate-800 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {faq.category}
                      </span>
                      <h4 className="text-sm font-bold text-white">{faq.question}</h4>
                      <p className="text-xs text-slate-400">{faq.answer}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          setEditingFaq(faq);
                          setFaqQuestion(faq.question);
                          setFaqAnswer(faq.answer);
                          setFaqCategory(faq.category);
                          setFaqModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Delete this FAQ entry?")) {
                            deleteFaqMutation.mutate(faq._id);
                          }
                        }}
                        className="p-1 rounded text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* REQUEST MANAGEMENT MODAL                                                  */}
      {/* ========================================================================= */}
      {selectedReqForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl rounded-3xl border-slate-700 p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-indigo-300">
                    {selectedReqForModal.requestNumber}
                  </span>
                  <StatusBadge status={getRequestDisplayStatus(selectedReqForModal)} size="sm" />
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {typeof selectedReqForModal.serviceId === "object"
                    ? selectedReqForModal.serviceId?.name
                    : "Academic Research Service"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReqForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 1. Customer Contact Strip */}
            <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-slate-300">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Customer</span>
                <strong className="text-white truncate block">{selectedReqForModal.customer?.name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Email</span>
                <strong className="text-white select-all truncate block">{selectedReqForModal.customer?.email}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">WhatsApp</span>
                <strong className="text-emerald-400 select-all truncate block">{selectedReqForModal.customer?.whatsapp || "N/A"}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-semibold">Phone</span>
                <strong className="text-white select-all truncate block">{selectedReqForModal.customer?.phone || "N/A"}</strong>
              </div>
            </div>

            {/* 2. PROPOSED RESEARCH TOPIC & TITLE (HIGHLY VISIBLE) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-500/40 space-y-1.5 shadow-lg shadow-indigo-950/30">
              <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Proposed Research Topic / Working Title</span>
              </span>
              <p className="text-sm sm:text-base font-extrabold text-white leading-relaxed select-all">
                {selectedReqForModal.requirements?.topic ||
                  selectedReqForModal.requirements?.title ||
                  selectedReqForModal.requirements?.working_title ||
                  selectedReqForModal.requirements?.paper_title ||
                  selectedReqForModal.requirements?.research_topic ||
                  selectedReqForModal.academicProfile?.targetJournal ||
                  "Topic not specified by customer"}
              </p>
            </div>

            {/* 3. PROJECT DESCRIPTION & OBJECTIVES */}
            {(selectedReqForModal.additionalMessage ||
              selectedReqForModal.requirements?.description ||
              selectedReqForModal.requirements?.objectives ||
              selectedReqForModal.requirements?.abstract) && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Project Description / Objectives / Instructions</span>
                </span>
                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
                  {selectedReqForModal.additionalMessage ||
                    selectedReqForModal.requirements?.description ||
                    selectedReqForModal.requirements?.objectives ||
                    selectedReqForModal.requirements?.abstract}
                </p>
              </div>
            )}

            {/* 4. ACADEMIC PROFILE & PUBLICATION TARGETS */}
            {selectedReqForModal.academicProfile && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Academic Scope & Publication Constraints</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Level:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.academicLevel || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Discipline / Dept:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.discipline || selectedReqForModal.academicProfile.department || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">University / Institution:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.university || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Corresponding Author:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.correspondingAuthor?.name || "N/A"}</strong>
                    {selectedReqForModal.academicProfile.correspondingAuthor?.designation && (
                      <span className="text-slate-400 text-[10px] block mt-0.5">
                        {selectedReqForModal.academicProfile.correspondingAuthor.designation}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Supervisor:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.supervisor?.name || "N/A"}</strong>
                    {selectedReqForModal.academicProfile.supervisor?.designation && (
                      <span className="text-slate-400 text-[10px] block mt-0.5">
                        {selectedReqForModal.academicProfile.supervisor.designation}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Publication Type:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.publicationType || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Target Journal / Conf:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.targetJournal || selectedReqForModal.academicProfile.targetConference || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Indexing Requirement:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.indexingRequirement || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Citation Style:</span>
                    <strong className="text-white block">{selectedReqForModal.academicProfile.citationStyle || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Target Word Count:</span>
                    <strong className="text-white block">
                      {selectedReqForModal.academicProfile.wordCount
                        ? `${Number(selectedReqForModal.academicProfile.wordCount).toLocaleString()} words`
                        : "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Target Deadline:</span>
                    <strong className="text-amber-400 block">{selectedReqForModal.academicProfile.deadline || "Flexible"}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 5. DETAILED REQUIREMENT SPECIFICATIONS */}
            {selectedReqForModal.requirements && Object.keys(selectedReqForModal.requirements).length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Submitted Wizard Specifications</span>
                </span>
                <div className="space-y-2 p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
                  {Object.entries(selectedReqForModal.requirements).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex flex-col sm:flex-row sm:items-baseline gap-1.5 border-b border-slate-800/60 pb-1.5 last:border-0 last:pb-0"
                    >
                      <span className="text-slate-400 capitalize w-48 shrink-0 font-medium">
                        {key.replace(/_/g, " ")}:
                      </span>
                      <span className="text-white font-medium break-words flex-1 select-all">
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 6. UPLOADED REFERENCE DOCUMENTS */}
            {selectedReqForModal.referenceFiles && selectedReqForModal.referenceFiles.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Uploaded Reference Documents ({selectedReqForModal.referenceFiles.length})</span>
                </span>
                <div className="space-y-1.5">
                  {selectedReqForModal.referenceFiles.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-xs text-indigo-300 flex items-center justify-between group transition-colors"
                    >
                      <span className="font-medium group-hover:text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {file.name}
                      </span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <span>Open Document</span>
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* 7. STATUS & SPECIALIST CONTROLS */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Specialist Management & Status Update
              </span>

              {/* Status Transition Control */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Update Status (Lifecycle State)
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white bg-slate-900 border border-slate-700"
                >
                  <option value="NEW">NEW (Awaiting Specialist Review)</option>
                  <option value="IN_PROGRESS">IN_PROGRESS (Work / Scope Active)</option>
                  <option value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER (Need Customer Input)</option>
                  <option value="COMPLETED">COMPLETED (Milestones Finalized)</option>
                  <option value="CANCELLED">CANCELLED (Terminated)</option>
                </select>
              </div>

              {/* Specialist Notes */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Specialist / Advisory Notes (Visible to Customer in Workspace)
                </label>
                <textarea
                  rows={3}
                  placeholder="Enter updates, scope feedback, or milestone notes for the customer..."
                  value={adminNotesText}
                  onChange={(e) => setAdminNotesText(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              {/* Quotation Amount & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Quotation Amount (Reflected to Customer)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 15000"
                    value={quotationAmount}
                    onChange={(e) => setQuotationAmount(e.target.value)}
                    className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Currency
                  </label>
                  <select
                    value={quotationCurrency}
                    onChange={(e) => setQuotationCurrency(e.target.value)}
                    className="w-full p-2.5 rounded-xl glass-input text-xs text-white bg-slate-900 border border-slate-700 font-semibold"
                  >
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="EUR">€ EUR (Euro)</option>
                    <option value="GBP">£ GBP (Pound)</option>
                  </select>
                </div>
              </div>

              {/* UPI Payment QR Code (Sends to Customer) */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>UPI Payment QR Code & Virtual Payment Address</span>
                  </span>
                  {qrCodeUrl && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      QR Attached
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div className="space-y-2">
                    <label className="block text-[11px] text-slate-400 font-medium">
                      Upload QR Code Image (PNG / JPG / WEBP)
                    </label>
                    <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 cursor-pointer transition-colors text-center">
                      <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-200">
                        {qrUploading ? "Uploading QR..." : qrCodeUrl ? "Change QR Image" : "Upload UPI QR Image"}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Customer will scan this to pay</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrUpload}
                        disabled={qrUploading}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] text-slate-400 font-medium">
                      UPI ID / VPA (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 8004153053@paytm or researchhub@upi"
                      value={qrUpiId}
                      onChange={(e) => setQrUpiId(e.target.value)}
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                    />

                    {qrCodeUrl && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={qrCodeUrl}
                          alt="Payment QR"
                          className="w-16 h-16 object-contain rounded-lg border border-slate-700 bg-white p-1"
                        />
                        <button
                          type="button"
                          onClick={() => setQrCodeUrl("")}
                          className="text-xs text-rose-400 hover:text-rose-300 underline"
                        >
                          Remove QR
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Payment Verification (If Submitted by Customer) */}
              {selectedReqForModal.paymentSubmission && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-400" />
                      <span>Customer Payment Submission (Ref #{selectedReqForModal.requestNumber})</span>
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${
                        selectedReqForModal.paymentSubmission.status === "VERIFIED"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : selectedReqForModal.paymentSubmission.status === "REJECTED"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      }`}
                    >
                      {selectedReqForModal.paymentSubmission.status === "VERIFIED"
                        ? "✅ Payment Verified"
                        : selectedReqForModal.paymentSubmission.status === "REJECTED"
                        ? "❌ Payment Rejected"
                        : "⏳ Verification Pending"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">UPI UTR / Txn ID</span>
                      <strong className="text-indigo-300 font-mono select-all block truncate">
                        {selectedReqForModal.paymentSubmission.transactionId}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Amount Paid</span>
                      <strong className="text-emerald-400 font-bold block">
                        {formatCurrencyAmount(
                          selectedReqForModal.paymentSubmission.amountPaid,
                          selectedReqForModal.paymentSubmission.currency
                        )}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Payer Info</span>
                      <span className="text-slate-200 block truncate">
                        {selectedReqForModal.paymentSubmission.payerName || selectedReqForModal.customer.name}
                        {selectedReqForModal.paymentSubmission.payerUpiId && (
                          <span className="text-slate-400 block text-[10px]">
                            ({selectedReqForModal.paymentSubmission.payerUpiId})
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-semibold">Submitted At</span>
                      <span className="text-slate-400 text-[11px] block">
                        {new Date(selectedReqForModal.paymentSubmission.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {selectedReqForModal.referral && (
                    <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-emerald-200 font-semibold">
                          Referral Applied
                        </span>
                        <span className="font-mono text-emerald-300 font-bold text-[11px]">
                          {selectedReqForModal.referral.code}
                        </span>
                      </div>
                      <p className="mt-2 text-emerald-50">
                        Applied by <span className="font-semibold">{selectedReqForModal.referral.referrerName}</span>
                      </p>
                      <p className="mt-1 text-[11px] text-emerald-100/80">
                        Discount: {formatCurrencyAmount(selectedReqForModal.referral.discountAmount, selectedReqForModal.referral.currency)}
                        {' '}| Original: {formatCurrencyAmount(selectedReqForModal.referral.originalAmount, selectedReqForModal.referral.currency)}
                        {' '}→ Final payable: {formatCurrencyAmount(selectedReqForModal.referral.finalAmount, selectedReqForModal.referral.currency)}
                      </p>
                    </div>
                  )}

                  {selectedReqForModal.paymentSubmission.screenshotUrl && (
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={selectedReqForModal.paymentSubmission.screenshotUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Payment Receipt / Screenshot</span>
                      </a>
                    </div>
                  )}

                  {/* Verification action buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        updateRequestMutation.mutate({
                          id: selectedReqForModal._id,
                          payload: {
                            paymentVerificationAction: "VERIFY",
                            status: "IN_PROGRESS",
                          },
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Verify & Confirm Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateRequestMutation.mutate({
                          id: selectedReqForModal._id,
                          payload: {
                            paymentVerificationAction: "REJECT",
                          },
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject Payment</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Final Research Deliverables (PDF Upload & DOI Link) */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-indigo-400" />
                    <span>Final Research Deliverables (Complete PDF & DOI Link)</span>
                  </span>
                  {deliverableFileUrl && (
                    <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      Deliverable Ready
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  {/* PDF Upload */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-400 font-medium">
                      Upload Completed Manuscript / Research PDF
                    </label>
                    <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 cursor-pointer transition-colors text-center">
                      <Upload className="w-5 h-5 text-indigo-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                        {deliverableUploading
                          ? "Uploading PDF..."
                          : deliverableFileName || "Upload Research PDF"}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Customer will be able to download this
                      </span>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleDeliverableUpload}
                        disabled={deliverableUploading}
                        className="hidden"
                      />
                    </label>

                    {deliverableFileUrl && (
                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <a
                          href={deliverableFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="text-indigo-400 hover:text-indigo-300 underline flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Preview / Download PDF</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setDeliverableFileUrl("");
                            setDeliverableFileName("");
                          }}
                          className="text-rose-400 hover:text-rose-300 ml-auto"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* DOI Link & Notes */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-400 font-medium">
                        Official Publication DOI Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://doi.org/10.1109/xxxxxx"
                        value={doiUrl}
                        onChange={(e) => setDoiUrl(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] text-slate-400 font-medium">
                        Deliverable Advisory Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Published in Volume 12, Issue 4. Final proof checked."
                        value={deliverableNotes}
                        onChange={(e) => setDeliverableNotes(e.target.value)}
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this request permanently?")) {
                      deleteRequestMutation.mutate(selectedReqForModal._id);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setSelectedReqForModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateRequestMutation.mutate({
                      id: selectedReqForModal._id,
                      payload: {
                        status: newStatus,
                        adminNotes: adminNotesText,
                        quotation: quotationAmount !== ""
                          ? { amount: Number(quotationAmount), currency: quotationCurrency || "INR" }
                          : undefined,
                        paymentQr: qrCodeUrl
                          ? { url: qrCodeUrl, upiId: qrUpiId }
                          : undefined,
                        finalDeliverable: (deliverableFileUrl || doiUrl.trim() || deliverableNotes)
                          ? {
                              fileUrl: deliverableFileUrl,
                              fileName: deliverableFileName || "Completed_Research_Manuscript.pdf",
                              doiUrl: doiUrl.trim(),
                              notes: deliverableNotes,
                            }
                          : undefined,
                      },
                      closeModal: true,
                    });
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SERVICE EDIT/ADD MODAL                                                    */}
      {/* ========================================================================= */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-xl rounded-3xl border-slate-700 p-6 sm:p-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingService ? "Edit Service" : "Add New Research Service"}
              </h3>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slug (URL friendly) *</label>
                <input
                  type="text"
                  required
                  value={serviceForm.slug}
                  onChange={(e) => setServiceForm({ ...serviceForm, slug: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Short Description</label>
                <input
                  type="text"
                  value={serviceForm.shortDescription}
                  onChange={(e) => setServiceForm({ ...serviceForm, shortDescription: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              {/* Pricing & Currency Configuration */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Pricing & Quotation Model</span>
                  </span>
                  <span className="text-[10px] text-slate-400">INR / USD / Custom</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Pricing Model *</label>
                    <select
                      value={serviceForm.pricingModel}
                      onChange={(e) => setServiceForm({ ...serviceForm, pricingModel: e.target.value as any })}
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white bg-slate-900 border border-slate-700"
                    >
                      <option value="CUSTOM_QUOTE">Custom Quotation (Custom Quote)</option>
                      <option value="RANGE">Price Range (Min – Max)</option>
                      <option value="FIXED">Fixed Flat Rate</option>
                      <option value="CONTACT_FOR_PRICE">Contact for Price</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Currency *</label>
                    <select
                      value={serviceForm.currency}
                      onChange={(e) => setServiceForm({ ...serviceForm, currency: e.target.value })}
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white bg-slate-900 border border-slate-700 font-semibold"
                    >
                      <option value="INR">₹ INR — Indian Rupee (Default)</option>
                      <option value="USD">$ USD — US Dollar</option>
                      <option value="EUR">€ EUR — Euro</option>
                      <option value="GBP">£ GBP — British Pound</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Pricing Inputs */}
                {serviceForm.pricingModel === "RANGE" && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Minimum Price ({serviceForm.currency === "USD" ? "$" : serviceForm.currency === "EUR" ? "€" : serviceForm.currency === "GBP" ? "£" : "₹"})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={serviceForm.priceRangeMin}
                        onChange={(e) => setServiceForm({ ...serviceForm, priceRangeMin: Number(e.target.value) })}
                        placeholder="e.g. 5000"
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Maximum Price ({serviceForm.currency === "USD" ? "$" : serviceForm.currency === "EUR" ? "€" : serviceForm.currency === "GBP" ? "£" : "₹"})
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={serviceForm.priceRangeMax}
                        onChange={(e) => setServiceForm({ ...serviceForm, priceRangeMax: Number(e.target.value) })}
                        placeholder="e.g. 15000"
                        className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                      />
                    </div>
                  </div>
                )}

                {serviceForm.pricingModel === "FIXED" && (
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Fixed Price Amount ({serviceForm.currency === "USD" ? "$" : serviceForm.currency === "EUR" ? "€" : serviceForm.currency === "GBP" ? "£" : "₹"})
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={serviceForm.priceAmount}
                      onChange={(e) => setServiceForm({ ...serviceForm, priceAmount: Number(e.target.value) })}
                      placeholder="e.g. 8500"
                      className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                    />
                  </div>
                )}

                {serviceForm.pricingModel === "CUSTOM_QUOTE" && (
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] leading-relaxed">
                    ✨ <strong>Custom Quotation Active:</strong> Displayed as <em>"Custom Quotation"</em> without fixed amount. Scholars will specify scope in the wizard to receive an evaluation.
                  </div>
                )}

                {serviceForm.pricingModel === "CONTACT_FOR_PRICE" && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] leading-relaxed">
                    💬 <strong>Contact for Price Active:</strong> Displayed as <em>"Contact for Price"</em> directing researchers to contact via WhatsApp / specialist advisory.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Turnaround Time</label>
                <input
                  type="text"
                  value={serviceForm.turnaroundTime}
                  onChange={(e) => setServiceForm({ ...serviceForm, turnaroundTime: e.target.value })}
                  placeholder="e.g. 7–14 Business Days"
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Deliverables (one per line)
                </label>
                <textarea
                  rows={3}
                  value={serviceForm.deliverables}
                  onChange={(e) => setServiceForm({ ...serviceForm, deliverables: e.target.value })}
                  className="w-full p-2.5 rounded-xl glass-input text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.isFeatured}
                    onChange={(e) => setServiceForm({ ...serviceForm, isFeatured: e.target.checked })}
                  />
                  <span>Feature on Homepage</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setServiceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  saveServiceMutation.mutate({
                    ...serviceForm,
                    currency: serviceForm.currency,
                    pricingModel: serviceForm.pricingModel,
                    priceAmount: serviceForm.pricingModel === "FIXED" ? Number(serviceForm.priceAmount) : undefined,
                    priceRange: {
                      min: Number(serviceForm.priceRangeMin) || 0,
                      max: Number(serviceForm.priceRangeMax) || 0,
                      currency: serviceForm.currency,
                    },
                    deliverables: serviceForm.deliverables
                      .split("\n")
                      .map((d) => d.trim())
                      .filter(Boolean),
                    idealFor: serviceForm.idealFor
                      .split(",")
                      .map((d) => d.trim())
                      .filter(Boolean),
                  });
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOMAIN EDIT/ADD MODAL                                                     */}
      {/* ========================================================================= */}
      {domainModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md rounded-3xl border-slate-700 p-6 space-y-4 my-4">
            <h3 className="text-base font-bold text-white">
              {editingDomain ? "Edit Discipline" : "Add Discipline"}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Slug *</label>
                <input
                  type="text"
                  value={domainSlug}
                  onChange={(e) => setDomainSlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={domainDesc}
                  onChange={(e) => setDomainDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setDomainModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  saveDomainMutation.mutate({
                    name: domainName,
                    slug: domainSlug,
                    description: domainDesc,
                  })
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY EDIT/ADD MODAL                                                   */}
      {/* ========================================================================= */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md rounded-3xl border-slate-700 p-6 space-y-4 my-4">
            <h3 className="text-base font-bold text-white">
              {editingCategory ? "Edit Category" : "Add Category"}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Slug *</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setCategoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  saveCategoryMutation.mutate({
                    name: catName,
                    slug: catSlug,
                    description: catDesc,
                  })
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FAQ EDIT/ADD MODAL                                                        */}
      {/* ========================================================================= */}
      {faqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md rounded-3xl border-slate-700 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">
              {editingFaq ? "Edit FAQ" : "Add FAQ Entry"}
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Question *</label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Answer *</label>
                <textarea
                  rows={3}
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full p-2.5 rounded-xl glass-input text-white"
                />
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setFaqModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  saveFaqMutation.mutate({
                    question: faqQuestion,
                    answer: faqAnswer,
                    category: faqCategory,
                  })
                }
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
              >
                Save FAQ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL                                                      */}
      {/* ========================================================================= */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md rounded-3xl border-slate-700 p-6 space-y-5 animate-scale-up shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Reset Account Password</h3>
                  <p className="text-[11px] text-slate-400">Direct administrative credential override</p>
                </div>
              </div>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400">Target User:</div>
              <div className="text-white font-semibold text-sm">
                {resetPasswordUser.firstName} {resetPasswordUser.lastName}
              </div>
              <div className="text-slate-400 font-mono text-[11px]">{resetPasswordUser.email}</div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-300">New Password (min. 6 characters) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const randPass = "Rh#" + Math.random().toString(36).slice(-6) + "!";
                      setNewPasswordInput(randPass);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Enter new strong password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl glass-input text-white font-mono text-xs pr-8"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setResetPasswordUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                disabled={!newPasswordInput || newPasswordInput.length < 6 || resetPasswordMutation.isPending}
                onClick={() =>
                  resetPasswordMutation.mutate({
                    id: resetPasswordUser.id || (resetPasswordUser._id as string),
                    newPassword: newPasswordInput,
                  })
                }
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
              >
                {resetPasswordMutation.isPending ? "Updating..." : "Confirm & Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
